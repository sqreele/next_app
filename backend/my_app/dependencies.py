# File: backend/my_app/dependencies.py
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from . import crud, models, schemas
from .database import SessionLocal
from .security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/users/token", auto_error=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get an async database session."""
    async with SessionLocal() as session:
        yield session

async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> models.User:
    """Dependency to get the current user from a JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    # Ensure proper loading of relationships
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.profile).selectinload(models.UserProfile.properties)
        )
        .filter(models.User.username == token_data.username)
    )
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Dependency to get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def try_get_current_active_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[models.User]:
    """
    Try to get current active user. Returns None if not authenticated.
    This is useful for optional authentication endpoints.
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        
        # Ensure proper loading of relationships
        result = await db.execute(
            select(models.User)
            .options(
                selectinload(models.User.profile).selectinload(models.UserProfile.properties)
            )
            .filter(models.User.username == username)
        )
        user = result.scalars().first()
        
        if user is None or not user.is_active:
            return None
        return user
    except JWTError:
        return None