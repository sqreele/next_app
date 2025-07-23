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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Debug Python path and directory
logger.info(f"Python path: {sys.path}")
logger.info(f"Current directory: {os.getcwd()}")

# Force add /app/my_app to sys.path
sys.path.insert(0, '/app/my_app')
logger.info(f"Updated Python path: {sys.path}")

# Load environment variables
load_dotenv()

# Import database
try:
    from database import (
        init_database, close_db_connections, health_check as db_health_check,
        ENVIRONMENT, DEBUG, get_db, sync_engine  # Import sync_engine for SQLAdmin
    )
    logger.info("Successfully imported database module")
except ModuleNotFoundError as e:
    logger.error(f"Failed to import database module: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error importing database module: {e}")
    raise

# Import routers
try:
    from routers import api_router
    logger.info("Successfully imported routers module and api_router")
except ImportError as e:
    logger.error(f"Failed to import routers or api_router: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error importing routers module: {e}")
    raise

# Validate environment variables
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,*.localhost').split(',')
if not ALLOWED_HOSTS or not any(host.strip() for host in ALLOWED_HOSTS):
    logger.error("❌ ALLOWED_HOSTS environment variable is missing or invalid")
    raise ValueError("ALLOWED_HOSTS configuration incomplete")
logger.info(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")

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
logger.info("FastAPI app initialized")

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
logger.info("Middleware configured")

# Initialize SQLAdmin
try:
    logger.info("Initializing SQLAdmin...")
    
    # Simple authentication backend for now
    from sqladmin.authentication import AuthenticationBackend
    
    class SimpleAuthBackend(AuthenticationBackend):
        async def login(self, request):
            form = await request.form()
            username = form.get("username")
            password = form.get("password")
            
            # Simple hardcoded login (CHANGE IN PRODUCTION!)
            if username == "admin" and password == "admin123":
                request.session.update({"authenticated": True})
                return True
            return False
        
        async def logout(self, request):
            request.session.clear()
            return True
        
        async def authenticate(self, request):
            return request.session.get("authenticated", False)
    
    # Create admin instance
    admin = Admin(
        app, 
        sync_engine,
        authentication_backend=SimpleAuthBackend(secret_key="your-secret-key-here"),
        title="PM System Admin Panel",
        logo_url=None,
    )
    
    logger.info("SQLAdmin instance created")
    
    # Import and add all admin views
    try:
        from admin import (
            UserAdmin, PropertyAdmin, RoomAdmin, MachineAdmin, TopicAdmin,
            ProcedureAdmin, PMScheduleAdmin, PMExecutionAdmin, IssueAdmin,
            InspectionAdmin, PMFileAdmin, UserPropertyAccessAdmin
        )
        
        # Add all views to admin
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
        
        logger.info("✅ SQLAdmin initialized with all 12 views")
        
    except Exception as e:
        logger.error(f"❌ Failed to import/add admin views: {e}")
        logger.info("Continuing without admin views...")
        
except Exception as e:
    logger.error(f"❌ Failed to initialize SQLAdmin: {e}")
    logger.info("Continuing without admin panel...")

# Include the main API router
app.include_router(api_router)
logger.info("API router included")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "PM System API",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs" if DEBUG else "Documentation disabled in production",
        "admin": "/admin",
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
    logger.info("Starting Uvicorn server")
    uvicorn.run(
        "my_app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=DEBUG,
        log_level="info",
        access_log=DEBUG
    )
