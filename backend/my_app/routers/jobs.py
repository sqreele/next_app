"""
Jobs router for PM System API
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone

from database import get_db
from models import Job, JobStatus, User, Property, Topic, Room
from schemas import JobCreate, JobUpdate, JobResponse, JobListResponse
from routers.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[JobResponse])
async def get_jobs(
    property: Optional[str] = Query(None, description="Property ID filter"),
    status: Optional[JobStatus] = Query(None, description="Job status filter"),
    user_id: Optional[int] = Query(None, description="User ID filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all jobs with optional filters
    """
    from sqlalchemy import select
    
    query = select(Job)
    
    # Apply filters
    if property:
        # Try to find the property by name (treating property as property name/identifier)
        property_result = await db.execute(select(Property).where(Property.name == property))
        property_obj = property_result.scalar_one_or_none()
        if property_obj:
            query = query.where(Job.property_id == property_obj.id)
    
    if status:
        query = query.where(Job.status == status)
    
    if user_id:
        query = query.where(Job.user_id == user_id)
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    jobs = result.scalars().all()
    
    return jobs

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific job by ID
    """
    from sqlalchemy import select
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new job
    """
    from sqlalchemy import select
    
    # Validate property exists
    property_result = await db.execute(select(Property).where(Property.id == job_data.property_id))
    property = property_result.scalar_one_or_none()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Validate topic exists
    topic_result = await db.execute(select(Topic).where(Topic.id == job_data.topic_id))
    topic = topic_result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Validate room exists if provided
    if job_data.room_id:
        room_result = await db.execute(select(Room).where(Room.id == job_data.room_id))
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
    
    # Create job
    job = Job(
        user_id=current_user.id,
        property_id=job_data.property_id,
        topic_id=job_data.topic_id,
        room_id=job_data.room_id,
        title=job_data.title,
        description=job_data.description,
        status=JobStatus.PENDING
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return job

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a job
    """
    from sqlalchemy import select
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Update fields
    for field, value in job_data.dict(exclude_unset=True).items():
        setattr(job, field, value)
    
    job.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(job)
    
    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a job
    """
    from sqlalchemy import select
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await db.delete(job)
    await db.commit()
    
    return None

@router.patch("/{job_id}/status", response_model=JobResponse)
async def update_job_status(
    job_id: int,
    status: JobStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update job status
    """
    from sqlalchemy import select
    
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.status = status
    
    # Update timestamps based on status
    if status == JobStatus.IN_PROGRESS and not job.started_at:
        job.started_at = datetime.now(timezone.utc)
    elif status == JobStatus.COMPLETED and not job.completed_at:
        job.completed_at = datetime.now(timezone.utc)
    
    job.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(job)
    
    return job