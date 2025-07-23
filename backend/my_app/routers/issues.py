"""
Issue management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, UserRole, IssueStatus, IssuePriority
from schema import (
    Issue as IssueSchema, IssueCreate, IssueUpdate,
    PaginationParams
)
import crud
from crud import CRUDError
from .auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=IssueSchema, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue: IssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new issue"""
    try:
        # Verify machine exists
        machine = await crud.machine.get(db, issue.machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Verify room exists if specified
        if issue.room_id:
            room = await crud.room.get(db, issue.room_id)
            if not room:
                raise HTTPException(status_code=404, detail="Room not found")
        
        # Verify reporter exists
        reporter = await crud.user.get(db, issue.reported_by_id)
        if not reporter:
            raise HTTPException(status_code=404, detail="Reporter not found")
        
        # Verify assignee exists if specified
        if issue.assigned_to_id:
            assignee = await crud.user.get(db, issue.assigned_to_id)
            if not assignee:
                raise HTTPException(status_code=404, detail="Assignee not found")
        
        return await crud.issue.create(db, obj_in=issue)
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[IssueSchema])
async def list_issues(
    pagination: PaginationParams = Depends(),
    status_filter: Optional[IssueStatus] = None,
    priority: Optional[IssuePriority] = None,
    machine_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    reported_by_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List issues with filtering"""
    try:
        if search:
            issues = await crud.issue.search_issues(db, search_term=search, limit=pagination.size)
        else:
            filters = {}
            if status_filter:
                filters["status"] = status_filter
            if priority:
                filters["priority"] = priority
            if machine_id:
                filters["machine_id"] = machine_id
            if assigned_to_id:
                filters["assigned_to_id"] = assigned_to_id
            if reported_by_id:
                filters["reported_by_id"] = reported_by_id
            
            issues = await crud.issue.get_multi(
                db, 
                skip=pagination.offset, 
                limit=pagination.size,
                filters=filters,
                order_by="reported_at", order_direction="desc"
            )
        return issues
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{issue_id}", response_model=IssueSchema)
async def get_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get issue by ID"""
    try:
        issue = await crud.issue.get_with_relations(db, issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        return issue
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{issue_id}", response_model=IssueSchema)
async def update_issue(
    issue_id: int,
    issue_update: IssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update issue"""
    try:
        issue = await crud.issue.get(db, issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Check permissions - reporter, assignee, or supervisor+ can update
        can_update = (
            issue.reported_by_id == current_user.id or
            issue.assigned_to_id == current_user.id or
            current_user.role in [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]
        )
        
        if not can_update:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Verify assignee exists if being updated
        if issue_update.assigned_to_id:
            assignee = await cr
