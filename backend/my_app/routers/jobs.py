"""
Job management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
import os
import uuid

from database import get_db
from models import User, UserRole, JobStatus
from schemas import (
    Job as JobSchema, JobCreate, JobUpdate, JobSummary, JobStats, JobActivity,
    PaginationParams
)
import crud
from crud import CRUDError
from routers.auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=JobSchema, status_code=status.HTTP_201_CREATED)
async def create_job(
    job: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new job"""
    try:
        # Verify user exists
        user = await crud.user.get(db, job.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify room exists if specified
        if job.room_id:
            room = await crud.room.get(db, job.room_id)
            if not room:
                raise HTTPException(status_code=404, detail="Room not found")
        
        # Create job with current timestamp
        job_data = job.model_dump()
        job_data["created_at"] = datetime.now()
        job_data["updated_at"] = datetime.now()
        
        db_job = await crud.job.create(db, obj_in=job_data)
        return await crud.job.get_with_relations(db, db_job.id)
    
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")


@router.get("/", response_model=List[JobSchema])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[JobStatus] = Query(None),
    user_id: Optional[int] = Query(None),
    room_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List jobs with optional filters"""
    try:
        filters = {}
        if status:
            filters["status"] = status
        if user_id:
            filters["user_id"] = user_id
        if room_id:
            filters["room_id"] = room_id
        
        jobs = await crud.job.get_multi(
            db, 
            skip=skip, 
            limit=limit, 
            filters=filters,
            order_by="created_at",
            order_direction="desc"
        )
        return jobs
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs: {str(e)}")


@router.get("/{job_id}", response_model=JobSchema)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific job by ID"""
    job = await crud.job.get_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/{job_id}", response_model=JobSchema)
async def update_job(
    job_id: int,
    job_update: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a job"""
    try:
        # Check if job exists
        existing_job = await crud.job.get(db, job_id)
        if not existing_job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Verify room exists if specified in update
        if job_update.room_id:
            room = await crud.room.get(db, job_update.room_id)
            if not room:
                raise HTTPException(status_code=404, detail="Room not found")
        
        # Update job
        update_data = job_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now()
        
        updated_job = await crud.job.update(db, db_obj=existing_job, obj_in=update_data)
        return await crud.job.get_with_relations(db, updated_job.id)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update job: {str(e)}")


@router.patch("/{job_id}/status", response_model=JobSchema)
async def update_job_status(
    job_id: int,
    status: JobStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update job status"""
    try:
        updated_job = await crud.job.update_status(db, job_id=job_id, status=status)
        if not updated_job:
            raise HTTPException(status_code=404, detail="Job not found")
        return await crud.job.get_with_relations(db, updated_job.id)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update job status: {str(e)}")


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]))
):
    """Delete a job (requires supervisor role or higher)"""
    job = await crud.job.get(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    try:
        await crud.job.remove(db, id=job_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")


@router.get("/status/{status}", response_model=List[JobSchema])
async def get_jobs_by_status(
    status: JobStatus,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get jobs by status"""
    try:
        jobs = await crud.job.get_by_status(db, status=status, limit=limit)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs by status: {str(e)}")


@router.get("/user/{user_id}", response_model=List[JobSchema])
async def get_jobs_by_user(
    user_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get jobs for a specific user"""
    try:
        # Verify user exists
        user = await crud.user.get(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        jobs = await crud.job.get_by_user(db, user_id=user_id, limit=limit)
        return jobs
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs for user: {str(e)}")


@router.get("/room/{room_id}", response_model=List[JobSchema])
async def get_jobs_by_room(
    room_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get jobs for a specific room"""
    try:
        # Verify room exists
        room = await crud.room.get(db, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        jobs = await crud.job.get_by_room(db, room_id=room_id, limit=limit)
        return jobs
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs for room: {str(e)}")


@router.post("/{job_id}/images/before", response_model=JobSchema)
async def upload_before_image(
    job_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload before image for a job"""
    # Check if job exists
    job = await crud.job.get(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads/jobs/before"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update job with before image path
        update_data = {"before_image": file_path, "updated_at": datetime.now()}
        updated_job = await crud.job.update(db, db_obj=job, obj_in=update_data)
        
        return await crud.job.get_with_relations(db, updated_job.id)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.post("/{job_id}/images/after", response_model=JobSchema)
async def upload_after_image(
    job_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload after image for a job"""
    # Check if job exists
    job = await crud.job.get(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads/jobs/after"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update job with after image path
        update_data = {"after_image": file_path, "updated_at": datetime.now()}
        updated_job = await crud.job.update(db, db_obj=job, obj_in=update_data)
        
        return await crud.job.get_with_relations(db, updated_job.id)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.get("/stats/summary", response_model=JobStats)
async def get_job_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get job statistics"""
    try:
        from sqlalchemy import func, and_
        from datetime import date
        
        # Get counts by status
        total_jobs = await crud.job.count_all(db)
        pending_jobs = len(await crud.job.get_by_status(db, status=JobStatus.PENDING, limit=1000))
        in_progress_jobs = len(await crud.job.get_by_status(db, status=JobStatus.IN_PROGRESS, limit=1000))
        completed_jobs = len(await crud.job.get_by_status(db, status=JobStatus.COMPLETED, limit=1000))
        cancelled_jobs = len(await crud.job.get_by_status(db, status=JobStatus.CANCELLED, limit=1000))
        
        # Get jobs completed today
        today = date.today()
        jobs_today = await crud.job.get_multi(
            db, 
            filters={"status": JobStatus.COMPLETED}, 
            limit=1000
        )
        jobs_completed_today = len([j for j in jobs_today if j.completed_at and j.completed_at.date() == today])
        
        return JobStats(
            total_jobs=total_jobs,
            pending_jobs=pending_jobs,
            in_progress_jobs=in_progress_jobs,
            completed_jobs=completed_jobs,
            cancelled_jobs=cancelled_jobs,
            jobs_completed_today=jobs_completed_today,
            average_completion_time_hours=None  # Can be calculated if needed
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job stats: {str(e)}")