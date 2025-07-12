# ==============================================================================
# File: backend/my_app/routers/users.py (Add Properties Endpoint)
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

@router.get("/me", response_model=schemas.User)  # Remove trailing slash
async def read_users_me(
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    return schemas.User.model_validate(current_user)

@router.get("/", response_model=List[schemas.User])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    role: str = None,
    is_active: bool = None,
    search: str = None,
    property_id: int = None,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all users with optional filtering"""
    try:
        users = await crud.get_users(db, skip=skip, limit=limit)
        
        # Apply filters
        filtered_users = users
        
        if role:
            filtered_users = [u for u in filtered_users if u.profile and u.profile.role == role]
        
        if is_active is not None:
            filtered_users = [u for u in filtered_users if u.is_active == is_active]
        
        if search:
            search_lower = search.lower()
            filtered_users = [u for u in filtered_users if 
                search_lower in u.username.lower() or 
                search_lower in u.email.lower() or
                (u.profile and search_lower in u.profile.role.lower()) or
                (u.profile and u.profile.position and search_lower in u.profile.position.lower())
            ]
        
        if property_id is not None:
            # Filter by property through the UserProfile properties relationship
            filtered_users = [u for u in filtered_users if 
                u.profile and any(prop.id == property_id for prop in u.profile.properties)
            ]
        
        return filtered_users
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

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

# ADD THIS ENDPOINT FOR PROPERTIES
@router.get("/properties", response_model=List[schemas.Property])
async def get_available_properties(
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all available properties for user registration"""
    try:
        properties = await crud.get_properties(db)
        return properties
    except Exception as e:
        print(f"Error fetching properties: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch properties")
    
@router.get("/{user_id}", response_model=schemas.User)
async def read_user(user_id: int, db: AsyncSession = Depends(dependencies.get_db)):
    db_user = await crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user    