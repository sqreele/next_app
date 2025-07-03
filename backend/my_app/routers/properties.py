# ==============================================================================
# File: backend/my_app/routers/properties.py (Corrected)
# Description: Async property routes.
# ==============================================================================
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import crud, schemas, dependencies

router = APIRouter(prefix="/properties", tags=["properties"])

@router.post("/", response_model=schemas.Property)
async def create_property(
    property: schemas.PropertyCreate, db: AsyncSession = Depends(dependencies.get_db)
):
    return await crud.create_property(db=db, property=property)

@router.get("/", response_model=List[schemas.Property])
async def read_properties(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    properties = await crud.get_properties(db, skip=skip, limit=limit)
    return properties

