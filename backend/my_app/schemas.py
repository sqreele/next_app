"""
Pydantic schemas for PM System API with enhanced validation
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Import enums from models
from models import (
    UserRole, FrequencyType, PMStatus, IssueStatus, IssuePriority,
    InspectionResult, ImageType, AccessLevel, WorkOrderType, WorkOrderStatus,
    JobStatus
)

# Base schemas with enhanced configuration
class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True
    )

# User Schemas
class UserBase(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20, pattern=r'^\+?[\d\s\-\(\)]+$')
    role: UserRole
    is_active: bool = True

class UserCreate(UserBase):
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('Username must be alphanumeric with optional underscores')
        return v.lower()

class UserUpdate(BaseSchema):
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20, pattern=r'^\+?[\d\s\-\(\)]+$')
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

class UserSummary(BaseSchema):
    id: int
    username: str
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

# Property Schemas
class PropertyBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    is_active: bool = True

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

class Property(PropertyBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Room Schemas
class RoomBase(BaseSchema):
    property_id: int = Field(..., gt=0)
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
    room_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: bool = True

class MachineCreate(MachineBase):
    @validator('serial_number')
    def validate_serial_number(cls, v):
        return v.upper().strip()
    
    @validator('room_id')
    def validate_room_id(cls, v):
        if v is None or v <= 0:
            raise ValueError('room_id is required and must be a positive integer')
        return v

class MachineUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None

class Machine(MachineBase):
    id: int
    created_at: datetime
    updated_at: datetime
    room: Optional[Room] = None

class MachineSummary(BaseSchema):
    id: int
    name: str
    model: Optional[str]
    serial_number: str
    is_active: bool

# Topic Schemas
class TopicBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: bool = True

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None

class Topic(TopicBase):
    id: int
    created_at: datetime
    updated_at: datetime

# Procedure Schemas
class ProcedureBase(BaseSchema):
    topic_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    instructions: Optional[str] = Field(None, max_length=5000)
    estimated_minutes: Optional[int] = Field(None, ge=1, le=1440)  # Max 24 hours
    is_active: bool = True

class ProcedureCreate(ProcedureBase):
    machine_ids: Optional[List[int]] = []  # Optional list of machine IDs to associate

class ProcedureUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    instructions: Optional[str] = Field(None, max_length=5000)
    estimated_minutes: Optional[int] = Field(None, ge=1, le=1440)
    is_active: Optional[bool] = None
    machine_ids: Optional[List[int]] = None  # Optional list of machine IDs to update associations

class Procedure(ProcedureBase):
    id: int
    created_at: datetime
    updated_at: datetime
    topic: Optional[Topic] = None

# Machine-Procedure Many-to-Many Schemas
class MachineWithProcedures(BaseSchema):
    id: int
    room_id: int
    name: str
    model: Optional[str]
    serial_number: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    room: Optional[Room] = None
    procedures: List[Procedure] = []

class ProcedureWithMachines(BaseSchema):
    id: int
    topic_id: int
    title: str
    description: Optional[str]
    instructions: Optional[str]
    estimated_minutes: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    topic: Optional[Topic] = None
    machines: List[MachineSummary] = []

# PM Schedule Schemas
class PMScheduleBase(BaseSchema):
    machine_id: int = Field(..., gt=0)
    procedure_id: int = Field(..., gt=0)
    user_id: int = Field(..., gt=0)
    frequency: FrequencyType
    frequency_value: int = Field(default=1, ge=1, le=365)
    last_completed: Optional[datetime] = None
    next_due: datetime
    is_active: bool = True

class PMScheduleCreate(PMScheduleBase):
    @validator('next_due')
    def validate_next_due(cls, v):
        if v <= datetime.now():
            raise ValueError('Next due date must be in the future')
        return v

class PMScheduleUpdate(BaseSchema):
    procedure_id: Optional[int] = Field(None, gt=0)
    user_id: Optional[int] = Field(None, gt=0)
    frequency: Optional[FrequencyType] = None
    frequency_value: Optional[int] = Field(None, ge=1, le=365)
    last_completed: Optional[datetime] = None
    next_due: Optional[datetime] = None
    is_active: Optional[bool] = None

class PMSchedule(PMScheduleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    machine: Optional[MachineSummary] = None
    procedure: Optional[Procedure] = None
    responsible_user: Optional[UserSummary] = None

# PM Execution Schemas
class PMExecutionBase(BaseSchema):
    pm_schedule_id: int = Field(..., gt=0)
    executed_by_id: int = Field(..., gt=0)
    status: PMStatus = PMStatus.SCHEDULED
    notes: Optional[str] = Field(None, max_length=2000)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_due_calculated: Optional[datetime] = None

class PMExecutionCreate(PMExecutionBase):
    pass

class PMExecutionUpdate(BaseSchema):
    status: Optional[PMStatus] = None
    notes: Optional[str] = Field(None, max_length=2000)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_due_calculated: Optional[datetime] = None

class PMExecution(PMExecutionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    pm_schedule: Optional[PMSchedule] = None
    executor: Optional[UserSummary] = None

# Issue Schemas
class IssueBase(BaseSchema):
    machine_id: int = Field(..., gt=0)
    room_id: Optional[int] = Field(None, gt=0)
    reported_by_id: int = Field(..., gt=0)
    assigned_to_id: Optional[int] = Field(None, gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    priority: IssuePriority = IssuePriority.MEDIUM
    status: IssueStatus = IssueStatus.OPEN

class IssueCreate(IssueBase):
    pass

class IssueUpdate(BaseSchema):
    assigned_to_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Optional[IssuePriority] = None
    status: Optional[IssueStatus] = None
    resolved_at: Optional[datetime] = None

class Issue(IssueBase):
    id: int
    reported_at: datetime
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    machine: Optional[MachineSummary] = None
    room: Optional[Room] = None
    reporter: Optional[UserSummary] = None
    assignee: Optional[UserSummary] = None

# Inspection Schemas
class InspectionBase(BaseSchema):
    machine_id: int = Field(..., gt=0)
    inspector_id: int = Field(..., gt=0)
    procedure_id: Optional[int] = Field(None, gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    findings: Optional[str] = Field(None, max_length=2000)
    result: InspectionResult
    inspection_date: datetime

class InspectionCreate(InspectionBase):
    @validator('inspection_date')
    def validate_inspection_date(cls, v):
        if v > datetime.now():
            raise ValueError('Inspection date cannot be in the future')
        return v

class InspectionUpdate(BaseSchema):
    procedure_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    findings: Optional[str] = Field(None, max_length=2000)
    result: Optional[InspectionResult] = None
    inspection_date: Optional[datetime] = None

class Inspection(InspectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    machine: Optional[MachineSummary] = None
    inspector: Optional[UserSummary] = None
    procedure: Optional[Procedure] = None

# PM File Schemas
class PMFileBase(BaseSchema):
    pm_execution_id: Optional[int] = Field(None, gt=0)
    issue_id: Optional[int] = Field(None, gt=0)
    inspection_id: Optional[int] = Field(None, gt=0)
    file_name: str = Field(..., min_length=1, max_length=255)
    file_path: str = Field(..., min_length=1, max_length=500)
    file_type: str = Field(..., min_length=1, max_length=50)
    image_type: Optional[ImageType] = None
    description: Optional[str] = Field(None, max_length=500)

class PMFileCreate(PMFileBase):
    @validator('file_name')
    def validate_file_name(cls, v):
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.pdf', '.docx', '.xlsx', '.txt'}
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError(f'File type not allowed. Allowed: {", ".join(allowed_extensions)}')
        return v

class PMFileUpdate(BaseSchema):
    file_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)

class PMFile(PMFileBase):
    id: int
    uploaded_at: datetime

# User Property Access Schemas
class UserPropertyAccessBase(BaseSchema):
    user_id: int = Field(..., gt=0)
    property_id: int = Field(..., gt=0)
    access_level: AccessLevel
    expires_at: Optional[datetime] = None

class UserPropertyAccessCreate(UserPropertyAccessBase):
    pass

class UserPropertyAccessUpdate(BaseSchema):
    access_level: Optional[AccessLevel] = None
    expires_at: Optional[datetime] = None

class UserPropertyAccess(UserPropertyAccessBase):
    granted_at: datetime
    user: Optional[UserSummary] = None
    property: Optional[Property] = None

# Dashboard/Analytics Schemas
class DashboardStats(BaseSchema):
    total_machines: int
    active_machines: int
    overdue_pm_count: int
    open_issues_count: int
    critical_issues_count: int
    completed_pm_today: int
    upcoming_pm_week: int
    total_users: int
    active_users: int

class PMOverdueItem(BaseSchema):
    id: int
    machine_name: str
    machine_id: int
    procedure_title: str
    procedure_id: int
    next_due: datetime
    days_overdue: int
    responsible_user: str
    responsible_user_id: int
    priority_score: int  # Calculated priority based on days overdue

class RecentActivity(BaseSchema):
    id: int
    type: str  # "PM_COMPLETED", "ISSUE_CREATED", "INSPECTION_COMPLETED"
    title: str
    description: str
    created_at: datetime
    user_name: str
    user_id: int
    related_machine_id: Optional[int] = None
    related_machine_name: Optional[str] = None

class UpcomingPM(BaseSchema):
    id: int
    machine_name: str
    machine_id: int
    procedure_title: str
    procedure_id: int
    next_due: datetime
    responsible_user: str
    responsible_user_id: int
    estimated_minutes: Optional[int]
    days_until_due: int

# Search and Filter Schemas
class SearchRequest(BaseSchema):
    query: str = Field(..., min_length=1, max_length=100)
    entity_types: Optional[List[str]] = None  # ['machines', 'issues', 'procedures']
    limit: int = Field(default=10, ge=1, le=50)

class SearchResult(BaseSchema):
    type: str  # 'machine', 'issue', 'procedure', etc.
    id: int
    title: str
    description: Optional[str]
    score: float  # Relevance score

class FilterRequest(BaseSchema):
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    user_id: Optional[int] = None
    machine_id: Optional[int] = None

# Bulk Operations
class BulkUpdateRequest(BaseSchema):
    ids: List[int] = Field(..., min_items=1, max_items=100)
    updates: dict

class BulkOperationResult(BaseSchema):
    success_count: int
    error_count: int
    errors: List[dict] = []

# Pagination
class PaginationParams(BaseSchema):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size

class PaginatedResponse(BaseSchema):
    items: List[dict]
    total: int
    page: int
    size: int
    pages: int
    
    @validator('pages', pre=True, always=True)
    def calculate_pages(cls, v, values):
        total = values.get('total', 0)
        size = values.get('size', 20)
        return (total + size - 1) // size if total > 0 else 1

# WorkOrder Schemas
class WorkOrderBase(BaseSchema):
    machine_id: Optional[int] = Field(None, gt=0)  # Made optional for general work orders
    room_id: Optional[int] = Field(None, gt=0)
    property_id: Optional[int] = Field(None, gt=0)
    assigned_to_id: Optional[int] = Field(None, gt=0)
    topic_id: Optional[int] = Field(None, gt=0)
    procedure_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=2000)
    status: WorkOrderStatus = WorkOrderStatus.SCHEDULED
    priority: Optional[IssuePriority] = None  # Made optional for general work orders
    type: WorkOrderType
    frequency: Optional[FrequencyType] = None
    due_date: Optional[datetime] = None
    estimated_duration: Optional[int] = Field(None, gt=0, le=480)  # Duration in minutes, max 8 hours
    safety_requirements: Optional[str] = Field(None, max_length=500)
    required_tools: Optional[str] = Field(None, max_length=500)
    required_parts: Optional[str] = Field(None, max_length=500)
    special_instructions: Optional[str] = Field(None, max_length=1000)
    cost_estimate: Optional[float] = Field(None, ge=0, le=1000000)  # Cost in dollars

class WorkOrderCreate(WorkOrderBase):
    topic_ids: Optional[List[int]] = []  # List of topic IDs for many-to-many relationship

class WorkOrderUpdate(BaseSchema):
    machine_id: Optional[int] = Field(None, gt=0)
    room_id: Optional[int] = Field(None, gt=0)
    property_id: Optional[int] = Field(None, gt=0)
    assigned_to_id: Optional[int] = Field(None, gt=0)
    topic_id: Optional[int] = Field(None, gt=0)
    procedure_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    status: Optional[WorkOrderStatus] = None
    priority: Optional[IssuePriority] = None
    frequency: Optional[FrequencyType] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration: Optional[int] = Field(None, gt=0, le=480)
    safety_requirements: Optional[str] = Field(None, max_length=500)
    required_tools: Optional[str] = Field(None, max_length=500)
    required_parts: Optional[str] = Field(None, max_length=500)
    special_instructions: Optional[str] = Field(None, max_length=1000)
    cost_estimate: Optional[float] = Field(None, ge=0, le=1000000)
    topic_ids: Optional[List[int]] = None  # Update many-to-many relationship

class WorkOrder(WorkOrderBase):
    id: int
    completed_at: Optional[datetime] = None
    before_images: Optional[List[str]] = []
    after_images: Optional[List[str]] = []
    pdf_file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    machine: Optional[MachineSummary] = None
    room: Optional[Room] = None
    property: Optional[Property] = None
    assignee: Optional[UserSummary] = None
    topic: Optional[Topic] = None
    procedure: Optional[Procedure] = None
    topics: List[Topic] = []  # Many-to-many relationship

class WorkOrderWithTopics(BaseSchema):
    id: int
    machine_id: int
    room_id: Optional[int]
    property_id: Optional[int]
    assigned_to_id: Optional[int]
    topic_id: Optional[int]
    procedure_id: Optional[int]
    description: str
    status: WorkOrderStatus
    priority: IssuePriority
    type: WorkOrderType
    frequency: Optional[FrequencyType]
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    before_images: Optional[List[str]] = []
    after_images: Optional[List[str]] = []
    pdf_file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    machine: Optional[MachineSummary] = None
    room: Optional[Room] = None
    property: Optional[Property] = None
    assignee: Optional[UserSummary] = None
    topic: Optional[Topic] = None
    procedure: Optional[Procedure] = None
    topics: List[Topic] = []  # Many-to-many relationship

# WorkOrderFile Schemas
class WorkOrderFileBase(BaseSchema):
    work_order_id: int = Field(..., gt=0)
    file_name: str = Field(..., min_length=1, max_length=255)
    file_path: str = Field(..., min_length=1, max_length=500)
    file_type: str = Field(..., min_length=1, max_length=50)
    image_type: Optional[ImageType] = None
    description: Optional[str] = Field(None, max_length=500)

class WorkOrderFileCreate(WorkOrderFileBase):
    @validator('file_name')
    def validate_file_name(cls, v):
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.pdf', '.docx', '.xlsx', '.txt'}
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError(f'File type not allowed. Allowed: {", ".join(allowed_extensions)}')
        return v

class WorkOrderFileUpdate(BaseSchema):
    file_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)

class WorkOrderFile(WorkOrderFileBase):
    id: int
    uploaded_at: datetime

# Export Schemas
class ExportRequest(BaseSchema):
    format: str = Field(..., pattern='^(csv|xlsx|pdf)$')
    filters: Optional[FilterRequest] = None
    fields: Optional[List[str]] = None

class ExportResult(BaseSchema):
    file_path: str
    file_name: str
    created_at: datetime
    expires_at: datetime

# Job Schemas
class JobBase(BaseSchema):
    property_id: int = Field(..., gt=0)
    topic_id: int = Field(..., gt=0)
    room_id: Optional[int] = Field(None, gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: JobStatus = JobStatus.PENDING
    notes: Optional[str] = Field(None, max_length=2000)
    export_data: Optional[str] = Field(None, max_length=5000)  # JSON field
    pdf_file_path: Optional[str] = Field(None, max_length=500)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseSchema):
    property_id: Optional[int] = Field(None, gt=0)
    topic_id: Optional[int] = Field(None, gt=0)
    room_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[JobStatus] = None
    notes: Optional[str] = Field(None, max_length=2000)
    export_data: Optional[str] = Field(None, max_length=5000)
    pdf_file_path: Optional[str] = Field(None, max_length=500)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class JobResponse(JobBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    user: Optional[UserSummary] = None
    property: Optional[Property] = None
    topic: Optional[Topic] = None
    room: Optional[Room] = None
    before_image: Optional[str] = None
    after_image: Optional[str] = None

class JobListResponse(BaseSchema):
    items: List[JobResponse]
    total: int
    page: int
    size: int
    pages: int
