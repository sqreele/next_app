from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..utils.image_utils import image_converter

router = APIRouter()

class ImageUploadRequest(BaseModel):
    base64_image: str

@router.post("/upload_base64_image")
async def upload_base64_image(payload: ImageUploadRequest):
    try:
        img_url = await image_converter(payload.base64_image)
        return {"url": img_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))