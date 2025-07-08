# utils/image_utils.py
import uuid
import base64
import aiofiles
import os
from pathlib import Path

async def image_converter(hax_value: str, upload_type: str = "workorder") -> str:
    """Convert base64 image to file and return the file path"""
    random_name = f"{uuid.uuid4()}.jpg"
    
    # Use the same uploads directory that admin uses
    upload_dir = Path("uploads") / upload_type
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / random_name
    
    async with aiofiles.open(file_path, 'wb') as decodeit:
        await decodeit.write(base64.b64decode(hax_value))
    
    # Return relative path for database storage
    relative_path = f"{upload_type}/{random_name}"
    return relative_path

async def get_image_url(file_path: str, base_url: str = "http://localhost:8000") -> str:
    """Convert stored file path to full URL"""
    return f"{base_url}/uploads/{file_path}"