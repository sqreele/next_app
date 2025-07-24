"""
Machine management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
from models import User, UserRole
from schemas import (
    Machine as MachineSchema, MachineCreate, MachineUpdate, MachineSummary,
    PMSchedule as PMScheduleSchema,
    Issue as IssueSchema,
    Inspection as InspectionSchema,
    PaginationParams
)
import crud
from crud import CRUDError
from routers.auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=MachineSchema, status_code=status.HTTP_201_CREATED)
async def create_machine(
    machine: MachineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Create a new machine (Supervisor+ only)"""
    try:
        # Validate room_id is not None
        if machine.room_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="room_id is required and cannot be null"
            )
        
        # Check if room exists
        from crud import room
        existing_room = await room.get(db, machine.room_id)
        if not existing_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room with ID {machine.room_id} does not exist"
            )
        
        # Check if serial number already exists
        existing_machine = await crud.machine.get_by_serial_number(db, serial_number=machine.serial_number)
        if existing_machine:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Serial number already exists"
            )
        
        return await crud.machine.create(db, obj_in=machine)
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[MachineSchema])
async def list_machines(
    pagination: PaginationParams = Depends(),
    room_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List machines with filtering and pagination"""
    try:
        if search:
            machines = await crud.machine.search_machines(db, search_term=search, limit=pagination.size)
        else:
            filters = {}
            if room_id:
                filters["room_id"] = room_id
            if is_active is not None:
                filters["is_active"] = is_active
            
            machines = await crud.machine.get_multi(
                db, 
                skip=pagination.offset, 
                limit=pagination.size,
                filters=filters,
                order_by="name"
            )
        return machines
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{machine_id}", response_model=MachineSchema)
async def get_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get machine by ID"""
    try:
        machine = await crud.machine.get_with_room(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        return machine
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{machine_id}", response_model=MachineSchema)
async def update_machine(
    machine_id: int,
    machine_update: MachineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Update machine (Supervisor+ only)"""
    try:
        machine = await crud.machine.get(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Check serial number uniqueness if being updated
        if (machine_update.serial_number and 
            machine_update.serial_number != machine.serial_number):
            existing_machine = await crud.machine.get_by_serial_number(
                db, serial_number=machine_update.serial_number
            )
            if existing_machine:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Serial number already exists"
                )
        
        updated_machine = await crud.machine.update(db, db_obj=machine, obj_in=machine_update)
        return updated_machine
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Delete machine (Manager+ only)"""
    try:
        machine = await crud.machine.get(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        await crud.machine.soft_delete(db, id=machine_id)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{machine_id}/pm-schedules", response_model=List[PMScheduleSchema])
async def get_machine_pm_schedules(
    machine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all PM schedules for a machine"""
    try:
        # Verify machine exists
        machine = await crud.machine.get(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        schedules = await crud.pm_schedule.get_by_machine(db, machine_id=machine_id)
        return schedules
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{machine_id}/issues", response_model=List[IssueSchema])
async def get_machine_issues(
    machine_id: int,
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get issues for a machine"""
    try:
        # Verify machine exists
        machine = await crud.machine.get(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        issues = await crud.issue.get_by_machine(db, machine_id=machine_id, limit=limit)
        return issues
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{machine_id}/inspections", response_model=List[InspectionSchema])
async def get_machine_inspections(
    machine_id: int,
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get inspections for a machine"""
    try:
        # Verify machine exists
        machine = await crud.machine.get(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        inspections = await crud.inspection.get_by_machine(db, machine_id=machine_id, limit=limit)
        return inspections
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/serial/{serial_number}", response_model=MachineSchema)
async def get_machine_by_serial(
    serial_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get machine by serial number"""
    try:
        machine = await crud.machine.get_by_serial_number(db, serial_number=serial_number)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        return machine
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{machine_id}/summary", response_model=MachineSummary)
async def get_machine_summary(
    machine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get machine summary information"""
    try:
        machine = await crud.machine.get(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        return MachineSummary.model_validate(machine)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
