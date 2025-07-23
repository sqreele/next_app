"""
Administration routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path
import asyncio
import logging
import json
import csv
import os
import signal

# --- New Imports ---
# For performance metrics
import psutil
# For data export to Excel
import openpyxl
# For creating a new DB session in background tasks
from database import AsyncSessionLocal as SessionLocal, get_db, get_database_stats, close_db_connections, init_database, health_check as db_health_check
from models import User, UserRole
from schemas import (
    User as UserSchema, BulkOperationResult,
    ExportRequest, ExportResult, PaginationParams
)
import crud
from crud import CRUDError
from .auth import get_current_active_user, require_role

# --- Configuration ---
router = APIRouter()
logger = logging.getLogger(__name__)

# Track application start time for uptime calculation
APP_START_TIME = datetime.now()
# In-memory stores for demonstration (in production, use Redis or a DB)
ACTIVE_SESSIONS = {}
SYSTEM_CACHE = {
    "session": {},
    "query": {},
    "file": {}
}
REQUEST_COUNT = 0
SETTINGS_FILE = Path("system_settings.json")


# --- Middleware to count requests ---

async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# --- Helper Functions ---
def get_new_db_session():
    """Generator to get a new database session for background tasks."""
    db = SessionLocal()
    try:
        yield db
    finally:
        asyncio.run(db.close())

def load_system_settings() -> Dict[str, Any]:
    """Loads system settings from a JSON file."""
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    # Default settings
    return {
        "application": {"name": "PM System", "version": "2.0.0", "environment": "production", "debug_mode": False},
        "database": {"pool_size": 20, "max_overflow": 30, "timeout": 30},
        "file_upload": {"max_file_size_mb": 10, "allowed_types": [".jpg", ".jpeg", ".png", ".pdf", ".docx", ".xlsx", ".txt"], "upload_path": "uploads/"},
        "security": {"session_timeout_minutes": 30, "password_min_length": 8, "require_strong_passwords": True},
        "notifications": {"email_enabled": False, "sms_enabled": False, "overdue_pm_alerts": True}
    }

def save_system_settings(settings: Dict[str, Any]):
    """Saves system settings to a JSON file."""
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=4)

# Admin-only decorator
def admin_only():
    return require_role(UserRole.ADMIN)

# ---------------------------------
# --- Main Admin Routes ---
# ---------------------------------

@router.get("/system/info")
async def get_system_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Get system information (Admin only)"""
    try:
        db_health = await db_health_check()
        db_stats = await get_database_stats()
        
        uptime_delta = datetime.now() - APP_START_TIME
        
        return {
            "system": {
                "version": "2.0.0",
                "environment": os.getenv("ENVIRONMENT", "production"),
                "uptime": str(uptime_delta),
                "current_time": datetime.now()
            },
            "database": {"health": db_health, "stats": db_stats},
            "record_counts": {
                "users": {"total": await crud.user.count(db), "active": await crud.user.count(db, filters={"is_active": True})},
                "machines": {"total": await crud.machine.count(db), "active": await crud.machine.count(db, filters={"is_active": True})},
                "issues": {"total": await crud.issue.count(db), "open": await crud.issue.count(db, filters={"status": ["OPEN", "ASSIGNED", "IN_PROGRESS"]})},
            }
        }
    except Exception as e:
        logger.error(f"System info error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch system information")

@router.post("/database/backup")
async def create_database_backup(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(admin_only())
):
    """Create database backup (Admin only) using pg_dump."""
    try:
        backup_dir = Path("backups")
        backup_dir.mkdir(exist_ok=True)
        backup_filename = f"pm_system_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        backup_filepath = backup_dir / backup_filename

        def do_backup():
            logger.info(f"Starting database backup: {backup_filename}")
            # Ensure you have pg_dump installed and in your system's PATH
            # These values should ideally come from a secure config
            db_user = os.getenv("DB_USER", "user")
            db_pass = os.getenv("DB_PASS", "password")
            db_name = os.getenv("DB_NAME", "fullstack_db")
            db_host = os.getenv("DB_HOST", "db")

            command = f'PGPASSWORD="{db_pass}" pg_dump -h {db_host} -U {db_user} -d {db_name} -f {backup_filepath}'
            
            try:
                # Using asyncio.run to execute the shell command
                proc = asyncio.run(asyncio.create_subprocess_shell(command))
                asyncio.run(proc.wait())
                if proc.returncode == 0:
                    logger.info(f"Backup completed successfully: {backup_filepath}")
                else:
                    logger.error(f"Backup failed with exit code {proc.returncode}")
            except Exception as ex:
                logger.error(f"An exception occurred during backup: {ex}")

        background_tasks.add_task(do_backup)
        return {"message": "Database backup started in the background", "backup_filename": backup_filename}
    except Exception as e:
        logger.error(f"Database backup error: {e}")
        raise HTTPException(status_code=500, detail="Backup creation failed")

@router.post("/database/maintenance")
async def perform_database_maintenance(
    background_tasks: BackgroundTasks,
    action: str = Query(..., regex="^(vacuum|reindex|analyze)$"),
    current_user: User = Depends(admin_only())
):
    """Perform database maintenance (Admin only): VACUUM, REINDEX, or ANALYZE."""
    async def maintenance_task(db_action: str):
        logger.info(f"Starting database maintenance: {db_action}")
        db = next(get_new_db_session())
        try:
            # Use text() for executing raw SQL safely
            if db_action.upper() in ["VACUUM", "REINDEX", "ANALYZE"]:
                # These commands can't run in a transaction block
                # Get the underlying connection
                connection = await db.connection()
                await connection.execution_options(isolation_level="AUTOCOMMIT")
                await db.execute(text(db_action.upper()))
                logger.info(f"Database maintenance '{db_action}' completed successfully.")
            else:
                logger.warning(f"Invalid maintenance action: {db_action}")
        except Exception as ex:
            logger.error(f"Database maintenance failed for action '{db_action}': {ex}")
        finally:
            await db.close()

    background_tasks.add_task(maintenance_task, action)
    return {"message": f"Database maintenance task '{action}' started in the background."}

@router.get("/logs")
async def get_system_logs(
    level: str = Query("INFO", regex="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$"),
    lines: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(admin_only())
):
    """Get system logs from the log file (Admin only)."""
    log_file = Path("app.log") # Assuming logs are written here
    if not log_file.exists():
        raise HTTPException(status_code=404, detail="Log file not found.")
    
    try:
        with open(log_file, "r") as f:
            # Read all lines and filter by level
            log_lines = [line for line in f if f"- {level} -" in line]
            # Get the last N lines
            last_n_lines = log_lines[-lines:]
        return {"logs": last_n_lines, "lines_returned": len(last_n_lines)}
    except Exception as e:
        logger.error(f"Log retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve logs")

@router.post("/data/export", response_model=ExportResult)
async def export_data(
    export_request: ExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(admin_only())
):
    """Export system data to CSV or XLSX (Admin only)."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"pm_system_export_{timestamp}.{export_request.format}"
    export_dir = Path("exports")
    export_dir.mkdir(exist_ok=True)
    file_path = export_dir / filename

    async def export_task():
        db = next(get_new_db_session())
        logger.info(f"Starting data export to {file_path}")
        try:
            # Fetch all users as an example export
            users = await crud.user.get_multi(db, limit=10000)
            data = [user.__dict__ for user in users]

            if not data:
                logger.warning("No data found to export.")
                return

            if export_request.format == "csv":
                with open(file_path, "w", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=data[0].keys())
                    writer.writeheader()
                    writer.writerows(data)

            elif export_request.format == "xlsx":
                # Requires 'openpyxl' to be installed
                workbook = openpyxl.Workbook()
                sheet = workbook.active
                sheet.append(list(data[0].keys())) # Header
                for row_data in data:
                    sheet.append(list(row_data.values()))
                workbook.save(file_path)

            logger.info(f"Data export completed: {filename}")
        except Exception as ex:
            logger.error(f"Data export failed: {ex}")
        finally:
            await db.close()

    background_tasks.add_task(export_task)
    return ExportResult(
        file_path=str(file_path),
        file_name=filename,
        created_at=datetime.now(),
        expires_at=datetime.now() + timedelta(days=7)
    )

# Note: The duplicated route has been removed.
@router.post("/system/restart")
async def restart_system(
    current_user: User = Depends(admin_only())
):
    """Gracefully restart the application (Admin only). Sends SIGHUP to the current process."""
    logger.warning(f"System restart requested by admin user: {current_user.username}")
    # This sends the SIGHUP signal to the current process.
    # A process manager like Gunicorn or Supervisor should be configured to
    # restart the worker process upon receiving this signal.
    os.kill(os.getpid(), signal.SIGHUP)
    return {"message": "System restart signal sent. The application should restart shortly."}

@router.get("/performance/metrics")
async def get_performance_metrics(
    current_user: User = Depends(admin_only())
):
    """Get system performance metrics (Admin only)."""
    try:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        uptime = datetime.now() - APP_START_TIME
        db_health = await db_health_check()
        
        return {
            "timestamp": datetime.now(),
            "system": {
                "cpu_usage_percent": psutil.cpu_percent(interval=None),
                "memory": {"total_gb": round(memory.total / (1024**3), 2), "usage_percent": memory.percent},
                "disk": {"total_gb": round(disk.total / (1024**3), 2), "usage_percent": disk.percent}
            },
            "database": db_health,
            "application": {
                "uptime": str(uptime),
                "active_connections": db_health.get("active_connections", "N/A"),
                "total_requests": REQUEST_COUNT
            }
        }
    except ImportError:
        return {"error": "Performance monitoring requires 'psutil' package."}
    except Exception as e:
        logger.error(f"Performance metrics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch performance metrics")

@router.post("/cache/clear")
async def clear_cache(
    cache_type: str = Query("all", regex="^(all|session|query|file)$"),
    current_user: User = Depends(admin_only())
):
    """Clear system cache (Admin only). This is a simulation."""
    logger.info(f"Cache clear requested for '{cache_type}' by {current_user.username}")
    cleared_caches = []
    if cache_type in ["all", "session"]:
        SYSTEM_CACHE["session"].clear()
        cleared_caches.append("session")
    if cache_type in ["all", "query"]:
        SYSTEM_CACHE["query"].clear()
        cleared_caches.append("query")
    if cache_type in ["all", "file"]:
        SYSTEM_CACHE["file"].clear()
        cleared_caches.append("file")

    return {"message": "Cache cleared successfully", "cleared_caches": cleared_caches}

# Note: The incorrect parameter order has been fixed in the function below.
@router.post("/maintenance/data-integrity")
async def check_data_integrity(
    background_tasks: BackgroundTasks,
    fix_issues: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Check and optionally fix data integrity issues (Admin only)."""
    async def integrity_check_task():
        db_session = next(get_new_db_session())
        logger.info(f"Starting data integrity check (Fix mode: {fix_issues})")
        issues_found = []
        fixes_applied = []
        
        try:
            # Example check: Orphaned issues (issue pointing to a non-existent machine)
            all_issues = await crud.issue.get_multi(db_session, limit=10000)
            machine_ids = {m.id for m in await crud.machine.get_multi(db_session, limit=10000)}

            for issue in all_issues:
                if issue.machine_id not in machine_ids:
                    desc = f"Issue {issue.id} references non-existent machine {issue.machine_id}"
                    issues_found.append({"type": "orphaned_issue", "id": issue.id, "description": desc})
                    if fix_issues:
                        await crud.issue.remove(db_session, id=issue.id)
                        fixes_applied.append(f"Removed orphaned issue {issue.id}")

            logger.info(f"Data integrity check completed. Found: {len(issues_found)}, Fixed: {len(fixes_applied)}")
        except Exception as ex:
            logger.error(f"Data integrity check failed: {ex}")
        finally:
            await db_session.close()

    background_tasks.add_task(integrity_check_task)
    return {"message": "Data integrity check started in the background."}

@router.get("/settings/system")
async def get_system_settings(
    current_user: User = Depends(admin_only())
):
    """Get system settings from the configuration file (Admin only)."""
    try:
        return load_system_settings()
    except Exception as e:
        logger.error(f"System settings error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch system settings")

@router.post("/settings/system")
async def update_system_settings(
    settings: Dict[str, Any],
    current_user: User = Depends(admin_only())
):
    """Update system settings in the configuration file (Admin only)."""
    try:
        logger.info(f"System settings update requested by {current_user.username}")
        # Add validation logic for settings here before saving
        save_system_settings(settings)
        return {"message": "System settings updated successfully.", "settings_updated": list(settings.keys())}
    except Exception as e:
        logger.error(f"System settings update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update system settings")
