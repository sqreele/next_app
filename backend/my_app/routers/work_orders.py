# ==============================================================================
# File: backend/my_app/routers/work_orders.py (FIXED VERSION)
# Description: Async work order routes with proper serialization handling.
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from .. import crud, schemas, dependencies
from ..utils.image_utils import save_uploaded_file, get_image_url
from sqlalchemy.orm.exc import DetachedInstanceError
import os
from datetime import datetime

router = APIRouter(prefix="/work_orders", tags=["work_orders"])

# Safe serialization helper
def safe_serialize_work_order(work_order) -> dict:
    """Safely serialize a work order object to avoid DetachedInstanceError"""
    try:
        return {
            "id": work_order.id,
            "task": work_order.task,
            "description": work_order.description,
            "status": work_order.status,
            "priority": work_order.priority,
            "due_date": work_order.due_date,
            "machine_id": work_order.machine_id,
            "room_id": work_order.room_id,
            "assigned_to_id": work_order.assigned_to_id,
            "property_id": work_order.property_id,
            "created_at": work_order.created_at,
            "completed_at": work_order.completed_at,
            "before_image_path": work_order.before_image_path,
            "after_image_path": work_order.after_image_path,
            "before_images": work_order.before_images or [],
            "after_images": work_order.after_images or [],
            "pdf_file_path": work_order.pdf_file_path,
            "type": work_order.type,
            "topic_id": work_order.topic_id,
            "frequency": getattr(work_order, 'frequency', None),
            
            # Safe relationship access
            "property": {
                "id": work_order.property.id,
                "name": work_order.property.name
            } if hasattr(work_order, 'property') and work_order.property else None,
            
            "room": {
                "id": work_order.room.id,
                "name": work_order.room.name,
                "number": getattr(work_order.room, 'number', None),
                "room_type": getattr(work_order.room, 'room_type', None),
                "is_active": getattr(work_order.room, 'is_active', True),
                "property_id": work_order.room.property_id
            } if hasattr(work_order, 'room') and work_order.room else None,
            
            "machine": {
                "id": work_order.machine.id,
                "name": work_order.machine.name,
                "status": work_order.machine.status,
                "property_id": work_order.machine.property_id,
                "room_id": getattr(work_order.machine, 'room_id', None)
            } if hasattr(work_order, 'machine') and work_order.machine else None,
            
            "assigned_to": {
                "id": work_order.assigned_to.id,
                "username": work_order.assigned_to.username,
                "email": work_order.assigned_to.email,
                "is_active": work_order.assigned_to.is_active
            } if hasattr(work_order, 'assigned_to') and work_order.assigned_to else None,
            
            "topic": {
                "id": work_order.topic.id,
                "title": work_order.topic.title
            } if hasattr(work_order, 'topic') and work_order.topic else None
        }
    except (DetachedInstanceError, AttributeError) as e:
        print(f"Error serializing work order {getattr(work_order, 'id', 'unknown')}: {e}")
        # Return minimal work order data if relationships fail
        return {
            "id": getattr(work_order, 'id', None),
            "task": getattr(work_order, 'task', ''),
            "description": getattr(work_order, 'description', ''),
            "status": getattr(work_order, 'status', 'Unknown'),
            "priority": getattr(work_order, 'priority', 'Medium'),
            "due_date": getattr(work_order, 'due_date', None),
            "machine_id": getattr(work_order, 'machine_id', None),
            "room_id": getattr(work_order, 'room_id', None),
            "assigned_to_id": getattr(work_order, 'assigned_to_id', None),
            "property_id": getattr(work_order, 'property_id', None),
            "created_at": getattr(work_order, 'created_at', None),
            "completed_at": getattr(work_order, 'completed_at', None),
            "before_image_path": getattr(work_order, 'before_image_path', None),
            "after_image_path": getattr(work_order, 'after_image_path', None),
            "before_images": getattr(work_order, 'before_images', []) or [],
            "after_images": getattr(work_order, 'after_images', []) or [],
            "pdf_file_path": getattr(work_order, 'pdf_file_path', None),
            "type": getattr(work_order, 'type', 'pm'),
            "topic_id": getattr(work_order, 'topic_id', None),
            "frequency": getattr(work_order, 'frequency', None),
            "property": None,
            "room": None,
            "machine": None,
            "assigned_to": None,
            "topic": None
        }

# Debug endpoint to check available routes (moved to top to avoid conflicts)
@router.get("/debug")
async def debug_routes():
    return {
        "message": "Work orders router is working",
        "available_endpoints": [
            "GET /api/v1/work_orders/",
            "GET /api/v1/work_orders/simple",
            "POST /api/v1/work_orders/",
            "GET /api/v1/work_orders/{id}",
            "PUT /api/v1/work_orders/{id}",
            "PATCH /api/v1/work_orders/{id}",
            "DELETE /api/v1/work_orders/{id}",
            "POST /api/v1/work_orders/upload_image",
            "POST /api/v1/work_orders/upload",
            "GET /api/v1/work_orders/debug"
        ]
    }

@router.post("/", response_model=schemas.WorkOrder)
async def create_work_order(
    work_order: schemas.WorkOrderCreate,
    db: AsyncSession = Depends(dependencies.get_db)
):
    try:
        result = await crud.create_work_order(db=db, work_order=work_order)
        return result
    except Exception as e:
        print(f"Error creating work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create work order: {str(e)}")

@router.get("/simple", response_model=List[schemas.WorkOrder])
async def read_work_orders_simple(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Get work orders without nested relationships (safer endpoint)"""
    try:
        work_orders = await crud.get_work_orders(db, skip=skip, limit=limit)
        
        # Convert to simple work order format without relationships
        simple_work_orders = []
        for wo in work_orders:
            simple_wo = schemas.WorkOrder(
                id=wo.id,
                task=wo.task,
                description=wo.description,
                status=wo.status,
                priority=wo.priority,
                due_date=wo.due_date,
                machine_id=wo.machine_id,
                room_id=wo.room_id,
                assigned_to_id=wo.assigned_to_id,
                property_id=wo.property_id,
                created_at=wo.created_at,
                completed_at=wo.completed_at,
                before_image_path=wo.before_image_path,
                after_image_path=wo.after_image_path,
                before_images=wo.before_images or [],
                after_images=wo.after_images or [],
                pdf_file_path=wo.pdf_file_path,
                type=wo.type,
                topic_id=wo.topic_id,
                frequency=getattr(wo, 'frequency', None)
            )
            simple_work_orders.append(simple_wo)
            
        return simple_work_orders
        
    except Exception as e:
        print(f"Error in read_work_orders_simple: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch work orders: {str(e)}")

@router.get("/", response_model=List[schemas.WorkOrderWithRelations])
async def read_work_orders(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Get work orders with relationships - FIXED VERSION"""
    try:
        work_orders = await crud.get_work_orders(db, skip=skip, limit=limit)
        
        # Manually serialize each work order to avoid DetachedInstanceError
        result = []
        for wo in work_orders:
            try:
                serialized_wo = safe_serialize_work_order(wo)
                work_order_obj = schemas.WorkOrderWithRelations(**serialized_wo)
                result.append(work_order_obj)
            except Exception as e:
                print(f"Error processing work order {getattr(wo, 'id', 'unknown')}: {e}")
                # Skip problematic work orders
                continue
        
        return result
        
    except Exception as e:
        print(f"Error in read_work_orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch work orders: {str(e)}")

@router.get("/{work_order_id}", response_model=schemas.WorkOrderWithRelations)
async def read_work_order(
    work_order_id: int,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Get a single work order with relationships - FIXED VERSION"""
    try:
        work_order = await crud.get_work_order(db, work_order_id=work_order_id)
        if work_order is None:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        # Safely serialize the work order
        serialized_wo = safe_serialize_work_order(work_order)
        return schemas.WorkOrderWithRelations(**serialized_wo)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in read_work_order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch work order: {str(e)}")

@router.put("/{work_order_id}", response_model=schemas.WorkOrderWithRelations)
async def update_work_order(
    work_order_id: int,
    work_order: schemas.WorkOrderCreate,
    db: AsyncSession = Depends(dependencies.get_db),
):
    try:
        updated_work_order = await crud.update_work_order(db, work_order_id=work_order_id, work_order=work_order)
        if updated_work_order is None:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        # Safely serialize the updated work order
        serialized_wo = safe_serialize_work_order(updated_work_order)
        return schemas.WorkOrderWithRelations(**serialized_wo)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update work order: {str(e)}")

@router.patch("/{work_order_id}", response_model=schemas.WorkOrderWithRelations)
async def patch_work_order(
    work_order_id: int,
    work_order_update: schemas.WorkOrderUpdate,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Update work order with partial data (PATCH method) - FIXED VERSION"""
    try:
        updated_work_order = await crud.patch_work_order(db, work_order_id=work_order_id, work_order_update=work_order_update)
        if updated_work_order is None:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        # Safely serialize the updated work order
        serialized_wo = safe_serialize_work_order(updated_work_order)
        return schemas.WorkOrderWithRelations(**serialized_wo)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error patching work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update work order: {str(e)}")

@router.delete("/{work_order_id}")
async def delete_work_order(
    work_order_id: int,
    db: AsyncSession = Depends(dependencies.get_db),
):
    try:
        work_order = await crud.delete_work_order(db, work_order_id=work_order_id)
        if work_order is None:
            raise HTTPException(status_code=404, detail="Work order not found")
        return {"message": "Work order deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete work order: {str(e)}")

# MAIN IMAGE UPLOAD ENDPOINT - This is what your frontend calls
@router.post("/upload_image")
async def upload_image(
    file: UploadFile = File(...),
    upload_type: str = Form("before"),
    category: str = Form("work_order")
):
    """Upload and process work order images"""
    try:
        print(f"📤 POST /upload_image - Received: {file.filename}, type: {upload_type}")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Save and resize the uploaded file
        relative_path = await save_uploaded_file(file, upload_type)
        
        # Get full URL
        full_url = await get_image_url(relative_path)
        
        print(f"✅ Upload successful: {relative_path}")
        
        return {
            "file_path": relative_path,
            "url": full_url,
            "path": relative_path,
            "message": "Image uploaded successfully"
        }
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Alternative file upload with work order ID (keep for compatibility)
@router.post("/upload")
async def upload_file_with_work_order(
    file: UploadFile = File(...),
    work_order_id: int = Form(...),
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Upload file and associate with specific work order"""
    try:
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
            upload_type="Image",
            uploaded_at=datetime.utcnow(),
            work_order_id=work_order_id
        )
        db_file = await crud.create_work_order_file(db, file_record)
        return {"filename": file.filename, "path": file_location, "db_id": db_file.id}
    except Exception as e:
        print(f"Error in upload: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
