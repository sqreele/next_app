
"""
Inspection management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from database import get_db
from models import User, UserRole, InspectionResult
from schemas import (
    Inspection as InspectionSchema, InspectionCreate, InspectionUpdate,
    PaginationParams
)
import crud
from crud import CRUDError
from .auth import get_current_active_user, require_role

router = APIRouter()

@router.post("/", response_model=InspectionSchema, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    inspection: InspectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new inspection"""
    try:
        # Verify machine exists
        machine = await crud.machine.get(db, inspection.machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Verify inspector exists
        inspector = await crud.user.get(db, inspection.inspector_id)
        if not inspector:
            raise HTTPException(status_code=404, detail="Inspector not found")
        
        # Verify procedure exists if specified
        if inspection.procedure_id:
            procedure = await crud.procedure.get(db, inspection.procedure_id)
            if not procedure:
                raise HTTPException(status_code=404, detail="Procedure not found")
        
        # Only technicians+ can create inspections
        if current_user.role not in [UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        return await crud.inspection.create(db, obj_in=inspection)
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[InspectionSchema])
async def list_inspections(
    pagination: PaginationParams = Depends(),
    machine_id: Optional[int] = None,
    inspector_id: Optional[int] = None,
    result: Optional[InspectionResult] = None,
    days: int = Query(30, ge=1, le=365),
    failed_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List inspections with filtering"""
    try:
        if machine_id:
            inspections = await crud.inspection.get_by_machine(
                db, machine_id=machine_id, limit=pagination.size
            )
        elif failed_only or result in [InspectionResult.FAIL, InspectionResult.NEEDS_ATTENTION]:
            inspections = await crud.inspection.get_failed_inspections(db, limit=pagination.size)
        else:
            if inspector_id or result or days != 30:
                # Use recent inspections with custom filtering
                inspections = await crud.inspection.get_recent_inspections(
                    db, days=days, limit=pagination.size
                )
                # Additional filtering would need to be implemented in CRUD
            else:
                filters = {}
                if inspector_id:
                    filters["inspector_id"] = inspector_id
                if result:
                    filters["result"] = result
                
                inspections = await crud.inspection.get_multi(
                    db, 
                    skip=pagination.offset, 
                    limit=pagination.size,
                    filters=filters,
                    order_by="inspection_date", order_direction="desc"
                )
        
        return inspections
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{inspection_id}", response_model=InspectionSchema)
async def get_inspection(
    inspection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get inspection by ID"""
    try:
        inspection = await crud.inspection.get_with_relations(db, inspection_id)
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        return inspection
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{inspection_id}", response_model=InspectionSchema)
async def update_inspection(
    inspection_id: int,
    inspection_update: InspectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update inspection"""
    try:
        inspection = await crud.inspection.get(db, inspection_id)
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        # Only the inspector or supervisor+ can update
        can_update = (
            inspection.inspector_id == current_user.id or
            current_user.role in [UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN]
        )
        
        if not can_update:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Verify procedure exists if being updated
        if inspection_update.procedure_id:
            procedure = await crud.procedure.get(db, inspection_update.procedure_id)
            if not procedure:
                raise HTTPException(status_code=404, detail="Procedure not found")
        
        updated_inspection = await crud.inspection.update(
            db, db_obj=inspection, obj_in=inspection_update
        )
        return updated_inspection
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspection(
    inspection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Delete inspection (Manager+ only)"""
    try:
        inspection = await crud.inspection.get(db, inspection_id)
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")
        
        await crud.inspection.remove(db, id=inspection_id)
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/failed", response_model=List[InspectionSchema])
async def get_failed_inspections(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get failed inspections that need attention"""
    try:
        inspections = await crud.inspection.get_failed_inspections(db, limit=limit)
        return inspections
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/recent", response_model=List[InspectionSchema])
async def get_recent_inspections(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent inspections"""
    try:
        inspections = await crud.inspection.get_recent_inspections(db, days=days, limit=limit)
        return inspections
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-inspections", response_model=List[InspectionSchema])
async def get_my_inspections(
    pagination: PaginationParams = Depends(),
    result: Optional[InspectionResult] = None,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get inspections performed by current user"""
    try:
        filters = {"inspector_id": current_user.id}
        if result:
            filters["result"] = result
        
        inspections = await crud.inspection.get_multi(
            db, 
            skip=pagination.offset, 
            limit=pagination.size,
            filters=filters,
            order_by="inspection_date", order_direction="desc"
        )
        return inspections
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/machine/{machine_id}", response_model=List[InspectionSchema])
async def get_machine_inspections(
    machine_id: int,
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get inspections for a specific machine"""
    try:
        # Verify machine exists
        machine = await crud.machine.get(db, machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        inspections = await crud.inspection.get_by_machine(db, machine_id=machine_id, limit=limit)
        return inspections
    except HTTPException:
        raise
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/summary/stats")
async def get_inspection_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get inspection statistics"""
    try:
        # Get recent inspections for stats
        recent_inspections = await crud.inspection.get_recent_inspections(
            db, days=days, limit=1000
        )
        
        total_inspections = len(recent_inspections)
        passed = len([i for i in recent_inspections if i.result == InspectionResult.PASS])
        failed = len([i for i in recent_inspections if i.result == InspectionResult.FAIL])
        needs_attention = len([i for i in recent_inspections if i.result == InspectionResult.NEEDS_ATTENTION])
        
        return {
            "period_days": days,
            "total_inspections": total_inspections,
            "passed": passed,
            "failed": failed,
            "needs_attention": needs_attention,
            "pass_rate": round((passed / total_inspections * 100) if total_inspections > 0 else 0, 2)
        }
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))
