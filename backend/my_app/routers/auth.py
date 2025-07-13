# ==============================================================================
# File: backend/my_app/routers/auth.py (Fixed Router Definition)
# Description: Authentication router with Google OAuth2 support.
# ==============================================================================
import os
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, status, Depends, Response
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from starlette.config import Config
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta, datetime, timezone
import secrets
from ..dependencies import get_db, get_current_active_user, try_get_current_active_user

from .. import crud, schemas, security,models 
from ..dependencies import get_db, get_current_active_user
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from fastapi import BackgroundTasks

# Create the router - THIS MUST BE AT THE TOP
router = APIRouter(prefix="/auth", tags=["auth"])

# --- OAuth Configuration ---
# It's critical that these are set in your production environment.
# The application will not start the Google OAuth flow if these are missing.
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_OAUTH_CONFIGURED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

# Frontend URL for redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

oauth = None
if GOOGLE_OAUTH_CONFIGURED:
    config_data = {
        'GOOGLE_CLIENT_ID': GOOGLE_CLIENT_ID,
        'GOOGLE_CLIENT_SECRET': GOOGLE_CLIENT_SECRET
    }
    starlette_config = Config(environ=config_data)
    oauth = OAuth(starlette_config)
    oauth.register(
        name='google',
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
else:
    print("Warning: Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not set. Google login will be disabled.")


# --- Helper Functions ---
def set_auth_cookie(response: Response, token: str):
    """Sets a secure, HttpOnly cookie for the authentication token."""
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,  # Prevents client-side script access
        samesite="lax",  # Provides CSRF protection
        secure=True,  # Ensures cookie is sent only over HTTPS in production
        path="/",
        expires=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

def clear_auth_cookie(response: Response):
    """Clears the authentication cookie."""
    response.delete_cookie(key="access_token", path="/")


# --- Authentication Endpoints ---
@router.get("/login/google")
async def login_google(request: Request):
    """Redirects the user to Google's OAuth consent screen."""
    if not GOOGLE_OAUTH_CONFIGURED or not oauth:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on the server."
        )
    
    redirect_uri = request.url_for('auth_google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback/google", name="auth_google_callback")
async def auth_google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handles the callback from Google after user authentication.
    Creates a user if one doesn't exist, generates a JWT, sets it in a secure cookie,
    and redirects to the frontend.
    """
    if not GOOGLE_OAUTH_CONFIGURED or not oauth:
         raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on the server."
        )
    try:
        token_data = await oauth.google.authorize_access_token(request)
        user_info = token_data.get('userinfo')
        
        if not user_info or not user_info.get('email'):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not retrieve user info from Google.")

        email = user_info['email']
        user = await crud.get_user_by_email(db, email=email)

        if not user:
            # Create a new user if they don't exist
            base_username = email.split('@')[0]
            username = await crud.get_unique_username(db, base_username)
            
            user_create = schemas.UserCreate(
                username=username,
                email=email,
                password=secrets.token_urlsafe(32),  # Secure random password for OAuth users
                profile=schemas.UserProfileCreate(
                    role=schemas.UserRole.TECHNICIAN,
                    position=user_info.get('name', "OAuth User"),
                    property_ids=[]  # Empty list initially
                )
            )
            user = await crud.create_user(db=db, user=user_create)

        # Generate JWT and set it in a secure cookie
        access_token = security.create_access_token(data={"sub": user.username})
        
        # Redirect to the frontend dashboard after successful login
        response = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
        set_auth_cookie(response, access_token)
        
        return response

    except OAuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"OAuth Error: {e.error}")
    except Exception as e:
        # Log the exception for debugging
        print(f"An unexpected error occurred during Google auth callback: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred during authentication.")


@router.post("/login", response_model=schemas.Token)
async def login_with_credentials(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Login with username and password. Uses OAuth2PasswordRequestForm for security.
    """
    user = await security.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(data={"sub": user.username})
    set_auth_cookie(response, access_token)
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout():
    """Logs out the user by clearing the authentication cookie."""
    response = JSONResponse(content={"message": "Successfully logged out"})
    clear_auth_cookie(response)
    return response


# --- User and Status Endpoints ---
@router.get("/me", response_model=schemas.User)
async def get_current_user_info(current_user: models.User = Depends(get_current_active_user)):
    """Returns the information of the currently authenticated user."""
    return schemas.User.model_validate(current_user)  

@router.get("/status")
async def auth_status(current_user: Optional[schemas.User] = Depends(try_get_current_active_user)):
    if current_user:
        return {
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "profile": {
                    "role": current_user.profile.role if current_user.profile else "User",
                    "position": current_user.profile.position if current_user.profile else "No position",
                    "properties": [
                        {"id": p.id, "name": p.name} 
                        for p in (current_user.profile.properties if current_user.profile else [])
                    ]
                } if current_user.profile else None
            }
        }
    return {"authenticated": False}


@router.get("/google/status")
async def google_auth_status():
    """Checks if Google OAuth is configured on the server."""
    return {"google_oauth_configured": GOOGLE_OAUTH_CONFIGURED}


# --- Password Reset Endpoints ---
@router.post("/forgot-password")
async def forgot_password(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Initiates the password reset process. In a real app, this would send an email.
    """
    body = await request.json()
    email = body.get('email')
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required.")

    user = await crud.get_user_by_email(db, email=email)
    if user:
        # Generate a secure, short-lived password reset token
        reset_token = security.create_password_reset_token(email=email)
        
        # In a real-world application, you would send this token to the user's email.
        # For example, using a background task with a mail sending library.
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        print(f"--- PASSWORD RESET LINK (for demo purposes) ---")
        print(reset_link)
        print(f"-------------------------------------------------")
        
    # For security, always return the same message regardless of whether the user exists.
    return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession = Depends(get_db)
):
    """Resets the user's password using a valid reset token."""
    email = security.verify_password_reset_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    user = await crud.get_user_by_email(db, email=email)
    if not user:
        # This case should be rare if token generation requires a valid user, but it's a good safeguard.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Update the user's password
    await crud.update_user_password(db, user=user, new_password=new_password)
    
    return {"message": "Your password has been successfully reset."}

conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"),
    MAIL_FROM = os.getenv("MAIL_FROM"),
    MAIL_PORT = int(os.getenv("MAIL_PORT")),
    MAIL_SERVER = os.getenv("MAIL_SERVER"),
    MAIL_TLS = os.getenv("MAIL_TLS") == "True",
    MAIL_SSL = os.getenv("MAIL_SSL") == "True",
    USE_CREDENTIALS = True
)