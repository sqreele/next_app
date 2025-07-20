# ==============================================================================
# File: backend/my_app/routers/work_orders.py
# Description: Async work order routes with enum support and image handling.
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from .. import crud, schemas, dependencies, models
from ..utils.image_utils import save_uploaded_file, get_image_url
from sqlalchemy.orm.exc import DetachedInstanceError
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime

router = APIRouter(prefix="/work_orders", tags=["work_orders"])

def safe_serialize_work_order(work_order) -> dict:
    """Safely serialize a work order object to avoid DetachedInstanceError"""
    try:
        return {
            "id": work_order.id,
            "description": work_order.description,
            "status": work_order.status.value if work_order.status else None,
            "priority": work_order.priority.value if work_order.priority else None,
            "due_date": work_order.due_date,
            "machine_id": work_order.machine_id,
            "room_id": work_order.room_id,
            "assigned_to_id": work_order.assigned_to_id,
            "property_id": work_order.property_id,
            "created_at": work_order.created_at,
            "completed_at": work_order.completed_at,
            "before_images": work_order.before_images or [],
            "after_images": work_order.after_images or [],
            "pdf_file_path": work_order.pdf_file_path,
            "type": work_order.type.value if work_order.type else None,
            "topic_id": work_order.topic_id,
            "procedure_id": work_order.procedure_id,
            "frequency": work_order.frequency.value if work_order.frequency else None,
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
            } if hasattr(work_order, 'topic') and work_order.topic else None,
            "procedure": {
                "id": work_order.procedure.id,
                "title": work_order.procedure.title
            } if hasattr(work_order, 'procedure') and work_order.procedure else None
        }
    except (DetachedInstanceError, AttributeError) as e:
        print(f"Error serializing work order {getattr(work_order, 'id', 'unknown')}: {e}")
        return {
            "id": getattr(work_order, 'id', None),
            "description": getattr(work_order, 'description', ''),
            "status": getattr(work_order, 'status', None),
            "priority": getattr(work_order, 'priority', None),
            "due_date": getattr(work_order, 'due_date', None),
            "machine_id": getattr(work_order, 'machine_id', None),
            "room_id": getattr(work_order, 'room_id', None),
            "assigned_to_id": getattr(work_order, 'assigned_to_id', None),
            "property_id": getattr(work_order, 'property_id', None),
            "created_at": getattr(work_order, 'created_at', None),
            "completed_at": getattr(work_order, 'completed_at', None),
            "before_images": getattr(work_order, 'before_images', []) or [],
            "after_images": getattr(work_order, 'after_images', []) or [],
            "pdf_file_path": getattr(work_order, 'pdf_file_path', None),
            "type": getattr(work_order, 'type', None),
            "topic_id": getattr(work_order, 'topic_id', None),
            "procedure_id": getattr(work_order, 'procedure_id', None),
            "frequency": getattr(work_order, 'frequency', None),
            "property": None,
            "room": None,
            "machine": None,
            "assigned_to": None,
            "topic": None,
            "procedure": None
        }

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

@router.post("/", response_model=schemas.WorkOrderWithRelations)
async def create_work_order(
    work_order: schemas.WorkOrderCreate,
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Create a new work order with validation"""
    try:
        # Validate machine_id and procedure_id for pm
        if work_order.type == models.WorkOrderType.PM:
            if work_order.machine_id and work_order.procedure_id:
                result = await db.execute(
                    select(models.machine_procedure_association).where(
                        models.machine_procedure_association.c.machine_id == work_order.machine_id,
                        models.machine_procedure_association.c.procedure_id == work_order.procedure_id
                    )
                )
                if not result.first():
                    raise HTTPException(status_code=400, detail="Invalid machine-procedure combination")
            if not work_order.machine_id or not work_order.procedure_id:
                raise HTTPException(status_code=400, detail="Machine and procedure required for PM work orders")
        elif work_order.type == models.WorkOrderType.ISSUE:
            if work_order.procedure_id or work_order.frequency:
                raise HTTPException(status_code=400, detail="Procedure and frequency not allowed for issue work orders")
        elif work_order.type == models.WorkOrderType.WORKORDER:
            if work_order.procedure_id or work_order.frequency or work_order.machine_id or work_order.priority:
                raise HTTPException(status_code=400, detail="Procedure, frequency, machine, and priority not allowed for workorder type")

        result = await crud.create_work_order(db=db, work_order=work_order)

        # Create ProcedureExecution for pm work orders
        if work_order.type == models.WorkOrderType.PM:
            execution = models.ProcedureExecution(
                procedure_id=work_order.procedure_id,
                work_order_id=result.id,
                machine_id=work_order.machine_id,
                scheduled_date=work_order.due_date or date.today(),
                status='Scheduled'
            )
            db.add(execution)
            await db.commit()

        serialized_wo = safe_serialize_work_order(result)
        return schemas.WorkOrderWithRelations(**serialized_wo)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create work order: {str(e)}")

@router.get("/simple", response_model=List[schemas.WorkOrder])
async def read_work_orders_simple(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(dependencies.get_db),
):
    """Get work orders without nested relationships"""
    try:
        work_orders = await crud.get_work_orders(db, skip=skip, limit=limit)

        simple_work_orders = []
        for wo in work_orders:
            simple_wo = schemas.WorkOrder(
                id=wo.id,
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
                before_images=wo.before_images or [],
                after_images=wo.after_images or [],
                pdf_file_path=wo.pdf_file_path,
                type=wo.type,
                topic_id=wo.topic_id,
                procedure_id=wo.procedure_id,
                frequency=wo.frequency
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
    """Get work orders with relationships"""
    try:
        work_orders = await crud.get_work_orders(db, skip=skip, limit=limit)

        result = []
        for wo in work_orders:
            try:
                serialized_wo = safe_serialize_work_order(wo)
                work_order_obj = schemas.WorkOrderWithRelations(**serialized_wo)
                result.append(work_order_obj)
            except Exception as e:
                print(f"Error processing work order {getattr(wo, 'id', 'unknown')}: {e}")
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
    """Get a single work order with relationships"""
    try:
        work_order = await crud.get_work_order(db, work_order_id=work_order_id)
        if work_order is None:
            raise HTTPException(status_code=404, detail="Work order not found")

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
    """Update a work order"""
    try:
        if work_order.type == models.WorkOrderType.PM:
            if work_order.machine_id and work_order.procedure_id:
                result = await db.execute(
                    select(models.machine_procedure_association).where(
                        models.machine_procedure_association.c.machine_id == work_order.machine_id,
                        models.machine_procedure_association.c.procedure_id == work_order.procedure_id
                    )
                )
                if not result.first():
                    raise HTTPException(status_code=400, detail="Invalid machine-procedure combination")
            if not work_order.machine_id or not work_order.procedure_id:
                raise HTTPException(status_code=400, detail="Machine and procedure required for PM work orders")
        elif work_order.type == models.WorkOrderType.ISSUE:
            if work_order.procedure_id or work_order.frequency:
                raise HTTPException(status_code=400, detail="Procedure and frequency not allowed for issue work orders")
        elif work_order.type == models.WorkOrderType.WORKORDER:
            if work_order.procedure_id or work_order.frequency or work_order.machine_id or work_order.priority:
                raise HTTPException(status_code=400, detail="Procedure, frequency, machine, and priority not allowed for workorder type")

        updated_work_order = await crud.update_work_order(db, work_order_id=work_order_id, work_order=work_order)
        if updated_work_order is None:
            raise HTTPException(status_code=404, detail="Work order not found")

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
    """Update work order with partial data"""
    try:
        updated_work_order = await crud.patch_work_order(db, work_order_id=work_order_id, work_order_update=work_order_update)
        if updated_work_order is None:
            raise HTTPException(status_code=404, detail="Work order not found")

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
    """Delete a work order"""
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

@router.post("/upload_image")
async def upload_image(
    file: UploadFile = File(...),
    work_order_id: int = Form(...),
    upload_type: str = Form("before"),
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Upload and process work order images"""
    try:
        print(f"📤 POST /work_orders/upload_image - Received: {file.filename}, type: {upload_type}")

        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        work_order = await db.get(models.WorkOrder, work_order_id)
        if not work_order:
            raise HTTPException(status_code=404, detail="Work order not found")

        relative_path = await save_uploaded_file(file, upload_type)
        full_url = await get_image_url(relative_path)

        if upload_type == "before":
            if not work_order.before_images:
                work_order.before_images = []
            work_order.before_images.append(relative_path)
            flag_modified(work_order, 'before_images')
        else:
            if not work_order.after_images:
                work_order.after_images = []
            work_order.after_images.append(relative_path)
            flag_modified(work_order, 'after_images')

        file_record = models.WorkOrderFile(
            file_path=relative_path,
            file_name=file.filename,
            file_size=file.size,
            mime_type=file.content_type,
            upload_type=upload_type,
            uploaded_at=datetime.utcnow(),
            work_order_id=work_order_id
        )
        db.add(file_record)

        await db.commit()
        await db.refresh(work_order)

        print(f"✅ Upload successful: {relative_path}")

        return {
            "file_path": relative_path,
            "url": full_url,
            "path": relative_path,
            "message": f"{upload_type.title()} image uploaded successfully",
            "work_order_id": work_order_id,
            "total_images": len(work_order.before_images if upload_type == "before" else work_order.after_images)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload")
async def upload_file_with_work_order(
    file: UploadFile = File(...),
    work_order_id: int = Form(...),
    upload_type: str = Form("before"),
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Upload file and associate with specific work order"""
    try:
        work_order = await db.get(models.WorkOrder, work_order_id)
        if not work_order:
            raise HTTPException(status_code=404, detail="Work order not found")

        relative_path = await save_uploaded_file(file, upload_type)
        full_url = await get_image_url(relative_path)

        if file.content_type.startswith('image/'):
            if upload_type == "before":
                if not work_order.before_images:
                    work_order.before_images = []
                work_order.before_images.append(relative_path)
                flag_modified(work_order, 'before_images')
            else:
                if not work_order.after_images:
                    work_order.after_images = []
                work_order.after_images.append(relative_path)
                flag_modified(work_order, 'after_images')

        file_record = models.WorkOrderFile(
            file_path=relative_path,
            file_name=file.filename,
            file_size=file.size,
            mime_type=file.content_type,
            upload_type=upload_type,
            uploaded_at=datetime.utcnow(),
            work_order_id=work_order_id
        )
        db.add(file_record)

        await db.commit()
        await db.refresh(work_order)

        return {
            "filename": file.filename,
            "path": relative_path,
            "url": full_url,
            "db_id": file_record.id,
            "message": f"{upload_type.title()} file uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in upload: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")