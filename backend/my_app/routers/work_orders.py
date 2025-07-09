# ==============================================================================
# File: backend/my_app/routers/work_orders.py (Updated)
# Description: Async work order routes with proper image upload.
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from .. import crud, schemas, dependencies
from ..utils.image_utils import save_uploaded_file, get_image_url  # Add this import
import os
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
router = APIRouter(prefix="/work_orders", tags=["work_orders"])

@router.post("/", response_model=schemas.WorkOrder)
async def create_work_order(
    property_id: int, 
    work_order: schemas.WorkOrderCreate, 
    db: AsyncSession = Depends(dependencies.get_db)
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

@router.get("/{work_order_id}", response_model=schemas.WorkOrder)
async def read_work_order(
    work_order_id: int,
    db: AsyncSession = Depends(dependencies.get_db),
):
    work_order = await crud.get_work_order(db, work_order_id=work_order_id)
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")
    return work_order

@router.put("/{work_order_id}", response_model=schemas.WorkOrder)
async def update_work_order(
    work_order_id: int,
    work_order: schemas.WorkOrderCreate,
    db: AsyncSession = Depends(dependencies.get_db),
):
    updated_work_order = await crud.update_work_order(db, work_order_id=work_order_id, work_order=work_order)
    if updated_work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")
    return updated_work_order

@router.delete("/{work_order_id}")
async def delete_work_order(
    work_order_id: int,
    db: AsyncSession = Depends(dependencies.get_db),
):
    work_order = await crud.delete_work_order(db, work_order_id=work_order_id)
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")
    return {"message": "Work order deleted successfully"}

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    work_order_id: int = Form(...),
    db: AsyncSession = Depends(dependencies.get_db)
):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = os.path.join(upload_dir, file.filename)
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)
    # Create DB record
    file_record = schemas.WorkOrderFileCreate(
        file_path=file_location,
        file_name=file.filename,
        file_size=len(content),
        mime_type=file.content_type,
        upload_type="Image",  # or "Document", etc.
        uploaded_at=datetime.utcnow(),
        work_order_id=work_order_id
    )
    db_file = await crud.create_work_order_file(db, file_record)
    return {"filename": file.filename, "path": file_location, "db_id": db_file.id}

# Updated upload_image endpoint with proper processing
@router.post("/upload_image")
async def upload_image(
    file: UploadFile = File(...),
    upload_type: str = Form("before"),
    category: str = Form("work_order")
):
    try:
        print(f"📤 Received upload request: {file.filename}, type: {upload_type}")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Save and resize the uploaded file using the utility function
        relative_path = await save_uploaded_file(file, upload_type)
        
        # Get full URL
        full_url = await get_image_url(relative_path)
        
        print(f"✅ Upload successful: {relative_path}")
        
        return {
            "file_path": relative_path,
            "url": full_url,
            "message": "Image uploaded successfully"
        }
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")
