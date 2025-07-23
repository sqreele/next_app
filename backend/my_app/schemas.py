"""
Pydantic schemas for PM System API
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Import enums from models
from models import (
    UserRole, FrequencyType, PMStatus, IssueStatus, IssuePriority,
    InspectionResult, ImageType, AccessLevel
)

# Base schemas
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# User Schemas
class UserBase(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole
    is_active: bool = True

class UserCreate(UserBase):
    pass

class UserUpdate(BaseSchema):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Property Schemas
class PropertyBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    address: Optional[str] = None
    is_active: bool = True

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = None
    is_active: Optional[bool] = None

class Property(PropertyBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Room Schemas
class RoomBase(BaseSchema):
    property_id: int
    name: str = Field(..., min_length=1, max_length=100)
    room_number: Optional[str] = Field(None, max_length=20)
    is_active: bool = True

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    room_number: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None

class Room(RoomBase):
    id: int
    created_at: datetime
    updated_at: datetime
    property: Optional[Property] = None

# Machine Schemas
class MachineBase(BaseSchema):
    room_id: int
    name: str = Field(..., min_length=1, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: bool = True

class MachineCreate(MachineBase):
    pass

class MachineUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Machine(MachineBase):
    id: int
    created_at: datetime
    updated_at: datetime
    room: Optional[Room] = None

# Topic Schemas
class TopicBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: bool = True

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Topic(TopicBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Procedure Schemas
class ProcedureBase(BaseSchema):
    topic_id: int
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    instructions: Optional[str] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)
    is_active: bool = True

class ProcedureCreate(ProcedureBase):
    pass

class ProcedureUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    instructions: Optional[str] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class Procedure(ProcedureBase):
    id: int
    created_at: datetime
    updated_at: datetime
    topic: Optional[Topic] = None

# PM Schedule Schemas
class PMScheduleBase(BaseSchema):
    machine_id: int
    procedure_id: int
    user_id: int
    frequency: FrequencyType
    frequency_value: int = Field(default=1, ge=1)
    last_completed: Optional[datetime] = None
    next_due: datetime
    is_active: bool = True

class PMScheduleCreate(PMScheduleBase):
    pass

class PMScheduleUpdate(BaseSchema):
    procedure_id: Optional[int] = None
    user_id: Optional[int] = None
    frequency: Optional[FrequencyType] = None
    frequency_value: Optional[int] = Field(None, ge=1)
    last_completed: Optional[datetime] = None
    next_due: Optional[datetime] = None
    is_active: Optional[bool] = None

class PMSchedule(PMScheduleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    machine: Optional[Machine] = None
    procedure: Optional[Procedure] = None
    responsible_user: Optional[User] = None

# PM Execution Schemas
class PMExecutionBase(BaseSchema):
    pm_schedule_id: int
    executed_by_id: int
    status: PMStatus = PMStatus.SCHEDULED
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_due_calculated: Optional[datetime] = None

class PMExecutionCreate(PMExecutionBase):
    pass

class PMExecutionUpdate(BaseSchema):
    status: Optional[PMStatus] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_due_calculated: Optional[datetime] = None

class PMExecution(PMExecutionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    pm_schedule: Optional[PMSchedule] = None
    executor: Optional[User] = None

# Issue Schemas
class IssueBase(BaseSchema):
    machine_id: int
    room_id: Optional[int] = None
    reported_by_id: int
    assigned_to_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: IssuePriority = IssuePriority.MEDIUM
    status: IssueStatus = IssueStatus.OPEN

class IssueCreate(IssueBase):
    pass

class IssueUpdate(BaseSchema):
    assigned_to_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[IssuePriority] = None
    status: Optional[IssueStatus] = None
    resolved_at: Optional[datetime] = None

class Issue(IssueBase):
    id: int
    reported_at: datetime
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    machine: Optional[Machine] = None
    room: Optional[Room] = None
    reporter: Optional[User] = None
    assignee: Optional[User] = None

# Inspection Schemas
class InspectionBase(BaseSchema):
    machine_id: int
    inspector_id: int
    procedure_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=200)
    findings: Optional[str] = None
    result: InspectionResult
    inspection_date: datetime

class InspectionCreate(InspectionBase):
    pass

class InspectionUpdate(BaseSchema):
    procedure_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    findings: Optional[str] = None
    result: Optional[InspectionResult] = None
    inspection_date: Optional[datetime] = None

class Inspection(InspectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    machine: Optional[Machine] = None
    inspector: Optional[User] = None
    procedure: Optional[Procedure] = None

# PM File Schemas
class PMFileBase(BaseSchema):
    pm_execution_id: Optional[int] = None
    issue_id: Optional[int] = None
    inspection_id: Optional[int] = None
    file_name: str = Field(..., min_length=1, max_length=255)
    file_path: str = Field(..., min_length=1, max_length=500)
    file_type: str = Field(..., min_length=1, max_length=50)
    image_type: Optional[ImageType] = None
    description: Optional[str] = None

class PMFileCreate(PMFileBase):
    pass

class PMFileUpdate(BaseSchema):
    file_name: Optional[str] = Field(None, min_length=1, max_length=255)
    file_path: Optional[str] = Field(None, min_length=1, max_length=500)
    file_type: Optional[str] = Field(None, min_length=1, max_length=50)
    image_type: Optional[ImageType] = None
    description: Optional[str] = None

class PMFile(PMFileBase):
    id: int
    uploaded_at: datetime

# User Property Access Schemas
class UserPropertyAccessBase(BaseSchema):
    user_id: int
    property_id: int
    access_level: AccessLevel
    expires_at: Optional[datetime] = None

class UserPropertyAccessCreate(UserPropertyAccessBase):
    pass

class UserPropertyAccessUpdate(BaseSchema):
    access_level: Optional[AccessLevel] = None
    expires_at: Optional[datetime] = None

class UserPropertyAccess(UserPropertyAccessBase):
    granted_at: datetime
    user: Optional[User] = None
    property: Optional[Property] = None

# Dashboard/Analytics Schemas
class DashboardStats(BaseSchema):
    total_machines: int
    overdue_pm_count: int
    open_issues_count: int
    critical_issues_count: int
    completed_pm_today: int
    upcoming_pm_week: int

class PMOverdueItem(BaseSchema):
    id: int
    machine_name: str
    procedure_title: str
    next_due: datetime
    days_overdue: int
    responsible_user: str

class RecentActivity(BaseSchema):
    type: str  # "PM_COMPLETED", "ISSUE_CREATED", "INSPECTION_COMPLETED"
    title: str
    description: str
    created_at: datetime
    user_name: str
