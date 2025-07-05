# ==============================================================================
# File: backend/my_app/schemas.py (Corrected and Improved)
# Description: Pydantic models for data validation and serialization.
# ==============================================================================
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Property Schemas ---
class PropertyBase(BaseModel):
    name: str

class PropertyCreate(PropertyBase):
    pass

class Property(PropertyBase):
    id: int
    
    class Config:
        from_attributes = True

# --- Room Schemas ---
class RoomBase(BaseModel):
    name: str
    number: Optional[str] = None
    room_type: Optional[str] = None
    is_active: bool = True

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: int
    property_id: int
    
    class Config:
        from_attributes = True

# --- Machine Schemas ---
class MachineBase(BaseModel):
    name: str
    status: str = 'Operational'
    room_id: Optional[int] = None

class MachineCreate(MachineBase):
    pass

class Machine(MachineBase):
    id: int
    property_id: int
    
    class Config:
        from_attributes = True

# --- WorkOrder Schemas ---
class WorkOrderBase(BaseModel):
    task: str
    description: Optional[str] = None
    status: str = 'Pending'
    priority: str = 'Medium'
    due_date: Optional[date] = None
    machine_id: Optional[int] = None
    room_id: Optional[int] = None
    assigned_to_id: Optional[int] = None

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrder(WorkOrderBase):
    id: int
    property_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- UserProfile Schemas ---
class UserProfileBase(BaseModel):
    role: Optional[str] = 'Technician'
    position: Optional[str] = None

class UserProfileCreate(UserProfileBase):
    pass

class UserProfile(UserProfileBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    profile: Optional[UserProfileCreate] = None

class User(UserBase):
    id: int
    is_active: bool
    profile: Optional[UserProfile] = None
    
    class Config:
        from_attributes = True
