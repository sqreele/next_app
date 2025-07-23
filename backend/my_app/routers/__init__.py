
"""
Router package for PM System API init.py
"""
from fastapi import APIRouter
from auth import router as auth_router
from users import router as users_router
from properties import router as properties_router
from machines import router as machines_router
from pm_schedules import router as pm_schedules_router
from pm_executions import router as pm_executions_router
from issues import router as issues_router
from inspections import router as inspections_router
from files import router as files_router
from dashboard import router as dashboard_router
from search import router as search_router
from admin import router as admin_router

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# Include all routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(properties_router, prefix="/properties", tags=["Properties & Rooms"])
api_router.include_router(machines_router, prefix="/machines", tags=["Machines"])
api_router.include_router(pm_schedules_router, prefix="/pm-schedules", tags=["PM Schedules"])
api_router.include_router(pm_executions_router, prefix="/pm-executions", tags=["PM Executions"])
api_router.include_router(issues_router, prefix="/issues", tags=["Issues"])
api_router.include_router(inspections_router, prefix="/inspections", tags=["Inspections"])
api_router.include_router(files_router, prefix="/files", tags=["File Management"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard & Analytics"])
api_router.include_router(search_router, prefix="/search", tags=["Search"])
api_router.include_router(admin_router, prefix="/admin", tags=["Administration"])

__all__ = ["api_router"]
