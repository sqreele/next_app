# backend/my_app/main.py

import sys
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv

# SQLAdmin imports
from sqladmin import Admin
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Force add /app/my_app to sys.path
sys.path.insert(0, '/app/my_app')

# Load environment variables
load_dotenv()

# Import database
from database import (
    init_database, close_db_connections, health_check as db_health_check,
    ENVIRONMENT, DEBUG, get_db, sync_engine  # Add sync_engine import
)

# Import routers
from routers import api_router

# Import admin views
from admin import (
    UserAdmin, PropertyAdmin, RoomAdmin, MachineAdmin, TopicAdmin,
    ProcedureAdmin, PMScheduleAdmin, PMExecutionAdmin, IssueAdmin,
    InspectionAdmin, PMFileAdmin, UserPropertyAccessAdmin
)

# Import authentication backend
from login_admin import authentication_backend

# Validate environment variables
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,*.localhost').split(',')
if not ALLOWED_HOSTS or not any(host.strip() for host in ALLOWED_HOSTS):
    logger.error("❌ ALLOWED_HOSTS environment variable is missing or invalid")
    raise ValueError("ALLOWED_HOSTS configuration incomplete")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting PM System API...")
    try:
        await init_database()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    yield
    
    logger.info("🛑 Shutting down PM System API...")
    await close_db_connections()
    logger.info("✅ Application shutdown complete")

# Initialize FastAPI app
app = FastAPI(
    title="PM System API",
    description="Advanced Preventive Maintenance Management System",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
)

# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if DEBUG else [f"https://{host.strip()}" for host in ALLOWED_HOSTS if host.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if not DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[host.strip() for host in ALLOWED_HOSTS if host.strip()]
    )

# Initialize SQLAdmin
admin = Admin(
    app, 
    sync_engine,
    authentication_backend=authentication_backend,
    title="PM System Admin",
    logo_url=None,
)

# Add all admin views
admin.add_view(UserAdmin)
admin.add_view(PropertyAdmin)
admin.add_view(RoomAdmin)
admin.add_view(MachineAdmin)
admin.add_view(TopicAdmin)
admin.add_view(ProcedureAdmin)
admin.add_view(PMScheduleAdmin)
admin.add_view(PMExecutionAdmin)
admin.add_view(IssueAdmin)
admin.add_view(InspectionAdmin)
admin.add_view(PMFileAdmin)
admin.add_view(UserPropertyAccessAdmin)

logger.info("✅ SQLAdmin initialized with all views")

# Include the main API router
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "PM System API",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs" if DEBUG else "Documentation disabled in production",
        "admin": "/admin" if DEBUG else "Admin panel available",
        "environment": ENVIRONMENT
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        db_health = await db_health_check()
        return {
            "status": "healthy" if db_health["status"] == "healthy" else "unhealthy",
            "environment": ENVIRONMENT,
            "database": db_health
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "environment": ENVIRONMENT,
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(
        "my_app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=DEBUG,
        log_level="info",
        access_log=DEBUG
    )
