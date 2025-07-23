"""
Dashboard and analytics routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from database import get_db
from models import User, UserRole, PMStatus, IssueStatus, IssuePriority
from schemas import (
    DashboardStats, PMOverdueItem, RecentActivity, UpcomingPM,
    PaginationParams
)
import crud
from crud import CRUDError
from .auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive dashboard statistics"""
    try:
        dashboard_data = await crud.get_dashboard_data(db)
        
        return DashboardStats(
            total_machines=dashboard_data.get("total_machines", 0),
            active_machines=dashboard_data.get("total_machines", 0),  # Assuming active = total for now
            overdue_pm_count=dashboard_data.get("overdue_pm_count", 0),
            open_issues_count=len(await crud.issue.get_open_issues(db, limit=1000)),
            critical_issues_count=dashboard_data.get("critical_issues_count", 0),
            completed_pm_today=dashboard_data.get("completed_pm_today", 0),
            upcoming_pm_week=dashboard_data.get("upcoming_pm_week", 0),
            total_users=await crud.user.count(db),
            active_users=await crud.user.count(db, filters={"is_active": True})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard statistics")

@router.get("/overdue-pm", response_model=List[PMOverdueItem])
async def get_overdue_pm(
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overdue PM items with priorities"""
    try:
        overdue_schedules = await crud.pm_schedule.get_overdue(db, limit=limit)
        
        items = []
        for schedule in overdue_schedules:
            days_overdue = (datetime.now().date() - schedule.next_due.date()).days
            priority_score = min(days_overdue * 10, 100)  # Cap at 100
            
            items.append(PMOverdueItem(
                id=schedule.id,
                machine_name=schedule.machine.name,
                machine_id=schedule.machine.id,
                procedure_title=schedule.procedure.title,
                procedure_id=schedule.procedure.id,
                next_due=schedule.next_due,
                days_overdue=days_overdue,
                responsible_user=f"{schedule.responsible_user.first_name} {schedule.responsible_user.last_name}",
                responsible_user_id=schedule.responsible_user.id,
                priority_score=priority_score
            ))
        
        return sorted(items, key=lambda x: x.priority_score, reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch overdue PM items")

@router.get("/upcoming-pm", response_model=List[UpcomingPM])
async def get_upcoming_pm(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get upcoming PM items"""
    try:
        upcoming_schedules = await crud.pm_schedule.get_upcoming(db, days=days, limit=limit)
        
        items = []
        for schedule in upcoming_schedules:
            days_until_due = (schedule.next_due.date() - datetime.now().date()).days
            
            items.append(UpcomingPM(
                id=schedule.id,
                machine_name=schedule.machine.name,
                machine_id=schedule.machine.id,
                procedure_title=schedule.procedure.title,
                procedure_id=schedule.procedure.id,
                next_due=schedule.next_due,
                responsible_user=f"{schedule.responsible_user.first_name} {schedule.responsible_user.last_name}",
                responsible_user_id=schedule.responsible_user.id,
                estimated_minutes=schedule.procedure.estimated_minutes,
                days_until_due=days_until_due
            ))
        
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch upcoming PM items")

@router.get("/recent-activity", response_model=List[RecentActivity])
async def get_recent_activity(
    limit: int = Query(20, le=100),
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent system activity"""
    try:
        activities = []
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get recent PM completions
        completed_pm = await crud.pm_execution.get_multi(
            db, 
            filters={"status": PMStatus.COMPLETED},
            order_by="completed_at", order_direction="desc",
            limit=limit//3
        )
        
        for execution in completed_pm:
            if execution.completed_at and execution.completed_at >= cutoff_date:
                execution_with_relations = await crud.pm_execution.get_with_relations(db, execution.id)
                if execution_with_relations:
                    activities.append(RecentActivity(
                        id=execution.id,
                        type="PM_COMPLETED",
                        title=f"PM Completed: {execution_with_relations.pm_schedule.procedure.title}",
                        description=f"on {execution_with_relations.pm_schedule.machine.name}",
                        created_at=execution.completed_at or execution.created_at,
                        user_name=f"{execution_with_relations.executor.first_name} {execution_with_relations.executor.last_name}",
                        user_id=execution_with_relations.executor.id,
                        related_machine_id=execution_with_relations.pm_schedule.machine.id,
                        related_machine_name=execution_with_relations.pm_schedule.machine.name
                    ))
        
        # Get recent issues
        recent_issues = await crud.issue.get_multi(
            db,
            order_by="created_at", order_direction="desc",
            limit=limit//3
        )
        
        for issue in recent_issues:
            if issue.created_at >= cutoff_date:
                issue_with_relations = await crud.issue.get_with_relations(db, issue.id)
                if issue_with_relations:
                    activities.append(RecentActivity(
                        id=issue.id,
                        type="ISSUE_CREATED",
                        title=f"Issue Created: {issue.title}",
                        description=f"Priority: {issue.priority.value}",
                        created_at=issue.created_at,
                        user_name=f"{issue_with_relations.reporter.first_name} {issue_with_relations.reporter.last_name}",
                        user_id=issue_with_relations.reporter.id,
                        related_machine_id=issue.machine_id,
                        related_machine_name=issue_with_relations.machine.name
                    ))
        
        # Get recent inspections
        recent_inspections = await crud.inspection.get_multi(
            db,
            order_by="created_at", order_direction="desc",
            limit=limit//3
        )
        
        for inspection in recent_inspections:
            if inspection.created_at >= cutoff_date:
                inspection_with_relations = await crud.inspection.get_with_relations(db, inspection.id)
                if inspection_with_relations:
                    activities.append(RecentActivity(
                        id=inspection.id,
                        type="INSPECTION_COMPLETED",
                        title=f"Inspection: {inspection.title}",
                        description=f"Result: {inspection.result.value}",
                        created_at=inspection.created_at,
                        user_name=f"{inspection_with_relations.inspector.first_name} {inspection_with_relations.inspector.last_name}",
                        user_id=inspection_with_relations.inspector.id,
                        related_machine_id=inspection.machine_id,
                        related_machine_name=inspection_with_relations.machine.name
                    ))
        
        # Sort all activities by date and return limited results
        activities.sort(key=lambda x: x.created_at, reverse=True)
        return activities[:limit]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch recent activity")

@router.get("/analytics/pm-performance")
async def get_pm_performance_analytics(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Get PM performance analytics (Supervisor+ only)"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get completed PM executions in period
        completed_executions = await crud.pm_execution.get_multi(
            db,
            filters={"status": PMStatus.COMPLETED},
            order_by="completed_at", order_direction="desc",
            limit=1000
        )
        
        # Filter by date
        period_executions = [
            ex for ex in completed_executions 
            if ex.completed_at and ex.completed_at >= cutoff_date
        ]
        
        # Calculate metrics
        total_completed = len(period_executions)
        on_time_count = 0
        overdue_count = 0
        
        for execution in period_executions:
            execution_with_schedule = await crud.pm_execution.get_with_relations(db, execution.id)
            if execution_with_schedule and execution_with_schedule.pm_schedule:
                if execution.completed_at <= execution_with_schedule.pm_schedule.next_due:
                    on_time_count += 1
                else:
                    overdue_count += 1
        
        # Get current overdue count
        current_overdue = len(await crud.pm_schedule.get_overdue(db, limit=1000))
        
        return {
            "period_days": days,
            "total_completed": total_completed,
            "on_time_completed": on_time_count,
            "overdue_completed": overdue_count,
            "on_time_percentage": round((on_time_count / total_completed * 100) if total_completed > 0 else 0, 2),
            "current_overdue": current_overdue,
            "completion_rate": round((total_completed / days), 2)  # Per day
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch PM performance analytics")

@router.get("/analytics/issue-trends")
async def get_issue_trends(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Get issue trends analytics (Supervisor+ only)"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get issues in period
        recent_issues = await crud.issue.get_multi(
            db,
            order_by="reported_at", order_direction="desc",
            limit=1000
        )
        
        # Filter by date
        period_issues = [
            issue for issue in recent_issues 
            if issue.reported_at >= cutoff_date
        ]
        
        # Analyze by priority
        priority_breakdown = {}
        for priority in IssuePriority:
            priority_breakdown[priority.value] = len([
                issue for issue in period_issues if issue.priority == priority
            ])
        
        # Analyze by status
        status_breakdown = {}
        for status in IssueStatus:
            status_breakdown[status.value] = len([
                issue for issue in period_issues if issue.status == status
            ])
        
        # Calculate resolution time for resolved issues
        resolved_issues = [
            issue for issue in period_issues 
            if issue.status in [IssueStatus.RESOLVED, IssueStatus.CLOSED] and issue.resolved_at
        ]
        
        avg_resolution_time = 0
        if resolved_issues:
            total_resolution_time = sum([
                (issue.resolved_at - issue.reported_at).total_seconds() / 3600  # hours
                for issue in resolved_issues
            ])
            avg_resolution_time = round(total_resolution_time / len(resolved_issues), 2)
        
        return {
            "period_days": days,
            "total_issues": len(period_issues),
            "priority_breakdown": priority_breakdown,
            "status_breakdown": status_breakdown,
            "resolved_issues": len(resolved_issues),
            "avg_resolution_time_hours": avg_resolution_time,
            "resolution_rate": round((len(resolved_issues) / len(period_issues) * 100) if period_issues else 0, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch issue trends")

@router.get("/analytics/machine-health")
async def get_machine_health_analytics(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR))
):
    """Get machine health analytics (Supervisor+ only)"""
    try:
        machines = await crud.machine.get_multi(
            db,
            filters={"is_active": True},
            limit=limit,
            order_by="name"
        )
        
        machine_health = []
        
        for machine in machines:
            # Get recent issues for this machine
            machine_issues = await crud.issue.get_by_machine(db, machine_id=machine.id, limit=100)
            
            # Get recent inspections
            machine_inspections = await crud.inspection.get_by_machine(db, machine_id=machine.id, limit=100)
            
            # Get overdue PM schedules
            machine_schedules = await crud.pm_schedule.get_by_machine(db, machine_id=machine.id)
            overdue_schedules = [
                schedule for schedule in machine_schedules 
                if schedule.next_due < datetime.now()
            ]
            
            # Calculate health score (0-100)
            health_score = 100
            
            # Deduct for open issues
            open_issues = [issue for issue in machine_issues if issue.status != IssueStatus.CLOSED]
            health_score -= len(open_issues) * 5  # -5 per open issue
            
            # Deduct more for critical issues
            critical_issues = [issue for issue in open_issues if issue.priority == IssuePriority.CRITICAL]
            health_score -= len(critical_issues) * 15  # Additional -15 per critical issue
            
            # Deduct for overdue PM
            health_score -= len(overdue_schedules) * 10  # -10 per overdue PM
            
            # Deduct for failed inspections
            failed_inspections = [
                insp for insp in machine_inspections 
                if insp.result in ['FAIL', 'NEEDS_ATTENTION']
            ]
            health_score -= len(failed_inspections) * 8  # -8 per failed inspection
            
            # Ensure score is between 0-100
            health_score = max(0, min(100, health_score))
            
            machine_health.append({
                "machine_id": machine.id,
                "machine_name": machine.name,
                "health_score": health_score,
                "open_issues": len(open_issues),
                "critical_issues": len(critical_issues),
                "overdue_pm": len(overdue_schedules),
                "recent_inspections": len(machine_inspections),
                "failed_inspections": len(failed_inspections)
            })
        
        # Sort by health score (worst first)
        machine_health.sort(key=lambda x: x["health_score"])
        
        return {
            "machines": machine_health,
            "avg_health_score": round(sum([m["health_score"] for m in machine_health]) / len(machine_health), 2) if machine_health else 0,
            "machines_needing_attention": len([m for m in machine_health if m["health_score"] < 70])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch machine health analytics")

@router.get("/analytics/user-productivity")
async def get_user_productivity(
    days: int = Query(30, ge=7, le=365),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.MANAGER))
):
    """Get user productivity analytics (Manager+ only)"""
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get active users
        users = await crud.user.get_multi(
            db,
            filters={"is_active": True},
            limit=limit,
            order_by="first_name"
        )
        
        user_productivity = []
        
        for user in users:
            # Get completed PM executions
            user_executions = await crud.pm_execution.get_multi(
                db,
                filters={"executed_by_id": user.id, "status": PMStatus.COMPLETED},
                limit=1000
            )
            
            period_executions = [
                ex for ex in user_executions 
                if ex.completed_at and ex.completed_at >= cutoff_date
            ]
            
            # Get resolved issues
            user_issues = await crud.issue.get_multi(
                db,
                filters={"assigned_to_id": user.id, "status": IssueStatus.RESOLVED},
                limit=1000
            )
            
            period_resolved_issues = [
                issue for issue in user_issues 
                if issue.resolved_at and issue.resolved_at >= cutoff_date
            ]
            
            # Get inspections
            user_inspections = await crud.inspection.get_multi(
                db,
                filters={"inspector_id": user.id},
                limit=1000
            )
            
            period_inspections = [
                insp for insp in user_inspections 
                if insp.created_at >= cutoff_date
            ]
            
            user_productivity.append({
                "user_id": user.id,
                "user_name": f"{user.first_name} {user.last_name}",
                "role": user.role.value,
                "completed_pm": len(period_executions),
                "resolved_issues": len(period_resolved_issues),
                "inspections_completed": len(period_inspections),
                "total_activities": len(period_executions) + len(period_resolved_issues) + len(period_inspections)
            })
        
        # Sort by total activities (most productive first)
        user_productivity.sort(key=lambda x: x["total_activities"], reverse=True)
        
        return {
            "period_days": days,
            "users": user_productivity,
            "total_activities": sum([u["total_activities"] for u in user_productivity]),
            "avg_activities_per_user": round(sum([u["total_activities"] for u in user_productivity]) / len(user_productivity), 2) if user_productivity else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch user productivity analytics")

@router.get("/my-dashboard")
async def get_my_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get personalized dashboard for current user"""
    try:
        # Get user's assigned PM schedules
        my_pm_schedules = await crud.pm_schedule.get_by_user(db, user_id=current_user.id)
        
        # Get user's assigned issues
        my_issues = await crud.issue.get_assigned_to_user(db, user_id=current_user.id, limit=50)
        
        # Get user's recent PM executions
        my_executions = await crud.pm_execution.get_multi(
            db,
            filters={"executed_by_id": current_user.id},
            order_by="created_at", order_direction="desc",
            limit=10
        )
        
        # Get user's recent inspections
        my_inspections = await crud.inspection.get_multi(
            db,
            filters={"inspector_id": current_user.id},
            order_by="created_at", order_direction="desc",
            limit=10
        )
        
        # Calculate user statistics
        overdue_pm = [schedule for schedule in my_pm_schedules if schedule.next_due < datetime.now()]
        upcoming_pm = [
            schedule for schedule in my_pm_schedules 
            if schedule.next_due >= datetime.now() and 
               schedule.next_due <= datetime.now() + timedelta(days=7)
        ]
        open_issues = [issue for issue in my_issues if issue.status != IssueStatus.CLOSED]
        
        return {
            "user": {
                "id": current_user.id,
                "name": f"{current_user.first_name} {current_user.last_name}",
                "role": current_user.role.value
            },
            "summary": {
                "total_pm_schedules": len(my_pm_schedules),
                "overdue_pm": len(overdue_pm),
                "upcoming_pm": len(upcoming_pm),
                "assigned_issues": len(my_issues),
                "open_issues": len(open_issues),
                "recent_executions": len(my_executions),
                "recent_inspections": len(my_inspections)
            },
            "overdue_pm": overdue_pm[:5],  # Limit to 5 most overdue
            "upcoming_pm": upcoming_pm[:5],  # Limit to 5 next upcoming
            "open_issues": open_issues[:5],  # Limit to 5 most recent open issues
            "recent_executions": my_executions[:5],
            "recent_inspections": my_inspections[:5]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch personal dashboard")
