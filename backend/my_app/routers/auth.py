# ==============================================================================
# File: backend/my_app/routers/auth.py
# Description: Authentication router with Google OAuth2 support.
# ==============================================================================
import os
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from starlette.config import Config
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
import secrets

from .. import crud, schemas, security
from ..dependencies import get_db, get_current_active_user

router = APIRouter(prefix="/auth", tags=["auth"])

# OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    print("Warning: Google OAuth credentials not found. Google authentication will not work.")
    GOOGLE_CLIENT_ID = "dummy"
    GOOGLE_CLIENT_SECRET = "dummy"

# Configure OAuth
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

@router.get("/login/google")
async def login_google(request: Request):
    """Redirect to Google OAuth login"""
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID == "dummy":
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
        )
    
    redirect_uri = request.url_for('auth_google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback/google")
async def auth_google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        # Check if user exists
        email = user_info.get('email')
        name = user_info.get('name', '')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        user = await crud.get_user_by_email(db, email=email)
        
        # Create user if doesn't exist
        if not user:
            # Generate a random password for OAuth users
            random_password = secrets.token_urlsafe(32)
            
            # Create a unique username from email
            base_username = email.split('@')[0]
            username = base_username
            
            # Check if username exists and make it unique
            existing_user = await crud.get_user_by_username(db, username=username)
            if existing_user:
                username = f"{base_username}_{secrets.token_hex(4)}"
            
            user_create = schemas.UserCreate(
                username=username,
                email=email,
                password=random_password,
                profile=schemas.UserProfileCreate(
                    role="User",
                    position=name if name else "OAuth User"
                )
            )
            
            try:
                user = await crud.create_user(db=db, user=user_create)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user: {str(e)}"
                )
        
        # Generate JWT token
        access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": user.username}, 
            expires_delta=access_token_expires
        )
        
        # Store token in session for web clients
        if hasattr(request, 'session'):
            request.session['access_token'] = access_token
            request.session['user_id'] = user.id
            request.session['username'] = user.username
        
        return JSONResponse({
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "profile": {
                    "id": user.profile.id if user.profile else None,
                    "role": user.profile.role if user.profile else None,
                    "position": user.profile.position if user.profile else None
                } if user.profile else None
            },
            "message": "Successfully authenticated with Google"
        })
        
    except OAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/logout")
async def logout(request: Request):
    """Logout user"""
    if hasattr(request, 'session'):
        request.session.clear()
    return {"message": "Successfully logged out"}

@router.get("/me")
async def get_current_user_info(
    current_user: schemas.User = Depends(get_current_active_user)
):
    """Get current user information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "profile": {
            "id": current_user.profile.id if current_user.profile else None,
            "role": current_user.profile.role if current_user.profile else None,
            "position": current_user.profile.position if current_user.profile else None
        } if current_user.profile else None
    }

@router.get("/status")
async def auth_status(request: Request):
    """Check authentication status"""
    if hasattr(request, 'session'):
        access_token = request.session.get('access_token')
        user_id = request.session.get('user_id')
        username = request.session.get('username')
        
        if access_token and user_id:
            return {
                "authenticated": True,
                "user_id": user_id,
                "username": username,
                "has_token": True
            }
    
    return {
        "authenticated": False,
        "user_id": None,
        "username": None,
        "has_token": False
    }

@router.get("/google/status")
async def google_auth_status():
    """Check if Google OAuth is properly configured"""
    return {
        "google_oauth_configured": GOOGLE_CLIENT_ID != "dummy" and GOOGLE_CLIENT_SECRET != "dummy",
        "google_client_id_set": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID != "dummy"),
        "google_client_secret_set": bool(GOOGLE_CLIENT_SECRET and GOOGLE_CLIENT_SECRET != "dummy")
    }

@router.post("/login")
async def login_with_credentials(
    username: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """Login with username and password"""
    user = await security.authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset (basic implementation)"""
    user = await crud.get_user_by_email(db, email=email)
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # In a real implementation, you would:
    # 1. Generate a secure reset token
    # 2. Store it in the database with expiration
    # 3. Send an email with the reset link
    
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with token (basic implementation)"""
    # In a real implementation, you would:
    # 1. Validate the reset token
    # 2. Check if it's not expired
    # 3. Update the user's password
    # 4. Invalidate the reset token
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Password reset functionality not yet implemented"
    )