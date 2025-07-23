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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Debug Python path and directory
logger.info(f"Python path: {sys.path}")
logger.info(f"Current directory: {os.getcwd()}")
logger.info(f"Directory contents: {os.listdir('.')}")
logger.info(f"Checking for database.py: {'database.py' in os.listdir('.')}")
logger.info(f"Routers directory contents: {os.listdir('routers') if os.path.isdir('routers') else 'routers directory not found'}")

# Force add /app/my_app to sys.path
sys.path.insert(0, '/app/my_app')
logger.info(f"Updated Python path: {sys.path}")

# Load environment variables
load_dotenv()
logger.info(f"Environment variables: DB_HOST={os.environ.get('DB_HOST', 'Not set')}, DB_NAME={os.environ.get('DB_NAME', 'Not set')}")

# Import database
try:
    from database import (
        init_database, close_db_connections, health_check as db_health_check,
        ENVIRONMENT, DEBUG, get_db
    )
    logger.info("Successfully imported database module")
except ModuleNotFoundError as e:
    logger.error(f"Failed to import database module: {e}")
    logger.error(f"Current directory: {os.getcwd()}")
    logger.error(f"Directory contents: {os.listdir('.')}")
    logger.error(f"sys.path: {sys.path}")
    raise
except Exception as e:
    logger.error(f"Unexpected error importing database module: {e}")
    raise

# Import routers
try:
    import routers
    from routers import api_router
    logger.info("Successfully imported routers module and api_router")
except ImportError as e:
    logger.error(f"Failed to import routers or api_router: {e}")
    logger.error(f"Routers directory exists: {os.path.isdir('routers')}")
    logger.error(f"Routers directory contents: {os.listdir('routers') if os.path.isdir('routers') else 'Not found'}")
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
