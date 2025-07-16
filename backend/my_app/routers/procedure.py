# ==============================================================================
# File: backend/my_app/routers/procedure.py (FIXED - Complete)
# Description: Full CRUD operations for procedures with machine relationships
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from .. import schemas, models, dependencies, crud
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from ..utils.procedure_planning import ProcedurePlanner  # ADDED: Missing import
import os 
from datetime import date, timedelta

router = APIRouter(prefix="/procedures", tags=["procedures"])

@router.get("/", response_model=List[schemas.ProcedureWithMachines])
async def list_procedures(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all procedures with machine details"""
    try:
        query = select(models.Procedure).options(selectinload(models.Procedure.machines))
        
        if search:
            query = query.filter(models.Procedure.title.ilike(f"%{search}%"))
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        procedures = result.scalars().all()
        return procedures
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch procedures: {str(e)}")

@router.get("/machine/{machine_id}", response_model=List[schemas.ProcedureWithMachines])
async def get_procedures_by_machine(
    machine_id: int, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all procedures for a specific machine"""
    try:
        # First verify the machine exists
        machine = await crud.get_machine(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        procedures = await crud.get_procedures_by_machine(db, machine_id)
        return procedures
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch procedures: {str(e)}")

@router.get("/{procedure_id}", response_model=schemas.ProcedureWithMachines)
async def get_procedure(
    procedure_id: int, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get a specific procedure with machine details"""
    try:
        procedure = await crud.get_procedure(db, procedure_id)
        if not procedure:
            raise HTTPException(status_code=404, detail="Procedure not found")
        return procedure
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch procedure: {str(e)}")

@router.post("/", response_model=schemas.ProcedureWithMachines)
async def create_procedure(
    procedure: schemas.ProcedureCreate, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Create a new procedure for machines"""
    try:
        print(f"🔍 Creating procedure: {procedure.title} for machines {procedure.machine_ids}")
        
        # FIXED: Use correct function name
        db_procedure = await crud.create_procedure(db, procedure)
        if not db_procedure:
            raise HTTPException(status_code=400, detail="Failed to create procedure. Check if all machines exist.")
        
        print(f"✅ Procedure created successfully with ID: {db_procedure.id}")
        return db_procedure
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create procedure: {str(e)}")

@router.put("/{procedure_id}", response_model=schemas.ProcedureWithMachines)
async def update_procedure(
    procedure_id: int, 
    procedure: schemas.ProcedureUpdate,  # FIXED: Use Update schema
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Update a procedure"""
    try:
        updated_procedure = await crud.update_procedure(db, procedure_id, procedure)
        if not updated_procedure:
            raise HTTPException(status_code=404, detail="Procedure not found or machines not found")
        return updated_procedure
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update procedure: {str(e)}")

@router.patch("/{procedure_id}", response_model=schemas.ProcedureWithMachines)
async def patch_procedure(
    procedure_id: int, 
    procedure_update: schemas.ProcedureUpdate, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Partially update a procedure"""
    try:
        # Get the existing procedure
        existing_procedure = await crud.get_procedure(db, procedure_id)
        if not existing_procedure:
            raise HTTPException(status_code=404, detail="Procedure not found")
        
        # If machine_ids are being updated, verify they exist
        if procedure_update.machine_ids is not None:
            if procedure_update.machine_ids:  # Only check if list is not empty
                machines_result = await db.execute(
                    select(models.Machine).where(models.Machine.id.in_(procedure_update.machine_ids))
                )
                found_machines = machines_result.scalars().all()
                if len(found_machines) != len(procedure_update.machine_ids):
                    raise HTTPException(status_code=404, detail="One or more machines not found")
        
        # Update using CRUD function
        updated_procedure = await crud.update_procedure(db, procedure_id, procedure_update)
        if not updated_procedure:
            raise HTTPException(status_code=404, detail="Failed to update procedure")
        
        return updated_procedure
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update procedure: {str(e)}")

@router.delete("/{procedure_id}")
async def delete_procedure(
    procedure_id: int, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Delete a procedure"""
    try:
        deleted_procedure = await crud.delete_procedure(db, procedure_id)
        if not deleted_procedure:
            raise HTTPException(status_code=404, detail="Procedure not found")
        return {"message": f"Procedure '{deleted_procedure.title}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete procedure: {str(e)}")

# Additional endpoints for better machine-procedure management
@router.get("/machines/with-procedures", response_model=List[schemas.MachineWithProcedures])
async def get_machines_with_procedures(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all machines with their procedures"""
    try:
        result = await db.execute(
            select(models.Machine)
            .options(selectinload(models.Machine.procedures))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch machines: {str(e)}")

@router.get("/machines/available", response_model=List[schemas.Machine])
async def get_available_machines(db: AsyncSession = Depends(dependencies.get_db)):
    """Get all available machines for procedure creation"""
    try:
        result = await db.execute(select(models.Machine))
        machines = result.scalars().all()
        return machines
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch machines: {str(e)}")

@router.post("/executions/{execution_id}/upload_image")
async def upload_procedure_execution_image(
    execution_id: int,
    file: UploadFile = File(...),
    upload_type: str = Form("before"),  # "before" or "after"
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Upload image for procedure execution"""
    
    try:
        # Verify execution exists
        execution = await db.get(models.ProcedureExecution, execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="Procedure execution not found")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Save and resize the uploaded file
        from ..utils.image_utils import save_uploaded_file, get_image_url
        relative_path = await save_uploaded_file(file, f"procedure_execution/{upload_type}")
        
        # Get full URL
        full_url = await get_image_url(relative_path)
        
        # Update the execution with the new image path
        if upload_type == "before":
            if not execution.before_images:
                execution.before_images = []
            execution.before_images.append(relative_path)
        else:  # after
            if not execution.after_images:
                execution.after_images = []
            execution.after_images.append(relative_path)
        
        # Mark as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(execution, 'before_images' if upload_type == "before" else 'after_images')
        
        await db.commit()
        await db.refresh(execution)
        
        return {
            "file_path": relative_path,
            "url": full_url,
            "message": f"{upload_type.title()} image uploaded successfully",
            "execution_id": execution_id,
            "total_images": len(execution.before_images if upload_type == "before" else execution.after_images)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/generate-maintenance-plan")
async def generate_maintenance_plan(
    start_date: date,
    end_date: date,
    property_id: Optional[int] = None,
    machine_ids: Optional[List[int]] = None,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Generate a comprehensive maintenance plan"""
    try:
        plan = await ProcedurePlanner.create_maintenance_plan(
            db, start_date, end_date, property_id, machine_ids
        )
        
        return {
            "maintenance_plan": plan,
            "message": f"Generated plan with {plan['summary']['total_executions']} scheduled executions"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate maintenance plan: {str(e)}")

@router.post("/procedures/{procedure_id}/schedule")
async def schedule_procedure_executions(
    procedure_id: int,
    start_date: date,
    end_date: date,
    machine_ids: Optional[List[int]] = None,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Schedule executions for a specific procedure"""
    try:
        # Get the procedure
        procedure = await db.get(models.Procedure, procedure_id)
        if not procedure:
            raise HTTPException(status_code=404, detail="Procedure not found")
        
        # Load machines
        await db.refresh(procedure, ['machines'])
        
        # Filter machines if specified
        machines = procedure.machines
        if machine_ids:
            machines = [m for m in machines if m.id in machine_ids]
        
        if not machines:
            raise HTTPException(status_code=400, detail="No valid machines found for this procedure")
        
        # Generate schedule
        schedule = ProcedurePlanner.generate_schedule(procedure, start_date, end_date, machines)
        
        # Create actual executions in database
        created_executions = []
        for item in schedule:
            # Check if execution already exists
            existing = await db.execute(
                select(models.ProcedureExecution).where(
                    models.ProcedureExecution.procedure_id == item["procedure_id"],
                    models.ProcedureExecution.machine_id == item["machine_id"],
                    models.ProcedureExecution.scheduled_date == item["scheduled_date"]
                )
            )
            
            if not existing.scalars().first():
                execution = models.ProcedureExecution(
                    procedure_id=item["procedure_id"],
                    machine_id=item["machine_id"],
                    scheduled_date=item["scheduled_date"],
                    status='Scheduled'
                )
                db.add(execution)
                created_executions.append(item)
        
        await db.commit()
        
        return {
            "procedure_title": procedure.title,
            "scheduled_executions": created_executions,
            "total_created": len(created_executions),
            "message": f"Created {len(created_executions)} scheduled executions"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule executions: {str(e)}")

@router.get("/procedures/{procedure_id}/next-due-dates")
async def get_next_due_dates(
    procedure_id: int,
    count: int = 10,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get next due dates for a procedure"""
    try:
        procedure = await db.get(models.Procedure, procedure_id)
        if not procedure:
            raise HTTPException(status_code=404, detail="Procedure not found")
        
        if not procedure.frequency:
            return {"message": "No frequency set for this procedure"}
        
        # Calculate next due dates
        current_date = date.today()
        due_dates = []
        
        for i in range(count):
            next_date = ProcedurePlanner.calculate_next_due_date(current_date, procedure.frequency)
            if next_date:
                due_dates.append({
                    "date": next_date,
                    "days_from_now": (next_date - date.today()).days,
                    "week_day": next_date.strftime("%A")
                })
                current_date = next_date
            else:
                break
        
        return {
            "procedure_title": procedure.title,
            "frequency": procedure.frequency,
            "next_due_dates": due_dates
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate due dates: {str(e)}")
