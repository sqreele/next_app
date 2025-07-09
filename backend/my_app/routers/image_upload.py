# routes/image_routes.py
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from ..utils.image_utils import save_uploaded_file, get_image_url

router = APIRouter()

@router.post("/api/v1/work_orders/upload_image")
async def upload_image(
    file: UploadFile = File(...),
    upload_type: str = Form("before"),
    category: str = Form("work_order")
):
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Save and resize the uploaded file
        relative_path = await save_uploaded_file(file, upload_type)
        
        # Get full URL
        full_url = await get_image_url(relative_path)
        
        return {
            "file_path": relative_path,
            "url": full_url,
            "message": "Image uploaded successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")
