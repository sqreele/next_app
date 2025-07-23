from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging

# Import database
from database import (
    init_database, close_db_connections, health_check as db_health_check,
    ENVIRONMENT, DEBUG
)

# Import routers
from routers import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting PM System API...")
    try:
        await init_database()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down PM System API...")
    await close_db_connections()
    logger.info("✅ Application shutdown complete")

# Initialize FastAPI app with lifespan
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
    allow_origins=["*"] if DEBUG else ["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if not DEBUG:
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
    )

# Include the main API router
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PM System API",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs" if DEBUG else "Documentation disabled in production"
    }

# Health check endpoint (outside of API versioning)
@app.get("/health")
async def health_check():
    """Application health check"""
    db_health = await db_health_check()
    return {
        "status": "healthy" if db_health["status"] == "healthy" else "unhealthy",
        "environment": ENVIRONMENT,
        "database": db_health
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG,
        log_level="info",
        access_log=DEBUG
    )
