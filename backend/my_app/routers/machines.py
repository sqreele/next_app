# ==============================================================================
# File: backend/my_app/routers/machines.py (Improved)
# Description: Async machine routes.
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import crud, schemas, dependencies
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/machines", tags=["machines"])

@router.post("/property/{property_id}", response_model=schemas.Machine)
async def create_machine(
    property_id: int, 
    machine: schemas.MachineCreate, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    return await crud.create_machine(db=db, machine=machine, property_id=property_id)

@router.get("/", response_model=List[schemas.Machine])
async def read_machines(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    machines = await crud.get_machines(db, skip=skip, limit=limit)
    # Annotate with has_pm and has_issue
    result = []
    for m in machines:
        has_pm = any(getattr(wo, 'type', None) == 'pm' for wo in getattr(m, 'work_orders', []))
        has_issue = any(getattr(wo, 'type', None) == 'issue' for wo in getattr(m, 'work_orders', []))
        m_dict = m.__dict__.copy()
        m_dict['has_pm'] = has_pm
        m_dict['has_issue'] = has_issue
        result.append(m_dict)
    return result

@router.get("/property/{property_id}", response_model=List[schemas.Machine])
async def read_machines_by_property(
    property_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    machines = await crud.get_machines_by_property(db, property_id=property_id, skip=skip, limit=limit)
    # Annotate with has_pm and has_issue
    result = []
    for m in machines:
        has_pm = any(getattr(wo, 'type', None) == 'pm' for wo in getattr(m, 'work_orders', []))
        has_issue = any(getattr(wo, 'type', None) == 'issue' for wo in getattr(m, 'work_orders', []))
        m_dict = m.__dict__.copy()
        m_dict['has_pm'] = has_pm
        m_dict['has_issue'] = has_issue
        result.append(m_dict)
    return result

@router.get("/{machine_id}", response_model=schemas.Machine)
async def read_machine(
    machine_id: int,
    db: AsyncSession = Depends(dependencies.get_db),
):
    machine = await crud.get_machine(db, machine_id=machine_id)
    if machine is None:
        raise HTTPException(status_code=404, detail="Machine not found")
    has_pm = any(getattr(wo, 'type', None) == 'pm' for wo in getattr(machine, 'work_orders', []))
    has_issue = any(getattr(wo, 'type', None) == 'issue' for wo in getattr(machine, 'work_orders', []))
    m_dict = machine.__dict__.copy()
    m_dict['has_pm'] = has_pm
    m_dict['has_issue'] = has_issue
    return m_dict
