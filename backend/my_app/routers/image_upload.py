# ==============================================================================
# File: backend/my_app/routers/image_upload.py
# Description: Image upload routes for work orders with database integration.
# ==============================================================================
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from .. import models, schemas, dependencies
from ..utils.image_utils import save_uploaded_file, get_image_url
from datetime import datetime
from sqlalchemy.orm.attributes import flag_modified

router = APIRouter()

@router.post("/work_orders/upload_image")
async def upload_work_order_image(
    file: UploadFile = File(...),
    work_order_id: int = Form(...),
    upload_type: str = Form("before"),
    db: AsyncSession = Depends(dependencies.get_db)
):
    """Upload image for a work order and update JSONB fields"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Verify work order exists
        work_order = await db.get(models.WorkOrder, work_order_id)
        if not work_order:
            raise HTTPException(status_code=404, detail="Work order not found")

        # Save and resize the uploaded file
        relative_path = await save_uploaded_file(file, upload_type)

        # Get full URL
        full_url = await get_image_url(relative_path)

        # Update WorkOrder JSONB fields
        if upload_type == "before":
            if not work_order.before_images:
                work_order.before_images = []
            work_order.before_images.append(relative_path)
            flag_modified(work_order, 'before_images')
        else:  # after
            if not work_order.after_images:
                work_order.after_images = []
            work_order.after_images.append(relative_path)
            flag_modified(work_order, 'after_images')

        # Create WorkOrderFile record
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
            "file_path": relative_path,
            "url": full_url,
            "message": f"{upload_type.title()} image uploaded successfully",
            "work_order_id": work_order_id,
            "total_images": len(work_order.before_images if upload_type == "before" else work_order.after_images)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")