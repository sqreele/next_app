"""
User management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
from models import User, UserRole
from schemas import (
    User as UserSchema, UserCreate, UserUpdate, UserSummary,
    PaginationParams
)
import crud
from crud import CRUDError
from .auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Create a new user (Admin only)"""
    try:
        # Check if username or email already exists
        existing_user = await crud.user.get_by_username(db, username=user.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        existing_email = await crud.user.get_by_email(db, email=user.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        db_user = await crud.user.create(db, obj_in=user)
        return db_user
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[UserSchema])
async def list_users(
    pagination: PaginationParams = Depends(),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List users with filtering and pagination"""
    try:
        if search:
            users = await crud.user.search_users(db, search_term=search, limit=pagination.size)
        else:
            filters = {}
            if role:
                filters["role"] = role
            if is_active is not None:
                filters["is_active"] = is_active
            
            users = await crud.user.get_multi(
                db, 
                skip=pagination.offset, 
                limit=pagination.size,
                filters=filters,
                order_by="first_name"
            )
        return users
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by ID"""
    try:
        user = await crud.user.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Users can only see their own profile unless they're admin/manager
        if (user_id != current_user.id and 
            current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        return user
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user"""
    try:
        user = await crud.user.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Users can only update their own profile unless they're admin
        if (user_id != current_user.id and current_user.role != UserRole.ADMIN):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Non-admin users can't change role
        if (current_user.role != UserRole.ADMIN and 
            user_update.role is not None):
            user_update.role = None
        
        updated_user = await crud.user.update(db, db_obj=user, obj_in=user_update)
        return updated_user
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete user (soft delete) - Admin only"""
    try:
        user = await crud.user.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent self-deletion
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        await crud.user.soft_delete(db, id=user_id)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/role/{role}", response_model=List[UserSummary])
async def get_users_by_role(
    role: UserRole,
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get users by role"""
    try:
        users = await crud.user.get_by_role(db, role=role, limit=limit)
        return [UserSummary.model_validate(user) for user in users]
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}/assigned-issues")
async def get_user_assigned_issues(
    user_id: int,
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get issues assigned to a user"""
    try:
        # Check permissions
        if (user_id != current_user.id and 
            current_user.role not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERVISOR]):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        issues = await crud.issue.get_assigned_to_user(db, user_id=user_id, limit=limit)
        return issues
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}/pm-schedules")
async def get_user_pm_schedules(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get PM schedules assigned to a user"""
    try:
        # Check permissions
        if (user_id != current_user.id and 
            current_user.role not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERVISOR]):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        schedules = await crud.pm_schedule.get_by_user(db, user_id=user_id)
        return schedules
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
