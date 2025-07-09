import uuid
import asyncio
from pathlib import Path
from PIL import Image
from io import BytesIO
from typing import Tuple, Optional
from fastapi import UploadFile

async def save_uploaded_file(
    file: UploadFile, 
    upload_type: str = "workorder",
    max_size: Optional[Tuple[int, int]] = (1920, 1080),
    quality: int = 85
) -> str:
    """Save uploaded file, resize it, and return the file path"""
    
    # Generate random filename
    file_extension = file.filename.split('.')[-1].lower() if file.filename else 'jpg'
    random_name = f"{uuid.uuid4()}.{file_extension}"
    
    upload_dir = Path("uploads") / upload_type
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / random_name
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Process image in a separate thread
        processed_bytes = await asyncio.to_thread(
            _resize_image, file_content, max_size, quality
        )
        
        # Save the processed image
        with open(file_path, 'wb') as f:
            f.write(processed_bytes)
        
    except Exception as e:
        # Clean up partial file if write failed
        if file_path.exists():
            file_path.unlink()
        raise e
    
    # Return relative path for database storage
    relative_path = f"{upload_type}/{random_name}"
    return relative_path

def _resize_image(image_bytes: bytes, max_size: Tuple[int, int], quality: int) -> bytes:
    """Resize image while maintaining aspect ratio"""
    
    # Open image from bytes
    img = Image.open(BytesIO(image_bytes))
    
    # Convert to RGB if necessary
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Calculate new size maintaining aspect ratio
    if max_size:
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # Save to bytes with specified quality
    output_buffer = BytesIO()
    img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
    
    return output_buffer.getvalue()

async def get_image_url(file_path: str, base_url: str = "http://localhost:8000") -> str:
    """Convert stored file path to full URL"""
    return f"{base_url}/uploads/{file_path}"
