"""
Issue management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, UserRole, IssueStatus, IssuePriority
from schemas import (
    Issue as IssueSchema, IssueCreate, IssueUpdate,
    PaginationParams
)
import crud
from crud import CRUDError
from routers.auth import get_current_active_user, require_role

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
            assignee = await crud.user.get(db, issue_update.assigned_to_id)
            if not assignee:
                raise HTTPException(status_code=404, detail="Assignee not found")
        
        # Handle status changes that require resolved_at
        if (issue_update.status in [IssueStatus.RESOLVED, IssueStatus.CLOSED] and 
            not issue.resolved_at):
            issue_update.resolved_at = datetime.now()
        
        updated_issue = await crud.issue.update(db, db_obj=issue, obj_in=issue_update)
        return updated_issue
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Delete issue (Manager+ only)"""
    try:
        issue = await crud.issue.get(db, issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        await crud.issue.remove(db, id=issue_id)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{issue_id}/assign", response_model=IssueSchema)
async def assign_issue(
    issue_id: int,
    assignee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Assign an issue to a user (Supervisor+ only)"""
    try:
        # Verify assignee exists
        assignee = await crud.user.get(db, assignee_id)
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")
        
        issue = await crud.issue.assign_issue(db, issue_id=issue_id, assignee_id=assignee_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        return issue
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{issue_id}/resolve", response_model=IssueSchema)
async def resolve_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark an issue as resolved"""
    try:
        issue = await crud.issue.get(db, issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Only assignee or supervisor+ can resolve
        can_resolve = (
            issue.assigned_to_id == current_user.id or
            current_user.role in [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]
        )
        
        if not can_resolve:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        resolved_issue = await crud.issue.resolve_issue(db, issue_id=issue_id)
        if not resolved_issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        return resolved_issue
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/critical", response_model=List[IssueSchema])
async def get_critical_issues(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get critical priority issues"""
    try:
        issues = await crud.issue.get_critical_issues(db, limit=limit)
        return issues
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/open", response_model=List[IssueSchema])
async def get_open_issues(
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all open issues"""
    try:
        issues = await crud.issue.get_open_issues(db, limit=limit)
        return issues
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-issues", response_model=List[IssueSchema])
async def get_my_issues(
    pagination: PaginationParams = Depends(),
    status_filter: Optional[IssueStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get issues assigned to current user"""
    try:
        filters = {"assigned_to_id": current_user.id}
        if status_filter:
            filters["status"] = status_filter
        
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

@router.get("/reported-by-me", response_model=List[IssueSchema])
async def get_my_reported_issues(
    pagination: PaginationParams = Depends(),
    status_filter: Optional[IssueStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get issues reported by current user"""
    try:
        filters = {"reported_by_id": current_user.id}
        if status_filter:
            filters["status"] = status_filter
        
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

@router.put("/{issue_id}/priority", response_model=IssueSchema)
async def update_issue_priority(
    issue_id: int,
    priority: IssuePriority,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Update issue priority (Supervisor+ only)"""
    try:
        issue = await crud.issue.get(db, issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        issue_update = IssueUpdate(priority=priority)
        updated_issue = await crud.issue.update(db, db_obj=issue, obj_in=issue_update)
        return updated_issue
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
