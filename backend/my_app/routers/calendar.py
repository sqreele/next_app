from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta
from .. import models, schemas, dependencies, crud

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/procedure-schedule", response_model=List[schemas.CalendarEvent])
async def get_procedure_schedule(
    start_date: date = Query(...),
    end_date: date = Query(...),
    machine_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get scheduled procedures for calendar view"""
    query = select(models.ProcedureExecution).options(
        selectinload(models.ProcedureExecution.procedure).selectinload(models.Procedure.machine),
        selectinload(models.ProcedureExecution.assigned_to)
    ).filter(
        models.ProcedureExecution.scheduled_date >= start_date,
        models.ProcedureExecution.scheduled_date <= end_date
    )
    
    if machine_id:
        query = query.join(models.Procedure).filter(models.Procedure.machine_id == machine_id)
    
    result = await db.execute(query)
    executions = result.scalars().all()
    
    events = []
    for execution in executions:
        color = {
            'Scheduled': '#007bff',
            'In Progress': '#ffc107', 
            'Completed': '#28a745',
            'Skipped': '#6c757d'
        }.get(execution.status, '#007bff')
        
        events.append(schemas.CalendarEvent(
            id=f"procedure-{execution.id}",
            title=f"{execution.procedure.title} - {execution.procedure.machine.name}",
            start=execution.scheduled_date.isoformat(),
            backgroundColor=color,
            borderColor=color,
            extendedProps={
                "type": "procedure",
                "procedureId": execution.procedure.id,
                "executionId": execution.id,
                "machineId": execution.procedure.machine_id,
                "status": execution.status,
                "estimatedDuration": execution.procedure.estimated_duration_minutes
            }
        ))
    
    return events

@router.post("/procedure-executions", response_model=schemas.ProcedureExecutionWithDetails)
async def create_procedure_execution(
    execution: schemas.ProcedureExecutionCreate,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Schedule a new procedure execution"""
    # Verify procedure exists
    procedure = await db.get(models.Procedure, execution.procedure_id)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    
    db_execution = models.ProcedureExecution(**execution.model_dump())
    db.add(db_execution)
    await db.commit()
    await db.refresh(db_execution)
    
    # Load with relationships
    result = await db.execute(
        select(models.ProcedureExecution)
        .options(
            selectinload(models.ProcedureExecution.procedure).selectinload(models.Procedure.machine),
            selectinload(models.ProcedureExecution.assigned_to),
            selectinload(models.ProcedureExecution.completed_by)
        )
        .filter(models.ProcedureExecution.id == db_execution.id)
    )
    return result.scalars().first()

@router.put("/procedure-executions/{execution_id}", response_model=schemas.ProcedureExecutionWithDetails)
async def update_procedure_execution(
    execution_id: int,
    execution_update: schemas.ProcedureExecutionUpdate,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Update procedure execution (mark as completed, add images, etc.)"""
    db_execution = await db.get(models.ProcedureExecution, execution_id)
    if not db_execution:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    
    update_data = execution_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_execution, field, value)
    
    # If marking as completed, update procedure's last_completed_date
    if execution_update.status == 'Completed' and execution_update.completed_date:
        procedure = await db.get(models.Procedure, db_execution.procedure_id)
        if procedure:
            procedure.last_completed_date = execution_update.completed_date
            # Calculate next due date based on frequency
            if procedure.frequency and execution_update.completed_date:
                next_due = calculate_next_due_date(execution_update.completed_date, procedure.frequency)
                procedure.next_due_date = next_due
    
    await db.commit()
    await db.refresh(db_execution)
    
    # Load with relationships
    result = await db.execute(
        select(models.ProcedureExecution)
        .options(
            selectinload(models.ProcedureExecution.procedure).selectinload(models.Procedure.machine),
            selectinload(models.ProcedureExecution.assigned_to),
            selectinload(models.ProcedureExecution.completed_by)
        )
        .filter(models.ProcedureExecution.id == execution_id)
    )
    return result.scalars().first()

@router.post("/generate-schedule")
async def generate_procedure_schedule(
    start_date: date = Query(...),
    end_date: date = Query(...),
    machine_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Generate scheduled procedure executions for a date range"""
    # Get active procedures
    query = select(models.Procedure).filter(models.Procedure.is_active == True)
    if machine_id:
        query = query.filter(models.Procedure.machine_id == machine_id)
    
    result = await db.execute(query)
    procedures = result.scalars().all()
    
    created_count = 0
    for procedure in procedures:
        if procedure.frequency and procedure.next_due_date:
            current_date = max(procedure.next_due_date, start_date)
            while current_date <= end_date:
                # Check if execution already exists for this date
                existing = await db.execute(
                    select(models.ProcedureExecution).filter(
                        models.ProcedureExecution.procedure_id == procedure.id,
                        models.ProcedureExecution.scheduled_date == current_date
                    )
                )
                if not existing.scalars().first():
                    execution = models.ProcedureExecution(
                        procedure_id=procedure.id,
                        scheduled_date=current_date,
                        status='Scheduled'
                    )
                    db.add(execution)
                    created_count += 1
                
                # Calculate next occurrence
                current_date = calculate_next_due_date(current_date, procedure.frequency)
                if current_date is None:
                    break
    
    await db.commit()
    return {"message": f"Created {created_count} scheduled procedure executions"}

def calculate_next_due_date(last_date: date, frequency: str) -> Optional[date]:
    """Calculate next due date based on frequency"""
    if frequency == "Daily":
        return last_date + timedelta(days=1)
    elif frequency == "Weekly":
        return last_date + timedelta(weeks=1)
    elif frequency == "Monthly":
        # Add roughly a month
        if last_date.month == 12:
            return last_date.replace(year=last_date.year + 1, month=1)
        else:
            return last_date.replace(month=last_date.month + 1)
    elif frequency == "Quarterly":
        return last_date + timedelta(days=90)
    elif frequency == "Yearly":
        return last_date.replace(year=last_date.year + 1)
    return None
# In backend/my_app/routers/calendar.py - Update the existing endpoint

@router.put("/procedure-executions/{execution_id}", response_model=schemas.ProcedureExecutionWithDetails)
async def update_procedure_execution(
    execution_id: int,
    execution_update: schemas.ProcedureExecutionUpdate,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Update procedure execution (mark as completed, add images, etc.)"""
    db_execution = await db.get(models.ProcedureExecution, execution_id)
    if not db_execution:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    
    update_data = execution_update.model_dump(exclude_unset=True)
    
    # Handle image arrays properly
    for field, value in update_data.items():
        if field in ['before_images', 'after_images'] and value is not None:
            # Ensure we're working with a list
            if not isinstance(value, list):
                value = [value] if value else []
            setattr(db_execution, field, value)
            # Mark as modified for SQLAlchemy JSONB
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(db_execution, field)
        else:
            setattr(db_execution, field, value)
    
    # If marking as completed, update procedure's last_completed_date
    if execution_update.status == 'Completed' and execution_update.completed_date:
        procedure = await db.get(models.Procedure, db_execution.procedure_id)
        if procedure:
            procedure.last_completed_date = execution_update.completed_date
            # Calculate next due date based on frequency
            if procedure.frequency and execution_update.completed_date:
                next_due = calculate_next_due_date(execution_update.completed_date, procedure.frequency)
                procedure.next_due_date = next_due
    
    await db.commit()
    await db.refresh(db_execution)
    
    # Load with relationships
    result = await db.execute(
        select(models.ProcedureExecution)
        .options(
            selectinload(models.ProcedureExecution.procedure).selectinload(models.Procedure.machine),
            selectinload(models.ProcedureExecution.assigned_to),
            selectinload(models.ProcedureExecution.completed_by)
        )
        .filter(models.ProcedureExecution.id == execution_id)
    )
    return result.scalars().first()