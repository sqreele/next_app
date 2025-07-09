from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Tuple
from ..utils.image_utils import image_converter, get_image_url

router = APIRouter()

class ImageUploadRequest(BaseModel):
    base64_image: str
    max_width: Optional[int] = 1920
    max_height: Optional[int] = 1080
    quality: Optional[int] = 85

@router.post("/upload_base64_image")
async def upload_base64_image(payload: ImageUploadRequest):
    try:
        # Set resize parameters
        max_size = (payload.max_width, payload.max_height) if payload.max_width and payload.max_height else None
        
        # Convert and resize image
        relative_path = await image_converter(
            payload.base64_image,
            max_size=max_size,
            quality=payload.quality
        )
        
        # Get full URL
        full_url = await get_image_url(relative_path)
        
        return {"url": full_url, "path": relative_path}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")
