"""
Search functionality routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from database import get_db
from models import User
from schemas import SearchRequest, SearchResult, PaginationParams
import crud
from crud import CRUDError
from .auth import get_current_active_user

router = APIRouter()

@router.post("/", response_model=List[SearchResult])
async def search_entities(
    search_request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Global search across entities"""
    try:
        results = []
        
        # Use CRUD search functions
        search_results = await crud.search_all_entities(
            db, 
            search_term=search_request.query,
            limit_per_entity=search_request.limit // 4  # Distribute across entity types
        )
        
        # Convert to SearchResult format
        for entity_type, entities in search_results.items():
            for entity in entities:
                if entity_type == "machines":
                    results.append(SearchResult(
                        type="machine",
                        id=entity.id,
                        title=entity.name,
                        description=f"Model: {entity.model}, SN: {entity.serial_number}",
                        score=1.0
                    ))
                elif entity_type == "users":
                    results.append(SearchResult(
                        type="user",
                        id=entity.id,
                        title=f"{entity.first_name} {entity.last_name}",
                        description=f"Username: {entity.username}, Role: {entity.role}",
                        score=0.9
                    ))
                elif entity_type == "issues":
                    results.append(SearchResult(
                        type="issue",
                        id=entity.id,
                        title=entity.title,
                        description=entity.description[:100] + "..." if entity.description and len(entity.description) > 100 else entity.description,
                        score=0.8
                    ))
                elif entity_type == "procedures":
                    results.append(SearchResult(
                        type="procedure",
                        id=entity.id,
                        title=entity.title,
                        description=entity.description[:100] + "..." if entity.description and len(entity.description) > 100 else entity.description,
                        score=0.7
                    ))
        
        # Sort by score and limit results
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:search_request.limit]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Search failed")

@router.get("/quick")
async def quick_search(
    q: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Quick search with simplified response"""
    try:
        search_request = SearchRequest(query=q, limit=limit)
        results = await search_entities(search_request, db, current_user)
        
        # Simplify response for quick search
        simplified_results = []
        for result in results:
            simplified_results.append({
                "id": result.id,
                "type": result.type,
                "title": result.title,
                "score": result.score
            })
        
        return {"results": simplified_results, "total": len(simplified_results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Quick search failed")

@router.get("/machines")
async def search_machines(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search machines specifically"""
    try:
        machines = await crud.machine.search_machines(db, search_term=q, limit=limit)
        
        results = []
        for machine in machines:
            results.append({
                "id": machine.id,
                "name": machine.name,
                "model": machine.model,
                "serial_number": machine.serial_number,
                "room_id": machine.room_id,
                "is_active": machine.is_active
            })
        
        return {"results": results, "total": len(results)}
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/users")
async def search_users(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search users specifically"""
    try:
        users = await crud.user.search_users(db, search_term=q, limit=limit)
        
        results = []
        for user in users:
            results.append({
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
                "email": user.email,
                "is_active": user.is_active
            })
        
        return {"results": results, "total": len(results)}
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/issues")
async def search_issues(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search issues specifically"""
    try:
        issues = await crud.issue.search_issues(db, search_term=q, limit=limit)
        
        results = []
        for issue in issues:
            results.append({
                "id": issue.id,
                "title": issue.title,
                "description": issue.description,
                "priority": issue.priority.value,
                "status": issue.status.value,
                "machine_id": issue.machine_id,
                "reported_at": issue.reported_at
            })
        
        return {"results": results, "total": len(results)}
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/procedures")
async def search_procedures(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search procedures specifically"""
    try:
        procedures = await crud.procedure.search_procedures(db, search_term=q, limit=limit)
        
        results = []
        for procedure in procedures:
            results.append({
                "id": procedure.id,
                "title": procedure.title,
                "description": procedure.description,
                "topic_id": procedure.topic_id,
                "estimated_minutes": procedure.estimated_minutes,
                "is_active": procedure.is_active
            })
        
        return {"results": results, "total": len(results)}
    except CRUDError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get search suggestions/autocomplete"""
    try:
        # Get quick suggestions from each entity type
        suggestions = []
        
        # Machine suggestions
        machines = await crud.machine.search_machines(db, search_term=q, limit=3)
        for machine in machines:
            suggestions.append({
                "text": machine.name,
                "type": "machine",
                "id": machine.id,
                "category": "Machines"
            })
        
        # User suggestions
        users = await crud.user.search_users(db, search_term=q, limit=3)
        for user in users:
            suggestions.append({
                "text": f"{user.first_name} {user.last_name}",
                "type": "user",
                "id": user.id,
                "category": "Users"
            })
        
        # Issue suggestions
        issues = await crud.issue.search_issues(db, search_term=q, limit=3)
        for issue in issues:
            suggestions.append({
                "text": issue.title,
                "type": "issue",
                "id": issue.id,
                "category": "Issues"
            })
        
        # Procedure suggestions
        procedures = await crud.procedure.search_procedures(db, search_term=q, limit=3)
        for procedure in procedures:
            suggestions.append({
                "text": procedure.title,
                "type": "procedure",
                "id": procedure.id,
                "category": "Procedures"
            })
        
        return {"suggestions": suggestions[:12]}  # Limit total suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get suggestions")

@router.get("/advanced")
async def advanced_search(
    q: str = Query(..., min_length=1),
    entity_types: Optional[List[str]] = Query(None),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Advanced search with filters"""
    try:
        from datetime import datetime
        
        # Parse dates if provided
        date_from_parsed = None
        date_to_parsed = None
        if date_from:
            try:
                date_from_parsed = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_from format")
        
        if date_to:
            try:
                date_to_parsed = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_to format")
        
        results = []
        
        # Search in specified entity types or all if none specified
        search_entity_types = entity_types if entity_types else ["machines", "users", "issues", "procedures"]
        
        if "machines" in search_entity_types:
            machines = await crud.machine.search_machines(db, search_term=q, limit=limit//len(search_entity_types))
            for machine in machines:
                # Apply date filters if applicable
                include = True
                if date_from_parsed and machine.created_at < date_from_parsed:
                    include = False
                if date_to_parsed and machine.created_at > date_to_parsed:
                    include = False
                
                if include:
                    results.append({
                        "type": "machine",
                        "id": machine.id,
                        "title": machine.name,
                        "description": f"Model: {machine.model}, SN: {machine.serial_number}",
                        "created_at": machine.created_at,
                        "score": 1.0
                    })
        
        if "users" in search_entity_types:
            users = await crud.user.search_users(db, search_term=q, limit=limit//len(search_entity_types))
            for user in users:
                include = True
                if date_from_parsed and user.created_at < date_from_parsed:
                    include = False
                if date_to_parsed and user.created_at > date_to_parsed:
                    include = False
                
                if include:
                    results.append({
                        "type": "user",
                        "id": user.id,
                        "title": f"{user.first_name} {user.last_name}",
                        "description": f"Username: {user.username}, Role: {user.role}",
                        "created_at": user.created_at,
                        "score": 0.9
                    })
        
        if "issues" in search_entity_types:
            issues = await crud.issue.search_issues(db, search_term=q, limit=limit//len(search_entity_types))
            for issue in issues:
                include = True
                if date_from_parsed and issue.created_at < date_from_parsed:
                    include = False
                if date_to_parsed and issue.created_at > date_to_parsed:
                    include = False
                
                if include:
                    results.append({
                        "type": "issue",
                        "id": issue.id,
                        "title": issue.title,
                        "description": issue.description[:100] + "..." if issue.description and len(issue.description) > 100 else issue.description,
                        "created_at": issue.created_at,
                        "score": 0.8
                    })
        
        if "procedures" in search_entity_types:
            procedures = await crud.procedure.search_procedures(db, search_term=q, limit=limit//len(search_entity_types))
            for procedure in procedures:
                include = True
                if date_from_parsed and procedure.created_at < date_from_parsed:
                    include = False
                if date_to_parsed and procedure.created_at > date_to_parsed:
                    include = False
                
                if include:
                    results.append({
                        "type": "procedure",
                        "id": procedure.id,
                        "title": procedure.title,
                        "description": procedure.description[:100] + "..." if procedure.description and len(procedure.description) > 100 else procedure.description,
                        "created_at": procedure.created_at,
                        "score": 0.7
                    })
        
        # Sort by score and creation date
        results.sort(key=lambda x: (x["score"], x["created_at"]), reverse=True)
        
        return {
            "results": results[:limit],
            "total": len(results),
            "filters_applied": {
                "entity_types": search_entity_types,
                "date_from": date_from,
                "date_to": date_to
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Advanced search failed")
