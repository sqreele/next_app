"""
PM Execution management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
from models import User, UserRole, PMStatus
from schemas import (
    PMExecution as PMExecutionSchema, PMExecutionCreate, PMExecutionUpdate,
    PaginationParams
)
import crud
from crud import CRUDError
from routers.auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=PMExecutionSchema, status_code=status.HTTP_201_CREATED)
async def create_pm_execution(
    execution: PMExecutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new PM execution"""
    try:
        # Verify PM schedule exists
        schedule = await crud.pm_schedule.get(db, execution.pm_schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="PM schedule not found")
        
        # Verify executor exists
        executor = await crud.user.get(db, execution.executed_by_id)
        if not executor:
            raise HTTPException(status_code=404, detail="Executor not found")
        
        # Only allow technicians+ to create executions
        if current_user.role not in [UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        return await crud.pm_execution.create(db, obj_in=execution)
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[PMExecutionSchema])
async def list_pm_executions(
    pagination: PaginationParams = Depends(),
    schedule_id: Optional[int] = None,
    executor_id: Optional[int] = None,
    status_filter: Optional[PMStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List PM executions with filtering"""
    try:
        filters = {}
        if schedule_id:
            filters["pm_schedule_id"] = schedule_id
        if executor_id:
            filters["executed_by_id"] = executor_id
        if status_filter:
            filters["status"] = status_filter
        
        executions = await crud.pm_execution.get_multi(
            db, 
            skip=pagination.offset, 
            limit=pagination.size,
            filters=filters,
            order_by="created_at", order_direction="desc"
        )
        return executions
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{execution_id}", response_model=PMExecutionSchema)
async def get_pm_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get PM execution by ID"""
    try:
        execution = await crud.pm_execution.get_with_relations(db, execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="PM execution not found")
        return execution
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{execution_id}", response_model=PMExecutionSchema)
async def update_pm_execution(
    execution_id: int,
    execution_update: PMExecutionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update PM execution"""
    try:
        execution = await crud.pm_execution.get(db, execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="PM execution not found")
        
        # Only the assigned executor or supervisor+ can update
        if (execution.executed_by_id != current_user.id and 
            current_user.role not in [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        updated_execution = await crud.pm_execution.update(db, db_obj=execution, obj_in=execution_update)
        return updated_execution
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{execution_id}/start", response_model=PMExecutionSchema)
async def start_pm_execution(
    execution_id: int,
    executor_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start a PM execution"""
    try:
        # Use current user as executor if not specified
        if executor_id is None:
            executor_id = current_user.id
        
        # Only allow starting own executions unless supervisor+
        if (executor_id != current_user.id and 
            current_user.role not in [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]):
            raise HTTPException(status_code=403, detail="Can only start your own executions")
        
        # Verify executor exists
        executor = await crud.user.get(db, executor_id)
        if not executor:
            raise HTTPException(status_code=404, detail="Executor not found")
        
        execution = await crud.pm_execution.start_execution(
            db, 
            execution_id=execution_id, 
            executor_id=executor_id
        )
        if not execution:
            raise HTTPException(
                status_code=404, 
                detail="PM execution not found or already started"
            )
        return execution
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{execution_id}/complete", response_model=PMExecutionSchema)
async def complete_pm_execution(
    execution_id: int,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Complete a PM execution and update schedule"""
    try:
        # Get execution to check permissions
        execution = await crud.pm_execution.get(db, execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="PM execution not found")
        
        # Only the assigned executor or supervisor+ can complete
        if (execution.executed_by_id != current_user.id and 
            current_user.role not in [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        execution = await crud.pm_execution.complete_execution(
            db, 
            execution_id=execution_id, 
            notes=notes
        )
        if not execution:
            raise HTTPException(status_code=404, detail="PM execution not found")
        return execution
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/today/completed", response_model=List[PMExecutionSchema])
async def get_completed_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get PM executions completed today"""
    try:
        executions = await crud.pm_execution.get_completed_today(db)
        return executions
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-executions", response_model=List[PMExecutionSchema])
async def get_my_executions(
    pagination: PaginationParams = Depends(),
    status_filter: Optional[PMStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's PM executions"""
    try:
        filters = {"executed_by_id": current_user.id}
        if status_filter:
            filters["status"] = status_filter
        
        executions = await crud.pm_execution.get_multi(
            db, 
            skip=pagination.offset, 
            limit=pagination.size,
            filters=filters,
            order_by="created_at", order_direction="desc"
        )
        return executions
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{execution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pm_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Delete PM execution (Manager+ only)"""
    try:
        execution = await crud.pm_execution.get(db, execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="PM execution not found")
        
        # Only allow deletion of non-completed executions
        if execution.status == PMStatus.COMPLETED:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete completed executions"
            )
        
        await crud.pm_execution.remove(db, id=execution_id)
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/schedule/{schedule_id}", response_model=List[PMExecutionSchema])
async def get_executions_by_schedule(
    schedule_id: int,
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get PM executions for a specific schedule"""
    try:
        # Verify schedule exists
        schedule = await crud.pm_schedule.get(db, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="PM schedule not found")
        
        executions = await crud.pm_execution.get_by_schedule(
            db, 
            schedule_id=schedule_id, 
            limit=limit
        )
        return executions
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
