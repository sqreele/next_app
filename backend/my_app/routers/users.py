# ==============================================================================
# File: backend/my_app/routers/users.py (Corrected)
# Description: Async user and authentication routes.
# ==============================================================================
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import crud, schemas, dependencies, security
from sqlalchemy.future import select
from .. import models

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=schemas.User)
async def create_user(
    user: schemas.UserCreate, db: AsyncSession = Depends(dependencies.get_db)
):
    db_user = await crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return await crud.create_user(db=db, user=user)

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(dependencies.get_db),
):
    user = await security.authenticate_user(
        db, form_data.username, form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me/", response_model=schemas.User)
async def read_users_me(
    current_user: schemas.User = Depends(dependencies.get_current_active_user),
):
    return current_user

@router.get("/check-username/{username}")
async def check_username_availability(
    username: str, db: AsyncSession = Depends(dependencies.get_db)
):
    """Check if a username is available for registration."""
    user = await crud.get_user_by_username(db, username=username)
    return {"available": user is None}

@router.get("/check-email/{email}")
async def check_email_availability(
    email: str, db: AsyncSession = Depends(dependencies.get_db)
):
    """Check if an email is available for registration."""
    user = await crud.get_user_by_email(db, email=email)
    return {"available": user is None}
