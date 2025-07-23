"""
CRUD operations for PM System with async database support
"""
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, desc, asc, func, select, update, delete, text
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.exc import IntegrityError, NoResultFound
from pydantic import BaseModel
import logging

from database import Base
from models import (
    User, Property, Room, Machine, Topic, Procedure, PMSchedule, 
    PMExecution, Issue, Inspection, PMFile, UserPropertyAccess,
    UserRole, PMStatus, IssueStatus, IssuePriority, InspectionResult, FrequencyType
)

# Configure logging
logger = logging.getLogger(__name__)

# Type variables for generic CRUD
ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class CRUDError(Exception):
    """Custom exception for CRUD operations"""
    pass

class BaseCRUD(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base CRUD class with common operations"""
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        """Get a single record by ID"""
        try:
            query = select(self.model).where(self.model.id == id)
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting {self.model.__name__} by ID {id}: {e}")
            raise CRUDError(f"Failed to get {self.model.__name__}")
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_direction: str = "asc"
    ) -> List[ModelType]:
        """Get multiple records with filtering and pagination"""
        try:
            query = select(self.model)
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key) and value is not None:
                        column = getattr(self.model, key)
                        if isinstance(value, list):
                            query = query.where(column.in_(value))
                        else:
                            query = query.where(column == value)
            
            # Apply ordering
            if order_by and hasattr(self.model, order_by):
                column = getattr(self.model, order_by)
                if order_direction.lower() == "desc":
                    query = query.order_by(desc(column))
                else:
                    query = query.order_by(asc(column))
            
            # Apply pagination
            query = query.offset(skip).limit(limit)
            
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting multiple {self.model.__name__}: {e}")
            raise CRUDError(f"Failed to get {self.model.__name__} list")
    
    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record"""
        try:
            obj_data = obj_in.model_dump() if hasattr(obj_in, 'model_dump') else obj_in.dict()
            db_obj = self.model(**obj_data)
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            logger.info(f"Created {self.model.__name__} with ID: {db_obj.id}")
            return db_obj
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Integrity error creating {self.model.__name__}: {e}")
            raise CRUDError(f"Data integrity violation")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating {self.model.__name__}: {e}")
            raise CRUDError(f"Failed to create {self.model.__name__}")
    
    async def update(
        self, 
        db: AsyncSession, 
        *, 
        db_obj: ModelType, 
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """Update an existing record"""
        try:
            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.model_dump(exclude_unset=True) if hasattr(obj_in, 'model_dump') else obj_in.dict(exclude_unset=True)
            
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            # Update timestamp if exists
            if hasattr(db_obj, 'updated_at'):
                db_obj.updated_at = datetime.now()
            
            await db.commit()
            await db.refresh(db_obj)
            logger.info(f"Updated {self.model.__name__} with ID: {db_obj.id}")
            return db_obj
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating {self.model.__name__}: {e}")
            raise CRUDError(f"Failed to update {self.model.__name__}")
    
    async def remove(self, db: AsyncSession, *, id: int) -> ModelType:
        """Hard delete a record"""
        try:
            obj = await self.get(db, id)
            if not obj:
                raise CRUDError(f"{self.model.__name__} not found")
            
            await db.delete(obj)
            await db.commit()
            logger.info(f"Deleted {self.model.__name__} with ID: {id}")
            return obj
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting {self.model.__name__}: {e}")
            raise CRUDError(f"Failed to delete {self.model.__name__}")
    
    async def soft_delete(self, db: AsyncSession, *, id: int) -> ModelType:
        """Soft delete a record (set is_active = False)"""
        try:
            obj = await self.get(db, id)
            if not obj:
                raise CRUDError(f"{self.model.__name__} not found")
            
            if hasattr(obj, 'is_active'):
                obj.is_active = False
                if hasattr(obj, 'updated_at'):
                    obj.updated_at = datetime.now()
                await db.commit()
                await db.refresh(obj)
                logger.info(f"Soft deleted {self.model.__name__} with ID: {id}")
                return obj
            else:
                return await self.remove(db, id=id)
        except Exception as e:
            await db.rollback()
            logger.error(f"Error soft deleting {self.model.__name__}: {e}")
            raise CRUDError(f"Failed to soft delete {self.model.__name__}")
    
    async def count(self, db: AsyncSession, *, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        try:
            query = select(func.count(self.model.id))
            
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model, key) and value is not None:
                        column = getattr(self.model, key)
                        if isinstance(value, list):
                            query = query.where(column.in_(value))
                        else:
                            query = query.where(column == value)
            
            result = await db.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"Error counting {self.model.__name__}: {e}")
            return 0
    
    async def bulk_create(self, db: AsyncSession, *, objs_in: List[CreateSchemaType]) -> List[ModelType]:
        """Bulk create multiple records"""
        try:
            db_objs = []
            for obj_in in objs_in:
                obj_data = obj_in.model_dump() if hasattr(obj_in, 'model_dump') else obj_in.dict()
                db_obj = self.model(**obj_data)
                db_objs.append(db_obj)
            
            db.add_all(db_objs)
            await db.commit()
            
            for db_obj in db_objs:
                await db.refresh(db_obj)
            
            logger.info(f"Bulk created {len(db_objs)} {self.model.__name__} records")
            return db_objs
        except Exception as e:
            await db.rollback()
            logger.error(f"Error bulk creating {self.model.__name__}: {e}")
            raise CRUDError(f"Failed to bulk create {self.model.__name__}")

class CRUDUser(BaseCRUD[User, Any, Any]):
    """CRUD operations for User model"""
    
    async def get_by_username(self, db: AsyncSession, *, username: str) -> Optional[User]:
        """Get user by username"""
        try:
            query = select(User).where(User.username == username)
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by username {username}: {e}")
            return None
    
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            query = select(User).where(User.email == email)
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    async def get_active_users(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all active users"""
        return await self.get_multi(
            db, skip=skip, limit=limit, 
            filters={"is_active": True},
            order_by="first_name"
        )
    
    async def get_by_role(self, db: AsyncSession, *, role: UserRole, skip: int = 0, limit: int = 100) -> List[User]:
        """Get users by role"""
        return await self.get_multi(
            db, skip=skip, limit=limit,
            filters={"role": role, "is_active": True},
            order_by="first_name"
        )
    
    async def search_users(self, db: AsyncSession, *, search_term: str, limit: int = 10) -> List[User]:
        """Search users by name, username, or email"""
        try:
            search_pattern = f"%{search_term}%"
            query = (
                select(User)
                .where(
                    and_(
                        User.is_active == True,
                        or_(
                            User.username.ilike(search_pattern),
                            User.first_name.ilike(search_pattern),
                            User.last_name.ilike(search_pattern),
                            User.email.ilike(search_pattern)
                        )
                    )
                )
                .order_by(User.first_name, User.last_name)
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching users: {e}")
            return []

class CRUDMachine(BaseCRUD[Machine, Any, Any]):
    """CRUD operations for Machine model"""
    
    async def get_with_room(self, db: AsyncSession, id: int) -> Optional[Machine]:
        """Get machine with room information"""
        try:
            query = (
                select(Machine)
                .options(selectinload(Machine.room).selectinload(Room.property))
                .where(Machine.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting machine with room: {e}")
            return None
    
    async def get_by_serial_number(self, db: AsyncSession, *, serial_number: str) -> Optional[Machine]:
        """Get machine by serial number"""
        try:
            query = select(Machine).where(Machine.serial_number == serial_number)
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting machine by serial number: {e}")
            return None
    
    async def get_by_room(self, db: AsyncSession, *, room_id: int, include_inactive: bool = False) -> List[Machine]:
        """Get all machines in a room"""
        filters = {"room_id": room_id}
        if not include_inactive:
            filters["is_active"] = True
        
        return await self.get_multi(
            db, filters=filters,
            order_by="name"
        )
    
    async def search_machines(self, db: AsyncSession, *, search_term: str, limit: int = 10) -> List[Machine]:
        """Search machines by name, model, or serial number"""
        try:
            search_pattern = f"%{search_term}%"
            query = (
                select(Machine)
                .options(selectinload(Machine.room))
                .where(
                    and_(
                        Machine.is_active == True,
                        or_(
                            Machine.name.ilike(search_pattern),
                            Machine.model.ilike(search_pattern),
                            Machine.serial_number.ilike(search_pattern),
                            Machine.description.ilike(search_pattern)
                        )
                    )
                )
                .order_by(Machine.name)
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching machines: {e}")
            return []

class CRUDPMSchedule(BaseCRUD[PMSchedule, Any, Any]):
    """CRUD operations for PM Schedule model"""
    
    async def get_with_relations(self, db: AsyncSession, id: int) -> Optional[PMSchedule]:
        """Get PM schedule with all related data"""
        try:
            query = (
                select(PMSchedule)
                .options(
                    selectinload(PMSchedule.machine),
                    selectinload(PMSchedule.procedure).selectinload(Procedure.topic),
                    selectinload(PMSchedule.responsible_user)
                )
                .where(PMSchedule.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting PM schedule with relations: {e}")
            return None
    
    async def get_overdue(self, db: AsyncSession, *, limit: int = 50) -> List[PMSchedule]:
        """Get overdue PM schedules"""
        try:
            query = (
                select(PMSchedule)
                .options(
                    selectinload(PMSchedule.machine),
                    selectinload(PMSchedule.procedure),
                    selectinload(PMSchedule.responsible_user)
                )
                .where(
                    and_(
                        PMSchedule.is_active == True,
                        PMSchedule.next_due < datetime.now()
                    )
                )
                .order_by(PMSchedule.next_due)
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting overdue PM schedules: {e}")
            return []
    
    async def get_upcoming(self, db: AsyncSession, *, days: int = 7, limit: int = 50) -> List[PMSchedule]:
        """Get upcoming PM schedules"""
        try:
            end_date = datetime.now() + timedelta(days=days)
            query = (
                select(PMSchedule)
                .options(
                    selectinload(PMSchedule.machine),
                    selectinload(PMSchedule.procedure),
                    selectinload(PMSchedule.responsible_user)
                )
                .where(
                    and_(
                        PMSchedule.is_active == True,
                        PMSchedule.next_due.between(datetime.now(), end_date)
                    )
                )
                .order_by(PMSchedule.next_due)
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting upcoming PM schedules: {e}")
            return []
    
    async def get_by_machine(self, db: AsyncSession, *, machine_id: int) -> List[PMSchedule]:
        """Get all PM schedules for a machine"""
        return await self.get_multi(
            db, filters={"machine_id": machine_id, "is_active": True},
            order_by="next_due"
        )
    
    async def get_by_user(self, db: AsyncSession, *, user_id: int) -> List[PMSchedule]:
        """Get all PM schedules assigned to a user"""
        return await self.get_multi(
            db, filters={"user_id": user_id, "is_active": True},
            order_by="next_due"
        )
    
    async def update_next_due(self, db: AsyncSession, *, schedule_id: int, next_due: datetime) -> Optional[PMSchedule]:
        """Update the next due date for a PM schedule"""
        try:
            schedule = await self.get(db, schedule_id)
            if schedule:
                schedule.next_due = next_due
                schedule.updated_at = datetime.now()
                await db.commit()
                await db.refresh(schedule)
                logger.info(f"Updated next due date for PM schedule {schedule_id}")
            return schedule
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating next due date: {e}")
            return None

class CRUDPMExecution(BaseCRUD[PMExecution, Any, Any]):
    """CRUD operations for PM Execution model"""
    
    async def get_with_relations(self, db: AsyncSession, id: int) -> Optional[PMExecution]:
        """Get PM execution with all related data"""
        try:
            query = (
                select(PMExecution)
                .options(
                    selectinload(PMExecution.pm_schedule).selectinload(PMSchedule.machine),
                    selectinload(PMExecution.pm_schedule).selectinload(PMSchedule.procedure),
                    selectinload(PMExecution.executor)
                )
                .where(PMExecution.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting PM execution with relations: {e}")
            return None
    
    async def get_by_schedule(self, db: AsyncSession, *, schedule_id: int, limit: int = 10) -> List[PMExecution]:
        """Get PM executions for a specific schedule"""
        return await self.get_multi(
            db, filters={"pm_schedule_id": schedule_id},
            order_by="created_at", order_direction="desc",
            limit=limit
        )
    
    async def get_completed_today(self, db: AsyncSession) -> List[PMExecution]:
        """Get PM executions completed today"""
        try:
            today = datetime.now().date()
            query = (
                select(PMExecution)
                .options(
                    selectinload(PMExecution.pm_schedule).selectinload(PMSchedule.machine),
                    selectinload(PMExecution.executor)
                )
                .where(
                    and_(
                        PMExecution.status == PMStatus.COMPLETED,
                        PMExecution.completed_at >= datetime.combine(today, datetime.min.time())
                    )
                )
                .order_by(desc(PMExecution.completed_at))
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting completed PM executions today: {e}")
            return []
    
    async def start_execution(self, db: AsyncSession, *, execution_id: int, executor_id: int) -> Optional[PMExecution]:
        """Start a PM execution"""
        try:
            execution = await self.get(db, execution_id)
            if execution and execution.status == PMStatus.SCHEDULED:
                execution.status = PMStatus.IN_PROGRESS
                execution.started_at = datetime.now()
                execution.executed_by_id = executor_id
                execution.updated_at = datetime.now()
                await db.commit()
                await db.refresh(execution)
                logger.info(f"Started PM execution {execution_id}")
            return execution
        except Exception as e:
            await db.rollback()
            logger.error(f"Error starting PM execution: {e}")
            return None
    
    async def complete_execution(
        self, 
        db: AsyncSession, 
        *, 
        execution_id: int, 
        notes: Optional[str] = None
    ) -> Optional[PMExecution]:
        """Complete a PM execution and update the schedule"""
        try:
            execution = await self.get_with_relations(db, execution_id)
            if not execution:
                return None
            
            # Update execution
            execution.status = PMStatus.COMPLETED
            execution.completed_at = datetime.now()
            if notes:
                execution.notes = notes
            execution.updated_at = datetime.now()
            
            # Update the associated schedule
            schedule = execution.pm_schedule
            schedule.last_completed = execution.completed_at
            
            # Calculate next due date
            if schedule.frequency == FrequencyType.DAILY:
                schedule.next_due = execution.completed_at + timedelta(days=schedule.frequency_value)
            elif schedule.frequency == FrequencyType.WEEKLY:
                schedule.next_due = execution.completed_at + timedelta(weeks=schedule.frequency_value)
            elif schedule.frequency == FrequencyType.MONTHLY:
                schedule.next_due = execution.completed_at + timedelta(days=30 * schedule.frequency_value)
            elif schedule.frequency == FrequencyType.QUARTERLY:
                schedule.next_due = execution.completed_at + timedelta(days=90 * schedule.frequency_value)
            elif schedule.frequency == FrequencyType.ANNUAL:
                schedule.next_due = execution.completed_at + timedelta(days=365 * schedule.frequency_value)
            
            execution.next_due_calculated = schedule.next_due
            schedule.updated_at = datetime.now()
            
            await db.commit()
            await db.refresh(execution)
            logger.info(f"Completed PM execution {execution_id}")
            return execution
        except Exception as e:
            await db.rollback()
            logger.error(f"Error completing PM execution: {e}")
            return None

class CRUDIssue(BaseCRUD[Issue, Any, Any]):
    """CRUD operations for Issue model"""
    
    async def get_with_relations(self, db: AsyncSession, id: int) -> Optional[Issue]:
        """Get issue with all related data"""
        try:
            query = (
                select(Issue)
                .options(
                    selectinload(Issue.machine),
                    selectinload(Issue.room),
                    selectinload(Issue.reporter),
                    selectinload(Issue.assignee)
                )
                .where(Issue.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting issue with relations: {e}")
            return None
    
    async def get_open_issues(self, db: AsyncSession, *, limit: int = 50) -> List[Issue]:
        """Get all open issues"""
        return await self.get_multi(
            db, 
            filters={"status": [IssueStatus.OPEN, IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS]},
            order_by="reported_at", order_direction="desc",
            limit=limit
        )
    
    async def get_critical_issues(self, db: AsyncSession, *, limit: int = 20) -> List[Issue]:
        """Get critical priority issues that are not closed"""
        try:
            query = (
                select(Issue)
                .options(
                    selectinload(Issue.machine),
                    selectinload(Issue.assignee)
                )
                .where(
                    and_(
                        Issue.priority == IssuePriority.CRITICAL,
                        Issue.status != IssueStatus.CLOSED
                    )
                )
                .order_by(Issue.reported_at)
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting critical issues: {e}")
            return []
    
    async def get_by_machine(self, db: AsyncSession, *, machine_id: int, limit: int = 20) -> List[Issue]:
        """Get issues for a specific machine"""
        return await self.get_multi(
            db, filters={"machine_id": machine_id},
            order_by="reported_at", order_direction="desc",
            limit=limit
        )
    
    async def get_assigned_to_user(self, db: AsyncSession, *, user_id: int, limit: int = 50) -> List[Issue]:
        """Get issues assigned to a specific user"""
        return await self.get_multi(
            db, filters={"assigned_to_id": user_id},
            order_by="reported_at", order_direction="desc",
            limit=limit
        )
    
    async def assign_issue(self, db: AsyncSession, *, issue_id: int, assignee_id: int) -> Optional[Issue]:
        """Assign an issue to a user"""
        try:
            issue = await self.get(db, issue_id)
            if issue:
                issue.assigned_to_id = assignee_id
                if issue.status == IssueStatus.OPEN:
                    issue.status = IssueStatus.ASSIGNED
                issue.updated_at = datetime.now()
                await db.commit()
                await db.refresh(issue)
                logger.info(f"Assigned issue {issue_id} to user {assignee_id}")
            return issue
        except Exception as e:
            await db.rollback()
            logger.error(f"Error assigning issue: {e}")
            return None
    
    async def resolve_issue(self, db: AsyncSession, *, issue_id: int) -> Optional[Issue]:
        """Mark an issue as resolved"""
        try:
            issue = await self.get(db, issue_id)
            if issue:
                issue.status = IssueStatus.RESOLVED
                issue.resolved_at = datetime.now()
                issue.updated_at = datetime.now()
                await db.commit()
                await db.refresh(issue)
                logger.info(f"Resolved issue {issue_id}")
            return issue
        except Exception as e:
            await db.rollback()
            logger.error(f"Error resolving issue: {e}")
            return None
    
    async def search_issues(self, db: AsyncSession, *, search_term: str, limit: int = 10) -> List[Issue]:
        """Search issues by title or description"""
        try:
            search_pattern = f"%{search_term}%"
            query = (
                select(Issue)
                .options(selectinload(Issue.machine))
                .where(
                    or_(
                        Issue.title.ilike(search_pattern),
                        Issue.description.ilike(search_pattern)
                    )
                )
                .order_by(desc(Issue.reported_at))
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching issues: {e}")
            return []

class CRUDInspection(BaseCRUD[Inspection, Any, Any]):
    """CRUD operations for Inspection model"""
    
    async def get_with_relations(self, db: AsyncSession, id: int) -> Optional[Inspection]:
        """Get inspection with all related data"""
        try:
            query = (
                select(Inspection)
                .options(
                    selectinload(Inspection.machine),
                    selectinload(Inspection.inspector),
                    selectinload(Inspection.procedure)
                )
                .where(Inspection.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting inspection with relations: {e}")
            return None
    
    async def get_by_machine(self, db: AsyncSession, *, machine_id: int, limit: int = 20) -> List[Inspection]:
        """Get inspections for a specific machine"""
        return await self.get_multi(
            db, filters={"machine_id": machine_id},
            order_by="inspection_date", order_direction="desc",
            limit=limit
        )
    
    async def get_failed_inspections(self, db: AsyncSession, *, limit: int = 20) -> List[Inspection]:
        """Get failed inspections that need attention"""
        return await self.get_multi(
            db, 
            filters={"result": [InspectionResult.FAIL, InspectionResult.NEEDS_ATTENTION]},
            order_by="inspection_date", order_direction="desc",
            limit=limit
        )
    
    async def get_recent_inspections(self, db: AsyncSession, *, days: int = 30, limit: int = 50) -> List[Inspection]:
        """Get recent inspections"""
        try:
            start_date = datetime.now() - timedelta(days=days)
            query = (
                select(Inspection)
                .options(
                    selectinload(Inspection.machine),
                    selectinload(Inspection.inspector)
                )
                .where(Inspection.inspection_date >= start_date)
                .order_by(desc(Inspection.inspection_date))
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting recent inspections: {e}")
            return []

class CRUDProperty(BaseCRUD[Property, Any, Any]):
    """CRUD operations for Property model"""
    
    async def get_with_rooms(self, db: AsyncSession, id: int) -> Optional[Property]:
        """Get property with all rooms"""
        try:
            query = (
                select(Property)
                .options(selectinload(Property.rooms))
                .where(Property.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting property with rooms: {e}")
            return None

class CRUDRoom(BaseCRUD[Room, Any, Any]):
    """CRUD operations for Room model"""
    
    async def get_with_machines(self, db: AsyncSession, id: int) -> Optional[Room]:
        """Get room with all machines"""
        try:
            query = (
                select(Room)
                .options(
                    selectinload(Room.property),
                    selectinload(Room.machines)
                )
                .where(Room.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting room with machines: {e}")
            return None
    
    async def get_by_property(self, db: AsyncSession, *, property_id: int) -> List[Room]:
        """Get all rooms in a property"""
        return await self.get_multi(
            db, filters={"property_id": property_id, "is_active": True},
            order_by="name"
        )

class CRUDTopic(BaseCRUD[Topic, Any, Any]):
    """CRUD operations for Topic model"""
    
    async def get_with_procedures(self, db: AsyncSession, id: int) -> Optional[Topic]:
        """Get topic with all procedures"""
        try:
            query = (
                select(Topic)
                .options(selectinload(Topic.procedures))
                .where(Topic.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting topic with procedures: {e}")
            return None

class CRUDProcedure(BaseCRUD[Procedure, Any, Any]):
    """CRUD operations for Procedure model"""
    
    async def get_with_topic(self, db: AsyncSession, id: int) -> Optional[Procedure]:
        """Get procedure with topic"""
        try:
            query = (
                select(Procedure)
                .options(selectinload(Procedure.topic))
                .where(Procedure.id == id)
            )
            result = await db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting procedure with topic: {e}")
            return None
    
    async def get_by_topic(self, db: AsyncSession, *, topic_id: int) -> List[Procedure]:
        """Get all procedures for a topic"""
        return await self.get_multi(
            db, filters={"topic_id": topic_id, "is_active": True},
            order_by="title"
        )
    
    async def search_procedures(self, db: AsyncSession, *, search_term: str, limit: int = 10) -> List[Procedure]:
        """Search procedures by title or description"""
        try:
            search_pattern = f"%{search_term}%"
            query = (
                select(Procedure)
                .options(selectinload(Procedure.topic))
                .where(
                    and_(
                        Procedure.is_active == True,
                        or_(
                            Procedure.title.ilike(search_pattern),
                            Procedure.description.ilike(search_pattern)
                        )
                    )
                )
                .order_by(Procedure.title)
                .limit(limit)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching procedures: {e}")
            return []

class CRUDPMFile(BaseCRUD[PMFile, Any, Any]):
    """CRUD operations for PM File model"""
    
    async def get_by_execution(self, db: AsyncSession, *, execution_id: int) -> List[PMFile]:
        """Get files for a PM execution"""
        return await self.get_multi(
            db, filters={"pm_execution_id": execution_id},
            order_by="uploaded_at"
        )
    
    async def get_by_issue(self, db: AsyncSession, *, issue_id: int) -> List[PMFile]:
        """Get files for an issue"""
        return await self.get_multi(
            db, filters={"issue_id": issue_id},
            order_by="uploaded_at"
        )
    
    async def get_by_inspection(self, db: AsyncSession, *, inspection_id: int) -> List[PMFile]:
        """Get files for an inspection"""
        return await self.get_multi(
            db, filters={"inspection_id": inspection_id},
            order_by="uploaded_at"
        )

class CRUDUserPropertyAccess(BaseCRUD[UserPropertyAccess, Any, Any]):
    """CRUD operations for User Property Access model"""
    
    async def get_user_properties(self, db: AsyncSession, *, user_id: int) -> List[UserPropertyAccess]:
        """Get all property access for a user"""
        try:
            current_time = datetime.now()
            query = (
                select(UserPropertyAccess)
                .options(
                    selectinload(UserPropertyAccess.property),
                    selectinload(UserPropertyAccess.user)
                )
                .where(
                    and_(
                        UserPropertyAccess.user_id == user_id,
                        or_(
                            UserPropertyAccess.expires_at.is_(None),
                            UserPropertyAccess.expires_at > current_time
                        )
                    )
                )
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting user properties: {e}")
            return []
    
    async def get_property_users(self, db: AsyncSession, *, property_id: int) -> List[UserPropertyAccess]:
        """Get all user access for a property"""
        try:
            current_time = datetime.now()
            query = (
                select(UserPropertyAccess)
                .options(
                    selectinload(UserPropertyAccess.property),
                    selectinload(UserPropertyAccess.user)
                )
                .where(
                    and_(
                        UserPropertyAccess.property_id == property_id,
                        or_(
                            UserPropertyAccess.expires_at.is_(None),
                            UserPropertyAccess.expires_at > current_time
                        )
                    )
                )
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting property users: {e}")
            return []

# Create CRUD instances
user = CRUDUser(User)
property_crud = CRUDProperty(Property)
room = CRUDRoom(Room)
machine = CRUDMachine(Machine)
topic = CRUDTopic(Topic)
procedure = CRUDProcedure(Procedure)
pm_schedule = CRUDPMSchedule(PMSchedule)
pm_execution = CRUDPMExecution(PMExecution)
issue = CRUDIssue(Issue)
inspection = CRUDInspection(Inspection)
pm_file = CRUDPMFile(PMFile)
user_property_access = CRUDUserPropertyAccess(UserPropertyAccess)

# Utility functions
async def get_dashboard_data(db: AsyncSession) -> Dict[str, Any]:
    """Get comprehensive dashboard data"""
    try:
        # Get various statistics
        total_machines = await machine.count(db, filters={"is_active": True})
        overdue_pm = await pm_schedule.get_overdue(db, limit=10)
        critical_issues = await issue.get_critical_issues(db, limit=10)
        completed_today = await pm_execution.get_completed_today(db)
        upcoming_pm = await pm_schedule.get_upcoming(db, days=7, limit=10)
        
        return {
            "total_machines": total_machines,
            "overdue_pm_count": len(overdue_pm),
            "critical_issues_count": len(critical_issues),
            "completed_pm_today": len(completed_today),
            "upcoming_pm_week": len(upcoming_pm),
            "overdue_pm": overdue_pm,
            "critical_issues": critical_issues,
            "upcoming_pm": upcoming_pm,
            "completed_today": completed_today
        }
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        return {}

async def search_all_entities(
    db: AsyncSession, 
    search_term: str, 
    limit_per_entity: int = 5
) -> Dict[str, List]:
    """Search across all entities"""
    try:
        results = {
            "machines": await machine.search_machines(db, search_term=search_term, limit=limit_per_entity),
            "users": await user.search_users(db, search_term=search_term, limit=limit_per_entity),
            "issues": await issue.search_issues(db, search_term=search_term, limit=limit_per_entity),
            "procedures": await procedure.search_procedures(db, search_term=search_term, limit=limit_per_entity)
        }
        return results
    except Exception as e:
        logger.error(f"Error in global search: {e}")
        return {}

async def bulk_update_pm_schedules(
    db: AsyncSession,
    schedule_ids: List[int],
    updates: Dict[str, Any]
) -> Dict[str, Any]:
    """Bulk update PM schedules"""
    try:
        success_count = 0
        errors = []
        
        for schedule_id in schedule_ids:
            try:
                schedule_obj = await pm_schedule.get(db, schedule_id)
                if schedule_obj:
                    await pm_schedule.update(db, db_obj=schedule_obj, obj_in=updates)
                    success_count += 1
                else:
                    errors.append({"id": schedule_id, "error": "Schedule not found"})
            except Exception as e:
                errors.append({"id": schedule_id, "error": str(e)})
        
        return {
            "success_count": success_count,
            "error_count": len(errors),
            "errors": errors
        }
    except Exception as e:
        logger.error(f"Error in bulk update: {e}")
        return {"success_count": 0, "error_count": len(schedule_ids), "errors": [str(e)]}
