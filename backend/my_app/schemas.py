# File: backend/my_app/schemas.py
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, ConfigDict
from typing import List, Optional, Literal
from datetime import date, datetime
from enum import Enum
import re
from my_app.models import Frequency  # Use absolute import

# --- Enums ---
class WorkOrderStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    SCHEDULED = "Scheduled"

class WorkOrderPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class WorkOrderType(str, Enum):
    PM = "pm"
    ISSUE = "issue"
    WORKORDER = "workorder"

class MachineStatus(str, Enum):
    OPERATIONAL = "Operational"
    MAINTENANCE = "Maintenance"
    OFFLINE = "Offline"
    DECOMMISSIONED = "Decommissioned"

class UserRole(str, Enum):
    ADMIN = "Admin"
    TECHNICIAN = "Technician"
    MANAGER = "Manager"
    SUPERVISOR = "Supervisor"

class UploadType(str, Enum):
    BEFORE = "before"
    AFTER = "after"
    DOCUMENT = "document"
    OTHER = "other"

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Property Schemas ---
class PropertyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class Property(PropertyBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- UserProfile Schemas ---
class UserProfileBase(BaseModel):
    role: UserRole = Field(UserRole.TECHNICIAN)
    position: Optional[str] = Field(None, max_length=100)

class UserProfileCreate(UserProfileBase):
    property_ids: Optional[List[int]] = Field(default_factory=list)

class UserProfileUpdate(BaseModel):
    role: Optional[UserRole] = None
    position: Optional[str] = Field(None, max_length=100)
    property_ids: Optional[List[int]] = None

class UserProfile(UserProfileBase):
    id: int
    user_id: int
    properties: List[Property] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

# --- User Schemas ---
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    profile: Optional[UserProfileCreate] = None

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    is_active: Optional[bool] = None
    profile: Optional[UserProfileUpdate] = None

class User(UserBase):
    id: int
    is_active: bool = True
    profile: Optional[UserProfile] = None
    model_config = ConfigDict(from_attributes=True)

class UserSimple(UserBase):
    id: int
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)

# --- Room Schemas ---
class RoomBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    number: Optional[str] = Field(None, max_length=20)
    room_type: Optional[str] = Field(None, max_length=50)
    is_active: bool = Field(True)

class RoomCreate(RoomBase):
    property_id: int = Field(..., gt=0)

class RoomUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    number: Optional[str] = Field(None, max_length=20)
    room_type: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class Room(RoomBase):
    id: int
    property_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Machine Schemas ---
class MachineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    status: MachineStatus = Field(MachineStatus.OPERATIONAL)
    room_id: Optional[int] = None

class MachineCreate(MachineBase):
    pass

class MachineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[MachineStatus] = None
    room_id: Optional[int] = None

class Machine(MachineBase):
    id: int
    property_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Procedure Schemas ---
class ProcedureBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    remark: Optional[str] = Field(None, max_length=500)
    frequency: Optional[Frequency] = None
    estimated_time: Optional[str] = Field(None, max_length=50)

    @field_validator('frequency', mode='before')
    @classmethod
    def parse_frequency(cls, v, values, **kwargs):
        if v is None:
            return None
        if isinstance(v, Frequency):
            return v
        if isinstance(v, str):
            match = re.match(r"(\w+)(?:\s*\((.*?)\))?", v.strip())
            if match:
                freq, duration = match.groups()
                if freq in [f.value for f in Frequency]:
                    if duration and 'estimated_time' in values and values['estimated_time'] is None:
                        values['estimated_time'] = duration
                    return Frequency(freq)
            if v in [f.value for f in Frequency]:
                return Frequency(v)
        raise ValueError(f"frequency must be one of: {', '.join(f.value for f in Frequency)}")

class ProcedureCreate(ProcedureBase):
    machine_ids: Optional[List[int]] = Field(default_factory=list)

    @field_validator('machine_ids', mode='before')
    @classmethod
    def validate_machine_ids(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            return []
        return [mid for mid in v if isinstance(mid, int) and mid > 0]

class ProcedureUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    remark: Optional[str] = Field(None, max_length=500)
    frequency: Optional[Frequency] = None
    estimated_time: Optional[str] = Field(None, max_length=50)
    machine_ids: Optional[List[int]] = None

    @field_validator('frequency', mode='before')
    @classmethod
    def parse_frequency(cls, v, values, **kwargs):
        if v is None:
            return None
        if isinstance(v, Frequency):
            return v
        if isinstance(v, str):
            match = re.match(r"(\w+)(?:\s*\((.*?)\))?", v.strip())
            if match:
                freq, duration = match.groups()
                if freq in [f.value for f in Frequency]:
                    if duration and 'estimated_time' in values and values['estimated_time'] is None:
                        values['estimated_time'] = duration
                    return Frequency(freq)
            if v in [f.value for f in Frequency]:
                return Frequency(v)
        raise ValueError(f"frequency must be one of: {', '.join(f.value for f in Frequency)}")

class Procedure(ProcedureBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ProcedureWithMachines(ProcedureBase):
    id: int
    machines: List[Machine] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class MachineWithProcedures(MachineBase):
    id: int
    property_id: int
    procedures: List[Procedure] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

# --- Topic Schemas ---
class TopicBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)

class TopicCreate(TopicBase):
    pass

class Topic(TopicBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- WorkOrder Schemas ---
class WorkOrderCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    status: WorkOrderStatus = Field(default=WorkOrderStatus.PENDING)
    priority: Optional[WorkOrderPriority] = Field(default=WorkOrderPriority.LOW)
    due_date: Optional[date] = None
    machine_id: Optional[int] = None
    room_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    property_id: int = Field(..., gt=0)
    before_images: Optional[List[str]] = Field(default_factory=list)
    after_images: Optional[List[str]] = Field(default_factory=list)
    type: WorkOrderType = Field(...)
    topic_id: Optional[int] = None
    procedure_id: Optional[int] = None
    frequency: Optional[Frequency] = None
    estimated_time: Optional[str] = Field(None, max_length=50)

    @field_validator('frequency', mode='before')
    @classmethod
    def parse_frequency(cls, v, values, **kwargs):
        if v is None:
            return None
        if isinstance(v, Frequency):
            return v
        if isinstance(v, str):
            match = re.match(r"(\w+)(?:\s*\((.*?)\))?", v.strip())
            if match:
                freq, duration = match.groups()
                if freq in [f.value for f in Frequency]:
                    if duration and 'estimated_time' in values and values['estimated_time'] is None:
                        values['estimated_time'] = duration
                    return Frequency(freq)
            if v in [f.value for f in Frequency]:
                return Frequency(v)
        raise ValueError(f"frequency must be one of: {', '.join(f.value for f in Frequency)}")

    @field_validator('due_date', mode='before')
    @classmethod
    def parse_due_date(cls, v):
        if v is None or v == '':
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            try:
                parsed_date = datetime.strptime(v, '%Y-%m-%d').date()
                return parsed_date
            except ValueError as e:
                if 'time data' in str(e):
                    raise ValueError('Due date must be in YYYY-MM-DD format')
                raise e
        raise ValueError('Due date must be a valid date string in YYYY-MM-DD format')

    @field_validator('before_images', 'after_images', mode='before')
    @classmethod
    def validate_image_arrays(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            return []
        return [img for img in v if img and isinstance(img, str)]

    @model_validator(mode='after')
    def validate_work_order_fields(self):
        """Cross-field validation for work order types"""
        if self.type == WorkOrderType.WORKORDER and self.status == WorkOrderStatus.PENDING:
            self.status = WorkOrderStatus.SCHEDULED
        if self.type in [WorkOrderType.ISSUE, WorkOrderType.WORKORDER] and self.priority == WorkOrderPriority.LOW:
            self.priority = WorkOrderPriority.HIGH
        if self.type == WorkOrderType.PM:
            if not self.machine_id or not self.procedure_id:
                raise ValueError("machine_id and procedure_id are required for PM work orders")
            if not self.frequency:
                raise ValueError("frequency is required for PM work orders")
            if not self.priority:
                raise ValueError("priority is required for PM work orders")
        elif self.type == WorkOrderType.ISSUE:
            if not self.machine_id:
                raise ValueError("machine_id is required for ISSUE work orders")
            if self.procedure_id or self.frequency:
                raise ValueError("procedure_id and frequency are not allowed for ISSUE work orders")
            if not self.priority:
                raise ValueError("priority is required for ISSUE work orders")
        elif self.type == WorkOrderType.WORKORDER:
            if self.procedure_id or self.frequency or self.machine_id or self.priority:
                raise ValueError("procedure_id, frequency, machine_id, and priority are not allowed for WORKORDER type")
        return self

class WorkOrderUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    status: Optional[WorkOrderStatus] = None
    priority: Optional[WorkOrderPriority] = None
    due_date: Optional[date] = None
    machine_id: Optional[int] = None
    room_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    property_id: Optional[int] = Field(None, gt=0)
    before_images: Optional[List[str]] = Field(default_factory=list)
    after_images: Optional[List[str]] = Field(default_factory=list)
    type: Optional[WorkOrderType] = None
    topic_id: Optional[int] = None
    procedure_id: Optional[int] = None
    frequency: Optional[Frequency] = None
    estimated_time: Optional[str] = Field(None, max_length=50)

    @field_validator('frequency', mode='before')
    @classmethod
    def parse_frequency(cls, v, values, **kwargs):
        if v is None:
            return None
        if isinstance(v, Frequency):
            return v
        if isinstance(v, str):
            match = re.match(r"(\w+)(?:\s*\((.*?)\))?", v.strip())
            if match:
                freq, duration = match.groups()
                if freq in [f.value for f in Frequency]:
                    if duration and 'estimated_time' in values and values['estimated_time'] is None:
                        values['estimated_time'] = duration
                    return Frequency(freq)
            if v in [f.value for f in Frequency]:
                return Frequency(v)
        raise ValueError(f"frequency must be one of: {', '.join(f.value for f in Frequency)}")

    @field_validator('due_date', mode='before')
    @classmethod
    def parse_due_date(cls, v):
        if v is None or v == '':
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            try:
                parsed_date = datetime.strptime(v, '%Y-%m-%d').date()
                return parsed_date
            except ValueError as e:
                if 'time data' in str(e):
                    raise ValueError('Due date must be in YYYY-MM-DD format')
                raise e
        raise ValueError('Due date must be a valid date string in YYYY-MM-DD format')

    @field_validator('before_images', 'after_images', mode='before')
    @classmethod
    def validate_image_arrays(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            return []
        return [img for img in v if img and isinstance(img, str)]

class WorkOrder(BaseModel):
    id: int
    description: Optional[str] = None
    status: WorkOrderStatus
    priority: Optional[WorkOrderPriority] = None
    due_date: Optional[date] = None
    machine_id: Optional[int] = None
    room_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    property_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    before_images: List[str] = Field(default_factory=list)
    after_images: List[str] = Field(default_factory=list)
    type: WorkOrderType
    topic_id: Optional[int] = None
    procedure_id: Optional[int] = None
    frequency: Optional[Frequency] = None
    estimated_time: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WorkOrderWithRelations(WorkOrder):
    property: Optional[Property] = None
    room: Optional[Room] = None
    machine: Optional[Machine] = None
    assigned_to: Optional[UserSimple] = None
    topic: Optional[Topic] = None
    procedure: Optional[Procedure] = None

# --- WorkOrderFile Schemas ---
class WorkOrderFileBase(BaseModel):
    file_path: str = Field(..., min_length=1, max_length=500)
    file_name: Optional[str] = Field(None, max_length=255)
    file_size: Optional[int] = Field(None, ge=0)
    mime_type: Optional[str] = Field(None, max_length=100)
    upload_type: UploadType = Field(UploadType.OTHER)

class WorkOrderFileCreate(WorkOrderFileBase):
    work_order_id: int = Field(..., gt=0)

class WorkOrderFile(WorkOrderFileBase):
    id: int
    work_order_id: int
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Procedure Execution Schemas ---
class ProcedureExecutionBase(BaseModel):
    scheduled_date: date
    status: Literal['Scheduled', 'In Progress', 'Completed', 'Skipped'] = 'Scheduled'
    execution_notes: Optional[str] = None
    assigned_to_id: Optional[int] = None

class ProcedureExecutionCreate(ProcedureExecutionBase):
    procedure_id: int
    machine_id: Optional[int] = None
    work_order_id: Optional[int] = None

class ProcedureExecutionUpdate(BaseModel):
    status: Optional[Literal['Scheduled', 'In Progress', 'Completed', 'Skipped']] = None
    completed_date: Optional[date] = None
    execution_notes: Optional[str] = None
    before_images: Optional[List[str]] = Field(default_factory=list)
    after_images: Optional[List[str]] = Field(default_factory=list)
    completed_by_id: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    machine_id: Optional[int] = None

class ProcedureExecution(ProcedureExecutionBase):
    id: int
    procedure_id: int
    work_order_id: Optional[int] = None
    machine_id: Optional[int] = None
    completed_date: Optional[date] = None
    before_images: List[str] = Field(default_factory=list)
    after_images: List[str] = Field(default_factory=list)
    completed_by_id: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ProcedureExecutionWithDetails(ProcedureExecution):
    procedure: Optional[ProcedureWithMachines] = None
    machine: Optional[Machine] = None
    assigned_to: Optional[UserSimple] = None
    completed_by: Optional[UserSimple] = None
    work_order: Optional[WorkOrder] = None

# --- Machine-Procedure Association Schemas ---
class MachineProcedureAssignment(BaseModel):
    machine_id: int
    procedure_ids: List[int]

class ProcedureMachineAssignment(BaseModel):
    procedure_id: int
    machine_ids: List[int]

# --- Response Models ---
class WorkOrderResponse(BaseModel):
    data: WorkOrder
    message: Optional[str] = None

class WorkOrdersResponse(BaseModel):
    data: Optional[List[WorkOrder]] = None
    total: Optional[int] = None
    page: Optional[int] = None
    limit: Optional[int] = None
    message: Optional[str] = None

class ApiError(BaseModel):
    error: str
    message: str
    errors: Optional[dict] = None

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None

class FileUploadResponse(BaseModel):
    file_path: str
    url: str
    path: str
    message: str

class TechnicianStatus(BaseModel):
    id: int
    name: str
    status: str
    currentWorkOrder: Optional[str] = None
    completedToday: int
    utilization: int
    location: Optional[str] = None

class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str
    end: Optional[str] = None
    backgroundColor: str = "#007bff"
    borderColor: str = "#007bff"
    extendedProps: dict = Field(default_factory=dict)
    model_config = ConfigDict(from_attributes=True)
