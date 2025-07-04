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

# --- FIX IS HERE ---
# This special block is only 'True' for type checkers, not when the app is running.
# This breaks the import loop.
if TYPE_CHECKING:
    from . import models

# Password Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_in_env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional['models.User']:
    """
    Authenticates a user by username and password.
    Returns the user object if successful, otherwise None.
    """
    # Note: We use the string 'models.User' for the type hint to be safe.
    query = select(models.User).where(models.User.username == username)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
