"""
Property and room management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
from models import User, UserRole
from schemas import (
    Property as PropertySchema, PropertyCreate, PropertyUpdate,
    Room as RoomSchema, RoomCreate, RoomUpdate,
    UserPropertyAccess as UserPropertyAccessSchema,
    UserPropertyAccessCreate, UserPropertyAccessUpdate,
    PaginationParams
)
import crud
from crud import CRUDError
from routers.auth import get_current_active_user, require_role

router = APIRouter()

# Property endpoints
@router.post("/", response_model=PropertySchema, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_data: PropertyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Create a new property (Manager+ only)"""
    try:
        return await crud.property_crud.create(db, obj_in=property_data)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[PropertySchema])
async def list_properties(
    pagination: PaginationParams = Depends(),
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List properties"""
    try:
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        
        properties = await crud.property_crud.get_multi(
            db, 
            skip=pagination.offset, 
            limit=pagination.size,
            filters=filters,
            order_by="name"
        )
        return properties
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{property_id}", response_model=PropertySchema)
async def get_property(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get property by ID"""
    try:
        property_obj = await crud.property_crud.get(db, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        return property_obj
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{property_id}", response_model=PropertySchema)
async def update_property(
    property_id: int,
    property_update: PropertyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Update property (Manager+ only)"""
    try:
        property_obj = await crud.property_crud.get(db, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        
        updated_property = await crud.property_crud.update(
            db, db_obj=property_obj, obj_in=property_update
        )
        return updated_property
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete property (Admin only)"""
    try:
        property_obj = await crud.property_crud.get(db, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        
        await crud.property_crud.soft_delete(db, id=property_id)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{property_id}/rooms", response_model=List[RoomSchema])
async def get_property_rooms(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all rooms in a property"""
    try:
        # Verify property exists
        property_obj = await crud.property_crud.get(db, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        
        rooms = await crud.room.get_by_property(db, property_id=property_id)
        return rooms
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Room endpoints
@router.post("/{property_id}/rooms", response_model=RoomSchema, status_code=status.HTTP_201_CREATED)
async def create_room(
    property_id: int,
    room: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Create a new room (Supervisor+ only)"""
    try:
        # Verify property exists
        property_obj = await crud.property_crud.get(db, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Ensure room is assigned to the correct property
        room.property_id = property_id
        return await crud.room.create(db, obj_in=room)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rooms/{room_id}", response_model=RoomSchema)
async def get_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get room by ID"""
    try:
        room = await crud.room.get_with_machines(db, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return room
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/rooms/{room_id}", response_model=RoomSchema)
async def update_room(
    room_id: int,
    room_update: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Update room (Supervisor+ only)"""
    try:
        room = await crud.room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        updated_room = await crud.room.update(db, db_obj=room, obj_in=room_update)
        return updated_room
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Delete room (Manager+ only)"""
    try:
        room = await crud.room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        await crud.room.soft_delete(db, id=room_id)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

# User Property Access endpoints
@router.post("/{property_id}/access", response_model=UserPropertyAccessSchema, status_code=status.HTTP_201_CREATED)
async def grant_property_access(
    property_id: int,
    access_data: UserPropertyAccessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Grant user access to property (Manager+ only)"""
    try:
        # Verify property exists
        property_obj = await crud.property_crud.get(db, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Verify user exists
        user = await crud.user.get(db, access_data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Ensure access is for the correct property
        access_data.property_id = property_id
        return await crud.user_property_access.create(db, obj_in=access_data)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{property_id}/access", response_model=List[UserPropertyAccessSchema])
async def get_property_access(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Get all user access for a property (Supervisor+ only)"""
    try:
        # Verify property exists
        property_obj = await crud.property_crud.get(db, property_id)
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
        
        access_list = await crud.user_property_access.get_property_users(db, property_id=property_id)
        return access_list
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
