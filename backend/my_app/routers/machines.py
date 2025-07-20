# ==============================================================================
# File: backend/my_app/routers/machines.py
# Description: Async machine routes with procedure relationships.
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import crud, schemas, dependencies, models
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
    result = []
    for m in machines:
        has_pm = any(getattr(wo, 'type', None) == models.WorkOrderType.PM for wo in getattr(m, 'work_orders', []))
        has_issue = any(getattr(wo, 'type', None) == models.WorkOrderType.ISSUE for wo in getattr(m, 'work_orders', []))
        has_workorder = any(getattr(wo, 'type', None) == models.WorkOrderType.WORKORDER for wo in getattr(m, 'work_orders', []))
        m_dict = m.__dict__.copy()
        m_dict['has_pm'] = has_pm
        m_dict['has_issue'] = has_issue
        m_dict['has_workorder'] = has_workorder
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
    result = []
    for m in machines:
        has_pm = any(getattr(wo, 'type', None) == models.WorkOrderType.PM for wo in getattr(m, 'work_orders', []))
        has_issue = any(getattr(wo, 'type', None) == models.WorkOrderType.ISSUE for wo in getattr(m, 'work_orders', []))
        has_workorder = any(getattr(wo, 'type', None) == models.WorkOrderType.WORKORDER for wo in getattr(m, 'work_orders', []))
        m_dict = m.__dict__.copy()
        m_dict['has_pm'] = has_pm
        m_dict['has_issue'] = has_issue
        m_dict['has_workorder'] = has_workorder
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
    has_pm = any(getattr(wo, 'type', None) == models.WorkOrderType.PM for wo in getattr(machine, 'work_orders', []))
    has_issue = any(getattr(wo, 'type', None) == models.WorkOrderType.ISSUE for wo in getattr(machine, 'work_orders', []))
    has_workorder = any(getattr(wo, 'type', None) == models.WorkOrderType.WORKORDER for wo in getattr(machine, 'work_orders', []))
    m_dict = machine.__dict__.copy()
    m_dict['has_pm'] = has_pm
    m_dict['has_issue'] = has_issue
    m_dict['has_workorder'] = has_workorder
    return m_dict

@router.get("/{machine_id}/procedures", response_model=List[schemas.Procedure])
async def get_machine_procedures(
    machine_id: int,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Get all procedures for a specific machine"""
    machine = await crud.get_machine(db, machine_id=machine_id)
    if machine is None:
        raise HTTPException(status_code=404, detail="Machine not found")

    procedures = await crud.get_procedures_by_machine(db, machine_id)
    return procedures

@router.get("/{machine_id}/with-procedures", response_model=schemas.MachineWithProcedures)
async def get_machine_with_procedures(
    machine_id: int,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Get machine with all its procedures"""
    machine = await crud.get_machine_with_procedures(db, machine_id)
    if machine is None:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@router.get("/by-work-order-type/{work_order_type}", response_model=List[schemas.Machine])
async def read_machines_by_work_order_type(
    work_order_type: models.WorkOrderType,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Get machines that have work orders of the specified type"""
    machines = await crud.get_machines_by_work_order_type(
        db=db,
        work_order_type=work_order_type,
        skip=skip,
        limit=limit
    )

    result = []
    for m in machines:
        has_pm = any(getattr(wo, 'type', None) == models.WorkOrderType.PM for wo in getattr(m, 'work_orders', []))
        has_issue = any(getattr(wo, 'type', None) == models.WorkOrderType.ISSUE for wo in getattr(m, 'work_orders', []))
        has_workorder = any(getattr(wo, 'type', None) == models.WorkOrderType.WORKORDER for wo in getattr(m, 'work_orders', []))
        m_dict = m.__dict__.copy()
        m_dict['has_pm'] = has_pm
        m_dict['has_issue'] = has_issue
        m_dict['has_workorder'] = has_workorder
        result.append(m_dict)

    return result