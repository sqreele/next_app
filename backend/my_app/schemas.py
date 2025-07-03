# ==============================================================================
# File: my_app/schemas.py
# Description: Defines Pydantic models for data validation and serialization.
# ==============================================================================
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    class Config:
        orm_mode = True

class Property(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class Room(BaseModel):
    id: int
    name: str
    number: Optional[str] = None
    class Config:
        orm_mode = True

class Machine(BaseModel):
    id: int
    name: str
    status: str
    room: Optional[Room] = None
    class Config:
        orm_mode = True
        
class WorkOrderFile(BaseModel):
    id: int
    file_path: str
    upload_type: str
    class Config:
        orm_mode = True

class WorkOrder(BaseModel):
    id: int
    task: str
    status: str
    priority: str
    due_date: date
    machine: Optional[Machine] = None
    room: Optional[Room] = None
    assigned_to: Optional[User] = None
    files: List[WorkOrderFile] = []
    class Config:
        orm_mode = True

class WorkOrderCreate(BaseModel):
    task: str
    description: Optional[str] = None
    priority: str = 'Medium'
    due_date: date
    machine_id: Optional[int] = None
    room_id: Optional[int] = None
    assigned_to_id: Optional[int] = None

