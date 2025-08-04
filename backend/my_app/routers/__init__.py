
"""
Router package for PM System API init.py
"""
from fastapi import APIRouter
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.properties import router as properties_router
from routers.machines import router as machines_router
from routers.pm_schedules import router as pm_schedules_router
from routers.pm_executions import router as pm_executions_router
from routers.issues import router as issues_router
from routers.inspections import router as inspections_router
from routers.files import router as files_router
from routers.dashboard import router as dashboard_router
from routers.search import router as search_router
from routers.admin import router as admin_router
from routers.jobs import router as jobs_router
from routers.work_orders import router as work_orders_router
from routers.calendar import router as calendar_router
from routers.procedure import router as procedure_router
from routers.rooms import router as rooms_router
from routers.topic import router as topic_router

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
api_router.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(work_orders_router, prefix="/work-orders", tags=["Work Orders"])
api_router.include_router(calendar_router, prefix="/calendar", tags=["Calendar"])
api_router.include_router(procedure_router, prefix="/procedures", tags=["Procedures"])
api_router.include_router(rooms_router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(topic_router, prefix="/topics", tags=["Topics"])

__all__ = ["api_router"] 
