# ==============================================================================
# File: backend/my_app/security.py (Corrected for Circular Import)
# Description: Handles authentication, password hashing, and JWT tokens.
# ==============================================================================
import os
from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

# Import models to fix the NameError
from . import models

# --- FIX IS HERE ---
# This special block is only 'True' for type checkers, not when the app is running.
# This breaks the import loop.
if TYPE_CHECKING:
    from . import schemas

# Password Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_in_env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 schemes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_password_reset_token(email: str) -> str:
    """Creates a JWT token for password reset."""
    expire = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
    to_encode = {"sub": email, "exp": expire, "type": "password_reset"}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password_reset_token(token: str) -> Optional[str]:
    """Verifies a password reset token and returns the email if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "password_reset":
            return None
        return email
    except JWTError:
        return None

async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional['models.User']:
    """
    Authenticates a user by username and password.
    Returns the user object if successful, otherwise None.
    """
    query = select(models.User).where(models.User.username == username)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

async def get_current_user(token: str, db: AsyncSession) -> 'models.User':
    """Gets the current user from a JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check if token is blacklisted
    from routers.auth import TOKEN_BLACKLIST
    if token in TOKEN_BLACKLIST:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been invalidated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    query = select(models.User).where(models.User.username == username)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(token: str, db: AsyncSession) -> 'models.User':
    """Gets the current active user from a JWT token."""
    user = await get_current_user(token, db)
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

# For use in dependencies.py - don't import get_db here to avoid circular imports
async def try_get_current_active_user_impl(token: Optional[str], db: AsyncSession) -> Optional['models.User']:
    """
    Implementation of try_get_current_active_user without FastAPI dependencies.
    This is used by the dependency function in dependencies.py
    """
    if not token:
        return None
    
    try:
        return await get_current_active_user(token, db)
    except HTTPException:
        return None
