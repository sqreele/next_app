 ==============================================================================
# File: backend/my_app/routers/work_orders.py (Corrected)
# Description: Async work order routes.
# ==============================================================================
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import crud, schemas, dependencies

router = APIRouter(prefix="/work_orders", tags=["work_orders"])

@router.post("/", response_model=schemas.WorkOrder)
async def create_work_order(
    property_id: int, work_order: schemas.WorkOrderCreate, db: AsyncSession = Depends(dependencies.get_db)
):
    return await crud.create_work_order(db=db, work_order=work_order, property_id=property_id)

@router.get("/", response_model=List[schemas.WorkOrder])
async def read_work_orders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    work_orders = await crud.get_work_orders(db, skip=skip, limit=limit)
    return work_orders
