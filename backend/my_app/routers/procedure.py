# ==============================================================================
# File: backend/my_app/routers/procedure.py (Complete procedure-machine API)
# Description: Full CRUD operations for procedures with machine relationships
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import schemas, models, dependencies, crud
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import os 
router = APIRouter(prefix="/procedures", tags=["procedures"])

@router.get("/", response_model=List[schemas.ProcedureWithMachine])
async def list_procedures(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all procedures with machine details"""
    procedures = await crud.get_procedures_with_machines(db, skip=skip, limit=limit)
    return procedures

@router.get("/machine/{machine_id}", response_model=List[schemas.ProcedureWithMachine])
async def get_procedures_by_machine(
    machine_id: int, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all procedures for a specific machine"""
    # First verify the machine exists
    machine = await crud.get_machine(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    procedures = await crud.get_procedures_by_machine(db, machine_id)
    return procedures

@router.get("/{procedure_id}", response_model=schemas.ProcedureWithMachine)
async def get_procedure(
    procedure_id: int, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get a specific procedure with machine details"""
    procedure = await crud.get_procedure(db, procedure_id)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return procedure

@router.post("/", response_model=schemas.ProcedureWithMachine)
async def create_procedure(
    procedure: schemas.ProcedureCreate, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Create a new procedure for a machine"""
    print(f"🔍 Creating procedure: {procedure.title} for machine {procedure.machine_id}")
    
    db_procedure = await crud.create_procedure_for_machine(db, procedure)
    if not db_procedure:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    print(f"✅ Procedure created successfully with ID: {db_procedure.id}")
    return db_procedure

@router.put("/{procedure_id}", response_model=schemas.ProcedureWithMachine)
async def update_procedure(
    procedure_id: int, 
    procedure: schemas.ProcedureCreate, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Update a procedure"""
    updated_procedure = await crud.update_procedure(db, procedure_id, procedure)
    if not updated_procedure:
        raise HTTPException(status_code=404, detail="Procedure or Machine not found")
    return updated_procedure

@router.patch("/{procedure_id}", response_model=schemas.ProcedureWithMachine)
async def patch_procedure(
    procedure_id: int, 
    procedure_update: schemas.ProcedureUpdate, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Partially update a procedure"""
    # Get the existing procedure
    existing_procedure = await crud.get_procedure(db, procedure_id)
    if not existing_procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    
    # If machine_id is being updated, verify it exists
    if procedure_update.machine_id is not None:
        machine = await crud.get_machine(db, procedure_update.machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
    
    # Update only provided fields
    update_data = procedure_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(existing_procedure, field, value)
    
    await db.commit()
    await db.refresh(existing_procedure)
    
    # Reload with machine relationship
    result = await db.execute(
        select(models.Procedure)
        .options(selectinload(models.Procedure.machine))
        .filter(models.Procedure.id == procedure_id)
    )
    return result.scalars().first()

@router.delete("/{procedure_id}")
async def delete_procedure(
    procedure_id: int, 
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Delete a procedure"""
    deleted_procedure = await crud.delete_procedure(db, procedure_id)
    if not deleted_procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return {"message": f"Procedure '{deleted_procedure.title}' deleted successfully"}

# Additional endpoints for better machine-procedure management
@router.get("/machines/with-procedures", response_model=List[schemas.MachineWithProcedures])
async def get_machines_with_procedures(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Get all machines with their procedures"""
    result = await db.execute(
        select(models.Machine)
        .options(selectinload(models.Machine.procedures))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.get("/machines/available", response_model=List[schemas.Machine])
async def get_available_machines(db: AsyncSession = Depends(dependencies.get_db)):
    """Get all available machines for procedure creation"""
    result = await db.execute(select(models.Machine))
    machines = result.scalars().all()
    return machines
# In backend/my_app/routers/procedure.py - Add this endpoint

@router.post("/executions/{execution_id}/upload_image")
async def upload_procedure_execution_image(
    execution_id: int,
    file: UploadFile = File(...),
    upload_type: str = Form("before"),  # "before" or "after"
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Upload image for procedure execution"""
    
    # Verify execution exists
    execution = await db.get(models.ProcedureExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    
    try:
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
# In backend/my_app/routers/procedure.py

@router.post("/executions/{execution_id}/upload_images")
async def upload_multiple_procedure_execution_images(
    execution_id: int,
    files: List[UploadFile] = File(...),
    upload_type: str = Form("before"),  # "before" or "after"
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Upload multiple images for procedure execution"""
    
    # Verify execution exists
    execution = await db.get(models.ProcedureExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    
    uploaded_files = []
    errors = []
    
    for file in files:
        try:
            # Validate file type
            if not file.content_type or not file.content_type.startswith('image/'):
                errors.append(f"{file.filename}: Not an image file")
                continue
            
            # Save and resize the uploaded file
            from ..utils.image_utils import save_uploaded_file, get_image_url
            relative_path = await save_uploaded_file(file, f"procedure_execution/{upload_type}")
            full_url = await get_image_url(relative_path)
            
            uploaded_files.append({
                "filename": file.filename,
                "file_path": relative_path,
                "url": full_url
            })
            
            # Update the execution with the new image path
            if upload_type == "before":
                if not execution.before_images:
                    execution.before_images = []
                execution.before_images.append(relative_path)
            else:  # after
                if not execution.after_images:
                    execution.after_images = []
                execution.after_images.append(relative_path)
                
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
    
    if uploaded_files:
        # Mark as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(execution, 'before_images' if upload_type == "before" else 'after_images')
        
        await db.commit()
        await db.refresh(execution)
    
    return {
        "uploaded_files": uploaded_files,
        "errors": errors,
        "total_uploaded": len(uploaded_files),
        "execution_id": execution_id,
        "total_images": len(execution.before_images if upload_type == "before" else execution.after_images)
    }
 # In backend/my_app/routers/procedure.py

@router.delete("/executions/{execution_id}/images")
async def delete_procedure_execution_image(
    execution_id: int,
    image_path: str,
    upload_type: str,  # "before" or "after"
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Delete an image from procedure execution"""
    
    execution = await db.get(models.ProcedureExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Procedure execution not found")
    
    try:
        from sqlalchemy.orm.attributes import flag_modified
        
        if upload_type == "before":
            if execution.before_images and image_path in execution.before_images:
                execution.before_images.remove(image_path)
                flag_modified(execution, 'before_images')
            else:
                raise HTTPException(status_code=404, detail="Image not found in before images")
        else:  # after
            if execution.after_images and image_path in execution.after_images:
                execution.after_images.remove(image_path)
                flag_modified(execution, 'after_images')
            else:
                raise HTTPException(status_code=404, detail="Image not found in after images")
        
        await db.commit()
        
        # Optionally delete the physical file
        file_path = f"/app/uploads/{image_path}"
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {"message": "Image deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")   
    