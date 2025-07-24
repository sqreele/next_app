"""
File management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pathlib import Path
import os
from datetime import datetime
import mimetypes

from database import get_db
from models import User, UserRole, ImageType
from schemas import (
    PMFile as PMFileSchema, PMFileCreate, PMFileUpdate,
    PaginationParams
)
import crud
from crud import CRUDError
from routers.auth import get_current_active_user, require_role

router = APIRouter()

# File upload settings
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FILE_TYPES = {".jpg", ".jpeg", ".png", ".pdf", ".docx", ".xlsx", ".txt", ".mp4", ".mov"}

def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_FILE_TYPES)}"
        )

def create_unique_filename(original_filename: str) -> str:
    """Create unique filename with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    file_extension = Path(original_filename).suffix
    safe_name = Path(original_filename).stem[:50]  # Limit length
    return f"{timestamp}_{safe_name}{file_extension}"

@router.post("/upload", response_model=PMFileSchema)
async def upload_file(
    file: UploadFile = File(...),
    pm_execution_id: Optional[int] = Form(None),
    issue_id: Optional[int] = Form(None),
    inspection_id: Optional[int] = Form(None),
    image_type: Optional[ImageType] = Form(None),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a file"""
    try:
        # Validate file
        validate_file(file)
        
        # At least one relationship must be specified
        if not any([pm_execution_id, issue_id, inspection_id]):
            raise HTTPException(
                status_code=400, 
                detail="Must specify pm_execution_id, issue_id, or inspection_id"
            )
        
        # Verify related entities exist
        if pm_execution_id:
            execution = await crud.pm_execution.get(db, pm_execution_id)
            if not execution:
                raise HTTPException(status_code=404, detail="PM execution not found")
        
        if issue_id:
            issue = await crud.issue.get(db, issue_id)
            if not issue:
                raise HTTPException(status_code=404, detail="Issue not found")
        
        if inspection_id:
            inspection = await crud.inspection.get(db, inspection_id)
            if not inspection:
                raise HTTPException(status_code=404, detail="Inspection not found")
        
        # Create unique filename and save file
        unique_filename = create_unique_filename(file.filename)
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create database record
        file_data = PMFileCreate(
            pm_execution_id=pm_execution_id,
            issue_id=issue_id,
            inspection_id=inspection_id,
            file_name=file.filename,
            file_path=str(file_path),
            file_type=file.content_type or "application/octet-stream",
            image_type=image_type,
            description=description
        )
        
        db_file = await crud.pm_file.create(db, obj_in=file_data)
        return db_file
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if database operation fails
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/", response_model=List[PMFileSchema])
async def list_files(
    pagination: PaginationParams = Depends(),
    pm_execution_id: Optional[int] = None,
    issue_id: Optional[int] = None,
    inspection_id: Optional[int] = None,
    file_type: Optional[str] = None,
    image_type: Optional[ImageType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List files with filtering"""
    try:
        filters = {}
        if pm_execution_id:
            filters["pm_execution_id"] = pm_execution_id
        if issue_id:
            filters["issue_id"] = issue_id
        if inspection_id:
            filters["inspection_id"] = inspection_id
        if file_type:
            filters["file_type"] = file_type
        if image_type:
            filters["image_type"] = image_type
        
        files = await crud.pm_file.get_multi(
            db, 
            skip=pagination.offset, 
            limit=pagination.size,
            filters=filters,
            order_by="uploaded_at", order_direction="desc"
        )
        return files
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{file_id}", response_model=PMFileSchema)
async def get_file_info(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get file information"""
    try:
        file_obj = await crud.pm_file.get(db, file_id)
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        return file_obj
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Download file"""
    try:
        file_obj = await crud.pm_file.get(db, file_id)
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = Path(file_obj.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Physical file not found")
        
        # Determine media type
        media_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        
        return FileResponse(
            path=file_path,
            filename=file_obj.file_name,
            media_type=media_type
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.put("/{file_id}", response_model=PMFileSchema)
async def update_file_info(
    file_id: int,
    file_update: PMFileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update file information (metadata only)"""
    try:
        file_obj = await crud.pm_file.get(db, file_id)
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Only supervisor+ can update file metadata
        if current_user.role not in [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        updated_file = await crud.pm_file.update(db, db_obj=file_obj, obj_in=file_update)
        return updated_file
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Delete file (Supervisor+ only)"""
    try:
        file_obj = await crud.pm_file.get(db, file_id)
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete physical file
        file_path = Path(file_obj.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete database record
        await crud.pm_file.remove(db, id=file_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")

@router.get("/pm-execution/{execution_id}", response_model=List[PMFileSchema])
async def get_execution_files(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get files for a PM execution"""
    try:
        # Verify execution exists
        execution = await crud.pm_execution.get(db, execution_id)
        if not execution:
            raise HTTPException(status_code=404, detail="PM execution not found")
        
        files = await crud.pm_file.get_by_execution(db, execution_id=execution_id)
        return files
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/issue/{issue_id}", response_model=List[PMFileSchema])
async def get_issue_files(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get files for an issue"""
    try:
        # Verify issue exists
        issue = await crud.issue.get(db, issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        files = await crud.pm_file.get_by_issue(db, issue_id=issue_id)
        return files
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/inspection/{inspection_id}", response_model=List[PMFileSchema])
async def get_inspection_files(
    inspection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get files for an inspection"""
    try:
        # Verify inspection exists
        inspection = await crud.inspection.get(db, inspection_id)
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        files = await crud.pm_file.get_by_inspection(db, inspection_id=inspection_id)
        return files
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-upload", response_model=List[PMFileSchema])
async def bulk_upload_files(
    files: List[UploadFile] = File(...),
    pm_execution_id: Optional[int] = Form(None),
    issue_id: Optional[int] = Form(None),
    inspection_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk upload multiple files"""
    try:
        if len(files) > 10:  # Limit bulk uploads
            raise HTTPException(status_code=400, detail="Maximum 10 files per bulk upload")
        
        # At least one relationship must be specified
        if not any([pm_execution_id, issue_id, inspection_id]):
            raise HTTPException(
                status_code=400, 
                detail="Must specify pm_execution_id, issue_id, or inspection_id"
            )
        
        uploaded_files = []
        failed_files = []
        
        for file in files:
            try:
                validate_file(file)
                
                # Create unique filename and save file
                unique_filename = create_unique_filename(file.filename)
                file_path = UPLOAD_DIR / unique_filename
                
                # Save file to disk
                with open(file_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                # Create database record
                file_data = PMFileCreate(
                    pm_execution_id=pm_execution_id,
                    issue_id=issue_id,
                    inspection_id=inspection_id,
                    file_name=file.filename,
                    file_path=str(file_path),
                    file_type=file.content_type or "application/octet-stream"
                )
                
                db_file = await crud.pm_file.create(db, obj_in=file_data)
                uploaded_files.append(db_file)
                
            except Exception as e:
                failed_files.append({"filename": file.filename, "error": str(e)})
        
        if failed_files:
            # Return partial success with error details
            raise HTTPException(
                status_code=207,  # Multi-Status
                detail={
                    "uploaded": len(uploaded_files),
                    "failed": len(failed_files),
                    "errors": failed_files
                }
            )
        
        return uploaded_files
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk upload failed: {str(e)}")

@router.get("/storage/stats")
async def get_storage_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get storage statistics (Admin only)"""
    try:
        total_files = await crud.pm_file.count(db)
        
        # Calculate total storage used
        total_size = 0
        file_types = {}
        
        all_files = await crud.pm_file.get_multi(db, limit=10000)  # Adjust as needed
        
        for file_obj in all_files:
            file_path = Path(file_obj.file_path)
            if file_path.exists():
                size = file_path.stat().st_size
                total_size += size
                
                file_type = file_obj.file_type
                if file_type not in file_types:
                    file_types[file_type] = {"count": 0, "size": 0}
                file_types[file_type]["count"] += 1
                file_types[file_type]["size"] += size
        
        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_types": file_types,
            "upload_directory": str(UPLOAD_DIR.absolute())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage stats failed: {str(e)}")
