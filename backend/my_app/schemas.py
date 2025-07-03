# ==============================================================================
# File: backend/my_app/schemas.py (Corrected and Added)
# Description: Pydantic models for data validation and serialization.
# ==============================================================================
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PropertyBase(BaseModel):
    name: str

class PropertyCreate(PropertyBase):
    pass

class Property(PropertyBase):
    id: int
    class Config:
        orm_mode = True

class RoomBase(BaseModel):
    name: str
    number: Optional[str] = None
    room_type: Optional[str] = None
    is_active: bool = True

class RoomCreate(RoomBase):
    property_id: int

class Room(RoomBase):
    id: int
    property_id: int
    class Config:
        orm_mode = True

class MachineBase(BaseModel):
    name: str
    status: str = 'Operational'
    room_id: Optional[int] = None

class MachineCreate(MachineBase):
    property_id: int

class Machine(MachineBase):
    id: int
    property_id: int
    class Config:
        orm_mode = True

class WorkOrderBase(BaseModel):
    task: str
    description: Optional[str] = None
    status: str = 'Pending'
    priority: str = 'Medium'
    due_date: Optional[date] = None

class WorkOrderCreate(WorkOrderBase):
    property_id: int
    machine_id: Optional[int] = None
    room_id: Optional[int] = None
    assigned_to_id: Optional[int] = None

class WorkOrder(WorkOrderBase):
    id: int
    property_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    work_orders_assigned: List[WorkOrder] = []
    class Config:
        orm_mode = True
