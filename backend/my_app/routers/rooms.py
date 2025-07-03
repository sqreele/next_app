# ==============================================================================
# File: backend/my_app/routers/rooms.py (Corrected)
# Description: Async room routes.
# ==============================================================================
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import crud, schemas, dependencies

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.post("/", response_model=schemas.Room)
async def create_room(
    property_id: int, room: schemas.RoomCreate, db: AsyncSession = Depends(dependencies.get_db)
):
    return await crud.create_room(db=db, room=room, property_id=property_id)

@router.get("/", response_model=List[schemas.Room])
async def read_rooms(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    rooms = await crud.get_rooms(db, skip=skip, limit=limit)
    return rooms
