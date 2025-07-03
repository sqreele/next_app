# ==============================================================================
# File: backend/my_app/routers/machines.py (Corrected)
# Description: Async machine routes.
# ==============================================================================
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import crud, schemas, dependencies

router = APIRouter(prefix="/machines", tags=["machines"])

@router.post("/", response_model=schemas.Machine)
async def create_machine(
    property_id: int, machine: schemas.MachineCreate, db: AsyncSession = Depends(dependencies.get_db)
):
    return await crud.create_machine(db=db, machine=machine, property_id=property_id)

@router.get("/", response_model=List[schemas.Machine])
async def read_machines(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    machines = await crud.get_machines(db, skip=skip, limit=limit)
    return machines
