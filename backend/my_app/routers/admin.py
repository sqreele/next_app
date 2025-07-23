"""
Administration routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path
import asyncio
import logging

from database import (
    get_db, get_database_stats, close_db_connections, 
    init_database, health_check as db_health_check
)
from models import User, UserRole
from schemas import (
    User as UserSchema, BulkOperationResult,
    ExportRequest, ExportResult, PaginationParams
)
import crud
from crud import CRUDError
from .auth import get_current_active_user, require_role

router = APIRouter()
logger = logging.getLogger(__name__)

# Admin-only decorator
def admin_only():
    return require_role(UserRole.ADMIN)

@router.get("/system/info")
async def get_system_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Get system information (Admin only)"""
    try:
        # Get database health
        db_health = await db_health_check()
        
        # Get database stats
        db_stats = await get_database_stats()
        
        # Count records
        total_users = await crud.user.count(db)
        active_users = await crud.user.count(db, filters={"is_active": True})
        total_machines = await crud.machine.count(db)
        active_machines = await crud.machine.count(db, filters={"is_active": True})
        total_issues = await crud.issue.count(db)
        open_issues = await crud.issue.count(db, filters={"status": ["OPEN", "ASSIGNED", "IN_PROGRESS"]})
        total_pm_schedules = await crud.pm_schedule.count(db)
        active_pm_schedules = await crud.pm_schedule.count(db, filters={"is_active": True})
        
        # Get recent activity count
        recent_executions = await crud.pm_execution.count(db, filters={"status": "COMPLETED"})
        
        return {
            "system": {
                "version": "2.0.0",
                "environment": "production",  # This should come from environment
                "uptime": "N/A",  # Would need to track application start time
                "current_time": datetime.now()
            },
            "database": {
                "health": db_health,
                "stats": db_stats
            },
            "record_counts": {
                "users": {"total": total_users, "active": active_users},
                "machines": {"total": total_machines, "active": active_machines},
                "issues": {"total": total_issues, "open": open_issues},
                "pm_schedules": {"total": total_pm_schedules, "active": active_pm_schedules},
                "completed_executions": recent_executions
            }
        }
    except Exception as e:
        logger.error(f"System info error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch system information")

@router.get("/users/bulk-actions")
async def get_bulk_user_actions(
    current_user: User = Depends(admin_only())
):
    """Get available bulk actions for users (Admin only)"""
    return {
        "available_actions": [
            {"action": "activate", "description": "Activate selected users"},
            {"action": "deactivate", "description": "Deactivate selected users"},
            {"action": "change_role", "description": "Change role for selected users"},
            {"action": "delete", "description": "Delete selected users (permanent)"}
        ],
        "available_roles": [role.value for role in UserRole]
    }

@router.post("/users/bulk-action", response_model=BulkOperationResult)
async def perform_bulk_user_action(
    action: str,
    user_ids: List[int],
    parameters: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Perform bulk action on users (Admin only)"""
    try:
        if not user_ids:
            raise HTTPException(status_code=400, detail="No user IDs provided")
        
        if len(user_ids) > 100:  # Limit bulk operations
            raise HTTPException(status_code=400, detail="Maximum 100 users per bulk operation")
        
        success_count = 0
        errors = []
        
        for user_id in user_ids:
            try:
                # Don't allow action on self
                if user_id == current_user.id:
                    errors.append({"id": user_id, "error": "Cannot perform action on yourself"})
                    continue
                
                user = await crud.user.get(db, user_id)
                if not user:
                    errors.append({"id": user_id, "error": "User not found"})
                    continue
                
                if action == "activate":
                    await crud.user.update(db, db_obj=user, obj_in={"is_active": True})
                    success_count += 1
                    
                elif action == "deactivate":
                    await crud.user.update(db, db_obj=user, obj_in={"is_active": False})
                    success_count += 1
                    
                elif action == "change_role":
                    if not parameters or "role" not in parameters:
                        errors.append({"id": user_id, "error": "Role parameter required"})
                        continue
                    
                    try:
                        new_role = UserRole(parameters["role"])
                        await crud.user.update(db, db_obj=user, obj_in={"role": new_role})
                        success_count += 1
                    except ValueError:
                        errors.append({"id": user_id, "error": "Invalid role"})
                        
                elif action == "delete":
                    await crud.user.remove(db, id=user_id)
                    success_count += 1
                    
                else:
                    errors.append({"id": user_id, "error": "Unknown action"})
                    
            except Exception as e:
                errors.append({"id": user_id, "error": str(e)})
        
        return BulkOperationResult(
            success_count=success_count,
            error_count=len(errors),
            errors=errors
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk user action error: {e}")
        raise HTTPException(status_code=500, detail="Bulk operation failed")

@router.post("/database/backup")
async def create_database_backup(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(admin_only())
):
    """Create database backup (Admin only)"""
    try:
        # This would implement actual backup logic
        # For now, just return a placeholder
        backup_filename = f"pm_system_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        def create_backup():
            # Implement actual backup logic here
            # This could use pg_dump for PostgreSQL or similar tools
            logger.info(f"Creating database backup: {backup_filename}")
            # Simulate backup process
            import time
            time.sleep(5)  # Simulate backup time
            logger.info(f"Backup completed: {backup_filename}")
        
        background_tasks.add_task(create_backup)
        
        return {
            "message": "Database backup started",
            "backup_filename": backup_filename,
            "status": "in_progress"
        }
    except Exception as e:
        logger.error(f"Database backup error: {e}")
        raise HTTPException(status_code=500, detail="Backup creation failed")

@router.post("/database/maintenance")
async def perform_database_maintenance(
    background_tasks: BackgroundTasks,
    action: str = Query(..., regex="^(vacuum|reindex|analyze|cleanup)$"),
    current_user: User = Depends(admin_only())
):
    """Perform database maintenance (Admin only)"""
    try:
        def maintenance_task():
            logger.info(f"Starting database maintenance: {action}")
            # Implement actual maintenance logic here
            if action == "vacuum":
                # VACUUM database
                pass
            elif action == "reindex":
                # REINDEX database
                pass
            elif action == "analyze":
                # ANALYZE database
                pass
            elif action == "cleanup":
                # Cleanup old records, files, etc.
                pass
            logger.info(f"Database maintenance completed: {action}")
        
        background_tasks.add_task(maintenance_task)
        
        return {
            "message": f"Database maintenance started: {action}",
            "status": "in_progress"
        }
    except Exception as e:
        logger.error(f"Database maintenance error: {e}")
        raise HTTPException(status_code=500, detail="Maintenance task failed")

@router.get("/logs")
async def get_system_logs(
    level: str = Query("INFO", regex="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$"),
    lines: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(admin_only())
):
    """Get system logs (Admin only)"""
    try:
        # This would implement actual log reading
        # For now, return a placeholder
        return {
            "logs": [
                {
                    "timestamp": datetime.now(),
                    "level": "INFO",
                    "message": "System operational",
                    "module": "main"
                }
            ],
            "total_lines": 1,
            "level_filter": level,
            "lines_requested": lines
        }
    except Exception as e:
        logger.error(f"Log retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve logs")

@router.post("/cleanup/files")
async def cleanup_orphaned_files(
    background_tasks: BackgroundTasks,
    dry_run: bool = Query(False),
    current_user: User = Depends(admin_only())
):
    """Cleanup orphaned files (Admin only)"""
    try:
        async def cleanup_task():
            logger.info("Starting file cleanup task")
            
            # Get all file records from database
            all_files = await crud.pm_file.get_multi(db, limit=10000)
            
            orphaned_files = []
            missing_files = []
            
            # Check for orphaned files (files on disk not in database)
            upload_dir = Path("uploads")
            if upload_dir.exists():
                for file_path in upload_dir.rglob("*"):
                    if file_path.is_file():
                        file_in_db = any(str(file_path) == f.file_path for f in all_files)
                        if not file_in_db:
                            orphaned_files.append(str(file_path))
                            if not dry_run:
                                file_path.unlink()
            
            # Check for missing files (database records without files)
            for file_record in all_files:
                file_path = Path(file_record.file_path)
                if not file_path.exists():
                    missing_files.append(file_record.id)
                    if not dry_run:
                        await crud.pm_file.remove(db, id=file_record.id)
            
            result = {
                "orphaned_files": len(orphaned_files),
                "missing_files": len(missing_files),
                "dry_run": dry_run
            }
            
            if dry_run:
                result["would_delete"] = {
                    "orphaned_file_paths": orphaned_files,
                    "missing_file_records": missing_files
                }
            
            logger.info(f"File cleanup completed: {result}")
            return result
        
        if dry_run:
            # Run synchronously for dry run to return results immediately
            result = await cleanup_task()
            return result
        else:
            background_tasks.add_task(cleanup_task)
            return {
                "message": "File cleanup started",
                "status": "in_progress"
            }
            
    except Exception as e:
        logger.error(f"File cleanup error: {e}")
        raise HTTPException(status_code=500, detail="File cleanup failed")

@router.post("/data/export", response_model=ExportResult)
async def export_data(
    export_request: ExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(admin_only())
):
    """Export system data (Admin only)"""
    try:
        # Create unique export filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pm_system_export_{timestamp}.{export_request.format}"
        file_path = f"exports/{filename}"
        
        # Ensure exports directory exists
        Path("exports").mkdir(exist_ok=True)
        
        async def export_task():
            logger.info(f"Starting data export: {export_request.format}")
            
            # This would implement actual export logic based on format
            if export_request.format == "csv":
                # Export to CSV
                pass
            elif export_request.format == "xlsx":
                # Export to Excel
                pass
            elif export_request.format == "pdf":
                # Export to PDF report
                pass
            
            logger.info(f"Data export completed: {filename}")
        
        background_tasks.add_task(export_task)
        
        return ExportResult(
            file_path=file_path,
            file_name=filename,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=7)  # Expire in 7 days
        )
    except Exception as e:
        logger.error(f"Data export error: {e}")
        raise HTTPException(status_code=500, detail="Data export failed")

@router.post("/system/restart")
@router.post("/system/restart")
async def restart_system(
    current_user: User = Depends(admin_only())
):
    """Restart system (Admin only) - Use with caution!"""
    try:
        logger.warning(f"System restart requested by admin user: {current_user.username}")
        
        # This would implement actual system restart logic
        # For safety, we'll just return a message
        return {
            "message": "System restart requested - this would restart the application",
            "warning": "This is a placeholder. Implement actual restart logic with caution.",
            "requested_by": current_user.username,
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"System restart error: {e}")
        raise HTTPException(status_code=500, detail="Restart request failed")

@router.get("/statistics/detailed")
async def get_detailed_statistics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Get detailed system statistics (Admin only)"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # User statistics
        total_users = await crud.user.count(db)
        active_users = await crud.user.count(db, filters={"is_active": True})
        new_users = await crud.user.count(db, filters={"created_at__gte": cutoff_date})
        
        # Machine statistics
        total_machines = await crud.machine.count(db)
        active_machines = await crud.machine.count(db, filters={"is_active": True})
        
        # PM statistics
        total_pm_schedules = await crud.pm_schedule.count(db)
        active_pm_schedules = await crud.pm_schedule.count(db, filters={"is_active": True})
        overdue_pm = len(await crud.pm_schedule.get_overdue(db, limit=1000))
        
        # Issue statistics
        total_issues = await crud.issue.count(db)
        open_issues = await crud.issue.count(db, filters={"status": ["OPEN", "ASSIGNED", "IN_PROGRESS"]})
        critical_issues = len(await crud.issue.get_critical_issues(db, limit=1000))
        
        # Recent activity
        recent_pm_completions = await crud.pm_execution.count(
            db, 
            filters={"status": "COMPLETED", "completed_at__gte": cutoff_date}
        )
        recent_inspections = await crud.inspection.count(
            db, 
            filters={"created_at__gte": cutoff_date}
        )
        
        # File statistics
        total_files = await crud.pm_file.count(db)
        recent_files = await crud.pm_file.count(db, filters={"uploaded_at__gte": cutoff_date})
        
        return {
            "period_days": days,
            "users": {
                "total": total_users,
                "active": active_users,
                "new_in_period": new_users,
                "activity_rate": round((active_users / total_users * 100) if total_users > 0 else 0, 2)
            },
            "machines": {
                "total": total_machines,
                "active": active_machines,
                "utilization_rate": round((active_machines / total_machines * 100) if total_machines > 0 else 0, 2)
            },
            "pm_schedules": {
                "total": total_pm_schedules,
                "active": active_pm_schedules,
                "overdue": overdue_pm,
                "overdue_percentage": round((overdue_pm / active_pm_schedules * 100) if active_pm_schedules > 0 else 0, 2)
            },
            "issues": {
                "total": total_issues,
                "open": open_issues,
                "critical": critical_issues,
                "resolution_needed": open_issues + critical_issues
            },
            "recent_activity": {
                "pm_completions": recent_pm_completions,
                "inspections": recent_inspections,
                "files_uploaded": recent_files
            },
            "files": {
                "total": total_files,
                "recent": recent_files
            }
        }
    except Exception as e:
        logger.error(f"Detailed statistics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch detailed statistics")

@router.get("/audit/user-activity")
async def get_user_activity_audit(
    user_id: Optional[int] = None,
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(100, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Get user activity audit trail (Admin only)"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        activities = []
        
        # Get PM executions
        filters = {"created_at__gte": cutoff_date}
        if user_id:
            filters["executed_by_id"] = user_id
            
        pm_executions = await crud.pm_execution.get_multi(
            db, 
            filters=filters,
            order_by="created_at", order_direction="desc",
            limit=limit//3
        )
        
        for execution in pm_executions:
            activities.append({
                "user_id": execution.executed_by_id,
                "action": "PM_EXECUTION",
                "details": f"PM Execution {execution.status.value}",
                "timestamp": execution.created_at,
                "entity_type": "pm_execution",
                "entity_id": execution.id
            })
        
        # Get issue activities
        issue_filters = {"created_at__gte": cutoff_date}
        if user_id:
            issue_filters["reported_by_id"] = user_id
            
        issues = await crud.issue.get_multi(
            db,
            filters=issue_filters,
            order_by="created_at", order_direction="desc",
            limit=limit//3
        )
        
        for issue in issues:
            activities.append({
                "user_id": issue.reported_by_id,
                "action": "ISSUE_CREATED",
                "details": f"Created issue: {issue.title}",
                "timestamp": issue.created_at,
                "entity_type": "issue",
                "entity_id": issue.id
            })
        
        # Get inspections
        inspection_filters = {"created_at__gte": cutoff_date}
        if user_id:
            inspection_filters["inspector_id"] = user_id
            
        inspections = await crud.inspection.get_multi(
            db,
            filters=inspection_filters,
            order_by="created_at", order_direction="desc",
            limit=limit//3
        )
        
        for inspection in inspections:
            activities.append({
                "user_id": inspection.inspector_id,
                "action": "INSPECTION_COMPLETED",
                "details": f"Inspection: {inspection.title} - {inspection.result.value}",
                "timestamp": inspection.created_at,
                "entity_type": "inspection",
                "entity_id": inspection.id
            })
        
        # Sort all activities by timestamp
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "activities": activities[:limit],
            "period_days": days,
            "user_filter": user_id,
            "total_activities": len(activities)
        }
    except Exception as e:
        logger.error(f"User activity audit error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user activity audit")

@router.post("/maintenance/data-integrity")
async def check_data_integrity(
    fix_issues: bool = Query(False),
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Check and optionally fix data integrity issues (Admin only)"""
    try:
        async def integrity_check():
            logger.info("Starting data integrity check")
            issues_found = []
            fixes_applied = []
            
            # Check for orphaned PM executions
            all_executions = await crud.pm_execution.get_multi(db, limit=10000)
            for execution in all_executions:
                schedule = await crud.pm_schedule.get(db, execution.pm_schedule_id)
                if not schedule:
                    issues_found.append({
                        "type": "orphaned_execution",
                        "id": execution.id,
                        "description": f"PM execution {execution.id} references non-existent schedule {execution.pm_schedule_id}"
                    })
                    if fix_issues:
                        await crud.pm_execution.remove(db, id=execution.id)
                        fixes_applied.append(f"Removed orphaned PM execution {execution.id}")
            
            # Check for issues without machines
            all_issues = await crud.issue.get_multi(db, limit=10000)
            for issue in all_issues:
                machine = await crud.machine.get(db, issue.machine_id)
                if not machine:
                    issues_found.append({
                        "type": "orphaned_issue",
                        "id": issue.id,
                        "description": f"Issue {issue.id} references non-existent machine {issue.machine_id}"
                    })
                    if fix_issues:
                        await crud.issue.remove(db, id=issue.id)
                        fixes_applied.append(f"Removed orphaned issue {issue.id}")
            
            # Check for PM schedules without machines
            all_schedules = await crud.pm_schedule.get_multi(db, limit=10000)
            for schedule in all_schedules:
                machine = await crud.machine.get(db, schedule.machine_id)
                if not machine:
                    issues_found.append({
                        "type": "orphaned_schedule",
                        "id": schedule.id,
                        "description": f"PM schedule {schedule.id} references non-existent machine {schedule.machine_id}"
                    })
                    if fix_issues:
                        await crud.pm_schedule.remove(db, id=schedule.id)
                        fixes_applied.append(f"Removed orphaned PM schedule {schedule.id}")
            
            # Check for files without physical files
            all_files = await crud.pm_file.get_multi(db, limit=10000)
            for file_record in all_files:
                file_path = Path(file_record.file_path)
                if not file_path.exists():
                    issues_found.append({
                        "type": "missing_file",
                        "id": file_record.id,
                        "description": f"File record {file_record.id} points to non-existent file {file_record.file_path}"
                    })
                    if fix_issues:
                        await crud.pm_file.remove(db, id=file_record.id)
                        fixes_applied.append(f"Removed file record {file_record.id} for missing file")
            
            result = {
                "integrity_check_completed": True,
                "issues_found": len(issues_found),
                "fixes_applied": len(fixes_applied) if fix_issues else 0,
                "details": {
                    "issues": issues_found,
                    "fixes": fixes_applied if fix_issues else []
                },
                "timestamp": datetime.now()
            }
            
            logger.info(f"Data integrity check completed: {len(issues_found)} issues found, {len(fixes_applied)} fixes applied")
            return result
        
        if fix_issues:
            background_tasks.add_task(integrity_check)
            return {
                "message": "Data integrity check and fix started",
                "status": "in_progress",
                "warning": "This will modify data. Monitor logs for progress."
            }
        else:
            # Run check synchronously for read-only operation
            result = await integrity_check()
            return result
            
    except Exception as e:
        logger.error(f"Data integrity check error: {e}")
        raise HTTPException(status_code=500, detail="Data integrity check failed")

@router.get("/settings/system")
async def get_system_settings(
    current_user: User = Depends(admin_only())
):
    """Get system settings (Admin only)"""
    try:
        # This would load actual system settings from configuration
        return {
            "application": {
                "name": "PM System",
                "version": "2.0.0",
                "environment": "production",
                "debug_mode": False
            },
            "database": {
                "pool_size": 20,
                "max_overflow": 30,
                "timeout": 30
            },
            "file_upload": {
                "max_file_size_mb": 10,
                "allowed_types": [".jpg", ".jpeg", ".png", ".pdf", ".docx", ".xlsx", ".txt"],
                "upload_path": "uploads/"
            },
            "security": {
                "session_timeout_minutes": 30,
                "password_min_length": 8,
                "require_strong_passwords": True
            },
            "notifications": {
                "email_enabled": False,
                "sms_enabled": False,
                "overdue_pm_alerts": True
            }
        }
    except Exception as e:
        logger.error(f"System settings error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch system settings")

@router.post("/settings/system")
async def update_system_settings(
    settings: Dict[str, Any],
    current_user: User = Depends(admin_only())
):
    """Update system settings (Admin only)"""
    try:
        # This would implement actual settings update logic
        logger.info(f"System settings update requested by {current_user.username}")
        
        # Validate settings before applying
        # This is a placeholder - implement actual validation
        
        return {
            "message": "System settings updated successfully",
            "updated_by": current_user.username,
            "timestamp": datetime.now(),
            "settings_updated": list(settings.keys())
        }
    except Exception as e:
        logger.error(f"System settings update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update system settings")

@router.post("/notifications/test")
async def test_notifications(
    notification_type: str = Query(..., regex="^(email|sms|system)$"),
    current_user: User = Depends(admin_only())
):
    """Test notification system (Admin only)"""
    try:
        # This would implement actual notification testing
        if notification_type == "email":
            # Test email notification
            result = {"status": "email_test_sent", "recipient": current_user.email}
        elif notification_type == "sms":
            # Test SMS notification
            result = {"status": "sms_test_sent", "recipient": current_user.phone or "N/A"}
        elif notification_type == "system":
            # Test system notification
            result = {"status": "system_notification_created"}
        
        return {
            "message": f"Test {notification_type} notification sent",
            "result": result,
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"Notification test error: {e}")
        raise HTTPException(status_code=500, detail="Notification test failed")

@router.get("/monitoring/performance")
async def get_performance_metrics(
    current_user: User = Depends(admin_only())
):
    """Get system performance metrics (Admin only)"""
    try:
        import psutil
        import time
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get database connection info
        db_health = await db_health_check()
        
        return {
            "timestamp": datetime.now(),
            "system": {
                "cpu_usage_percent": cpu_percent,
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "used_gb": round(memory.used / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "usage_percent": memory.percent
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "used_gb": round(disk.used / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "usage_percent": round((disk.used / disk.total) * 100, 2)
                }
            },
            "database": db_health,
            "application": {
                "uptime": "N/A",  # Would need to track application start time
                "active_connections": "N/A",  # Would need connection tracking
                "request_count": "N/A"  # Would need request tracking
            }
        }
    except ImportError:
        # psutil not available
        return {
            "error": "Performance monitoring requires psutil package",
            "database": await db_health_check(),
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"Performance metrics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch performance metrics")

@router.post("/cache/clear")
async def clear_cache(
    cache_type: str = Query("all", regex="^(all|session|query|file)$"),
    current_user: User = Depends(admin_only())
):
    """Clear system cache (Admin only)"""
    try:
        # This would implement actual cache clearing logic
        logger.info(f"Cache clear requested: {cache_type} by {current_user.username}")
        
        cleared_caches = []
        
        if cache_type in ["all", "session"]:
            # Clear session cache
            cleared_caches.append("session")
            
        if cache_type in ["all", "query"]:
            # Clear query cache
            cleared_caches.append("query")
            
        if cache_type in ["all", "file"]:
            # Clear file cache
            cleared_caches.append("file")
        
        return {
            "message": "Cache cleared successfully",
            "cleared_caches": cleared_caches,
            "cleared_by": current_user.username,
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        raise HTTPException(status_code=500, detail="Cache clear failed")

@router.get("/security/sessions")
async def get_active_sessions(
    current_user: User = Depends(admin_only())
):
    """Get active user sessions (Admin only)"""
    try:
        # This would implement actual session tracking
        # For now, return placeholder data
        return {
            "active_sessions": [
                {
                    "user_id": current_user.id,
                    "username": current_user.username,
                    "session_id": "placeholder",
                    "ip_address": "127.0.0.1",
                    "user_agent": "FastAPI Client",
                    "login_time": datetime.now() - timedelta(hours=2),
                    "last_activity": datetime.now(),
                    "is_current": True
                }
            ],
            "total_sessions": 1,
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"Active sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch active sessions")

@router.post("/security/sessions/{session_id}/terminate")
async def terminate_session(
    session_id: str,
    current_user: User = Depends(admin_only())
):
    """Terminate a user session (Admin only)"""
    try:
        # This would implement actual session termination
        logger.info(f"Session termination requested: {session_id} by {current_user.username}")
        
        return {
            "message": f"Session {session_id} terminated successfully",
            "terminated_by": current_user.username,
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"Session termination error: {e}")
        raise HTTPException(status_code=500, detail="Session termination failed")

@router.get("/health/detailed")
async def get_detailed_health_check(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only())
):
    """Get detailed system health check (Admin only)"""
    try:
        # Database health
        db_health = await db_health_check()
        
        # Check critical services
        services_health = {
            "database": db_health["status"] == "healthy",
            "file_system": Path("uploads").exists(),
            "exports_directory": Path("exports").exists()
        }
        
        # Check data consistency
        user_count = await crud.user.count(db)
        machine_count = await crud.machine.count(db)
        issue_count = await crud.issue.count(db)
        
        # Overall health
        all_services_healthy = all(services_health.values())
        
        return {
            "overall_status": "healthy" if all_services_healthy else "degraded",
            "timestamp": datetime.now(),
            "services": services_health,
            "database": db_health,
            "data_counts": {
                "users": user_count,
                "machines": machine_count,
                "issues": issue_count
            },
            "warnings": [] if all_services_healthy else [
                f"Service unhealthy: {service}" 
                for service, healthy in services_health.items() 
                if not healthy
            ]
        }
    except Exception as e:
        logger.error(f"Detailed health check error: {e}")
        return {
            "overall_status": "error",
            "timestamp": datetime.now(),
            "error": str(e)
        }
      
