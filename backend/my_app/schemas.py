# ==============================================================================
# File: backend/my_app/schemas.py (Updated with property selection)
# Description: Pydantic models for data validation and serialization.
# ==============================================================================
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional
from datetime import date, datetime
from enum import Enum

# --- Enums ---
class WorkOrderStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class WorkOrderPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    URGENT = "Urgent"

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
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

# --- Machine Schemas ---
class MachineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    status: MachineStatus = Field(MachineStatus.OPERATIONAL)
    room_id: Optional[int] = Field(None, gt=0)

class MachineCreate(MachineBase):
    pass

class MachineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[MachineStatus] = None
    room_id: Optional[int] = Field(None, gt=0)

class Machine(MachineBase):
    id: int
    property_id: int
    
    class Config:
        from_attributes = True

# --- WorkOrder Schemas ---
class WorkOrderCreate(BaseModel):
    task: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: WorkOrderStatus = Field(default=WorkOrderStatus.PENDING)
    priority: WorkOrderPriority = Field(default=WorkOrderPriority.MEDIUM)
    due_date: Optional[str] = Field(None, description="Due date in YYYY-MM-DD format")
    machine_id: Optional[int] = Field(None, gt=0)
    room_id: Optional[int] = Field(None, gt=0)
    assigned_to_id: Optional[int] = Field(None, gt=0)
    property_id: int = Field(..., gt=0)
    before_image_path: Optional[str] = Field(None, max_length=500)
    after_image_path: Optional[str] = Field(None, max_length=500)
    before_images: Optional[List[str]] = Field(default_factory=list)
    after_images: Optional[List[str]] = Field(default_factory=list)
    pdf_file_path: Optional[str] = Field(None, max_length=500)

    @validator('due_date')
    @classmethod
    def validate_due_date(cls, v):
        if v is None or v == '':
            return None
        try:
            parsed_date = datetime.strptime(v, '%Y-%m-%d').date()
            if parsed_date < date.today():
                raise ValueError('Due date cannot be in the past')
            return v
        except ValueError as e:
            if 'time data' in str(e):
                raise ValueError('Due date must be in YYYY-MM-DD format')
            raise e

    @validator('before_images', 'after_images')
    @classmethod
    def validate_image_arrays(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            return []
        return [img for img in v if img and isinstance(img, str)]

    class Config:
        from_attributes = True

class WorkOrder(BaseModel):
    id: int
    task: str
    description: Optional[str] = None
    status: WorkOrderStatus
    priority: WorkOrderPriority
    due_date: Optional[str] = None
    machine_id: Optional[int] = None
    room_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    property_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    before_image_path: Optional[str] = None
    after_image_path: Optional[str] = None
    before_images: Optional[List[str]] = Field(default_factory=list)
    after_images: Optional[List[str]] = Field(default_factory=list)
    pdf_file_path: Optional[str] = None
    
    @validator('due_date', pre=True)
    @classmethod
    def convert_due_date(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return v
        if hasattr(v, 'strftime'):
            return v.strftime('%Y-%m-%d')
        return str(v)
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

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

# --- Error Response Models ---
class ApiError(BaseModel):
    error: str
    message: str
    errors: Optional[dict] = None

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None

# --- File Upload Response ---
class FileUploadResponse(BaseModel):
    file_path: str
    url: str
    path: str
    message: str