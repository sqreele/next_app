"""
API routes for Job management with many-to-many relationships
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user, check_admin_access
from models import User, JobStatus
from schemas import Job, JobCreate, JobUpdate
import crud

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/", response_model=Job, status_code=status.HTTP_201_CREATED)
async def create_job(
    *,
    db: AsyncSession = Depends(get_db),
    job_in: JobCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new job with many-to-many relationships.
    """
    try:
        job_data = job_in.model_dump()
        job = await crud.create_job(db=db, job_in=job_data)
        return job
    except crud.CRUDError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job"
        )

@router.get("/", response_model=List[Job])
async def get_jobs(
    *,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of jobs to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of jobs to return"),
    status: Optional[JobStatus] = Query(None, description="Filter by job status"),
    user_id: Optional[int] = Query(None, description="Filter by assigned user ID"),
    topic_id: Optional[int] = Query(None, description="Filter by topic ID"),
    room_id: Optional[int] = Query(None, description="Filter by room ID"),
    property_id: Optional[int] = Query(None, description="Filter by property ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get jobs with optional filtering and pagination.
    """
    try:
        jobs = await crud.get_jobs(
            db=db,
            skip=skip,
            limit=limit,
            status=status,
            user_id=user_id,
            topic_id=topic_id,
            room_id=room_id,
            property_id=property_id
        )
        return jobs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve jobs"
        )

@router.get("/{job_id}", response_model=Job)
async def get_job(
    *,
    db: AsyncSession = Depends(get_db),
    job_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific job by ID with all relationships.
    """
    job = await crud.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    return job

@router.put("/{job_id}", response_model=Job)
async def update_job(
    *,
    db: AsyncSession = Depends(get_db),
    job_id: int,
    job_in: JobUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a job with many-to-many relationships.
    """
    # Check if job exists
    existing_job = await crud.get_job(db=db, job_id=job_id)
    if not existing_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    try:
        # Only include non-None values in the update
        job_data = job_in.model_dump(exclude_unset=True)
        job = await crud.update_job(db=db, job_id=job_id, job_in=job_data)
        return job
    except crud.CRUDError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update job"
        )

@router.delete("/{job_id}")
async def delete_job(
    *,
    db: AsyncSession = Depends(get_db),
    job_id: int,
    current_user: User = Depends(check_admin_access)
):
    """
    Delete a job. Requires admin access.
    """
    job = await crud.get_job(db=db, job_id=job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    try:
        await crud.delete_job(db=db, job_id=job_id)
        return {"message": "Job deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete job"
        )

@router.get("/status/{status}", response_model=List[Job])
async def get_jobs_by_status(
    *,
    db: AsyncSession = Depends(get_db),
    status: JobStatus,
    current_user: User = Depends(get_current_user)
):
    """
    Get all jobs with a specific status.
    """
    try:
        jobs = await crud.get_jobs_by_status(db=db, status=status)
        return jobs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve jobs by status"
        )

@router.get("/user/{user_id}", response_model=List[Job])
async def get_jobs_by_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Get all jobs assigned to a specific user.
    """
    try:
        jobs = await crud.get_jobs_by_user(db=db, user_id=user_id)
        return jobs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve jobs by user"
        )

@router.get("/my-jobs/", response_model=List[Job])
async def get_my_jobs(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all jobs assigned to the current user.
    """
    try:
        jobs = await crud.get_jobs_by_user(db=db, user_id=current_user.id)
        return jobs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve your jobs"
        )

@router.patch("/{job_id}/status", response_model=Job)
async def update_job_status(
    *,
    db: AsyncSession = Depends(get_db),
    job_id: int,
    status: JobStatus,
    current_user: User = Depends(get_current_user)
):
    """
    Update only the status of a job.
    """
    # Check if job exists
    existing_job = await crud.get_job(db=db, job_id=job_id)
    if not existing_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    try:
        job = await crud.update_job(db=db, job_id=job_id, job_in={"status": status})
        return job
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update job status"
        )