"""
PM Schedule management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
from models import User, UserRole
from schemas import (
    PMSchedule as PMScheduleSchema, PMScheduleCreate, PMScheduleUpdate,
    PMExecution as PMExecutionSchema,
    PaginationParams, BulkUpdateRequest, BulkOperationResult
)
import crud
from crud import CRUDError
from .auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=PMScheduleSchema, status_code=status.HTTP_201_CREATED)
async def create_pm_schedule(
    schedule: PMScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Create a new PM schedule (Supervisor+ only)"""
    try:
        # Verify machine exists
        machine = await crud.machine.get(db, schedule.machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Verify procedure exists
        procedure = await crud.procedure.get(db, schedule.procedure_id)
        if not procedure:
            raise HTTPException(status_code=404, detail="Procedure not found")
        
        # Verify user exists
        user = await crud.user.get(db, schedule.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return await crud.pm_schedule.create(db, obj_in=schedule)
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[PMScheduleSchema])
async def list_pm_schedules(
    pagination: PaginationParams = Depends(),
    machine_id: Optional[int] = None,
    user_id: Optional[int] = None,
    overdue_only: bool = False,
    upcoming_only: bool = False,
    days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List PM schedules with filtering"""
    try:
        if overdue_only:
            schedules = await crud.pm_schedule.get_overdue(db, limit=pagination.size)
        elif upcoming_only:
            schedules = await crud.pm_schedule.get_upcoming(db, days=days, limit=pagination.size)
        elif machine_id:
            schedules = await crud.pm_schedule.get_by_machine(db, machine_id=machine_id)
        elif user_id:
            schedules = await crud.pm_schedule.get_by_user(db, user_id=user_id)
        else:
            filters = {"is_active": True}
            schedules = await crud.pm_schedule.get_multi(
                db, 
                skip=pagination.offset, 
                limit=pagination.size,
                filters=filters,
                order_by="next_due"
            )
        return schedules
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{schedule_id}", response_model=PMScheduleSchema)
async def get_pm_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get PM schedule by ID"""
    try:
        schedule = await crud.pm_schedule.get_with_relations(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="PM schedule not found")
        return schedule
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{schedule_id}", response_model=PMScheduleSchema)
async def update_pm_schedule(
    schedule_id: int,
    schedule_update: PMScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Update PM schedule (Supervisor+ only)"""
    try:
        schedule = await crud.pm_schedule.get(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="PM schedule not found")
        
        # Verify related entities if they're being updated
        if schedule_update.procedure_id:
            procedure = await crud.procedure.get(db, schedule_update.procedure_id)
            if not procedure:
                raise HTTPException(status_code=404, detail="Procedure not found")
        
        if schedule_update.user_id:
            user = await crud.user.get(db, schedule_update.user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        
        updated_schedule = await crud.pm_schedule.update(db, db_obj=schedule, obj_in=schedule_update)
        return updated_schedule
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pm_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Delete PM schedule (Manager+ only)"""
    try:
        schedule = await crud.pm_schedule.get(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="PM schedule not found")
        
        await crud.pm_schedule.soft_delete(db, id=schedule_id)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{schedule_id}/executions", response_model=List[PMExecutionSchema])
async def get_schedule_executions(
    schedule_id: int,
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get PM executions for a schedule"""
    try:
        # Verify schedule exists
        schedule = await crud.pm_schedule.get(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="PM schedule not found")
        
        executions = await crud.pm_execution.get_by_schedule(db, schedule_id=schedule_id, limit=limit)
        return executions
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/overdue", response_model=List[PMScheduleSchema])
async def get_overdue_schedules(
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overdue PM schedules"""
    try:
        schedules = await crud.pm_schedule.get_overdue(db, limit=limit)
        return schedules
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/upcoming", response_model=List[PMScheduleSchema])
async def get_upcoming_schedules(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get upcoming PM schedules"""
    try:
        schedules = await crud.pm_schedule.get_upcoming(db, days=days, limit=limit)
        return schedules
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-update", response_model=BulkOperationResult)
async def bulk_update_pm_schedules(
    bulk_request: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Bulk update PM schedules (Supervisor+ only)"""
    try:
        result = await crud.bulk_update_pm_schedules(
            db, 
            schedule_ids=bulk_request.ids, 
            updates=bulk_request.updates
        )
        return BulkOperationResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Bulk update failed")

@router.put("/{schedule_id}/next-due")
async def update_schedule_next_due(
    schedule_id: int,
    next_due: str,  # ISO format datetime string
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Update next due date for a PM schedule (Supervisor+ only)"""
    try:
        from datetime import datetime
        next_due_datetime = datetime.fromisoformat(next_due.replace('Z', '+00:00'))
        
        schedule = await crud.pm_schedule.update_next_due(
            db, 
            schedule_id=schedule_id, 
            next_due=next_due_datetime
        )
        if not schedule:
            raise HTTPException(status_code=404, detail="PM schedule not found")
        
        return {"message": "Next due date updated successfully", "next_due": schedule.next_due}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
