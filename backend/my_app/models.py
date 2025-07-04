# ==============================================================================
# File: backend/my_app/models.py (Corrected for Circular Import)
# Description: Defines the database schema using the imported Base.
# ==============================================================================
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Date,
    Boolean, Table, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Association table
user_property_association = Table(
    'user_property_association', Base.metadata,
    Column('user_profile_id', Integer, ForeignKey('userprofiles.id')),
    Column('property_id', Integer, ForeignKey('properties.id'))
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    work_orders_assigned = relationship("WorkOrder", back_populates="assigned_to")

   

    @password.setter
    def password(self, password: str):
        # --- FIX IS HERE ---
        # By importing the function inside the method, we break the circular dependency at startup.
        from .security import get_password_hash
        
        if password:
            self.hashed_password = get_password_hash(password)
    
    def __str__(self):
        return self.username

# (The rest of the file remains the same as your version)
class UserProfile(Base):
    __tablename__ = 'userprofiles'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    role = Column(String(50), default='Technician')
    position = Column(String(100), nullable=True)
    user = relationship("User", back_populates="profile")
    properties = relationship("Property", secondary=user_property_association, back_populates="user_profiles")
    def __str__(self):
        return f"{self.user.username} - {self.role}" if self.user else f"Profile {self.id}"

class Property(Base):
    __tablename__ = 'properties'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    rooms = relationship("Room", back_populates="property", cascade="all, delete-orphan")
    machines = relationship("Machine", back_populates="property", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="property", cascade="all, delete-orphan")
    user_profiles = relationship("UserProfile", secondary=user_property_association, back_populates="properties")
    def __str__(self):
        return self.name

class Room(Base):
    __tablename__ = 'rooms'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    number = Column(String(20), nullable=True)
    room_type = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    property = relationship("Property", back_populates="rooms")
    machines = relationship("Machine", back_populates="room")
    work_orders = relationship("WorkOrder", back_populates="room")
    def __str__(self):
        return f"{self.name} ({self.property.name})" if self.property else self.name

class Machine(Base):
    __tablename__ = 'machines'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    status = Column(String(50), default='Operational')
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=True)
    property = relationship("Property", back_populates="machines")
    room = relationship("Room", back_populates="machines")
    work_orders = relationship("WorkOrder", back_populates="machine")
    def __str__(self):
        return f"{self.name} ({self.property.name})" if self.property else self.name

class WorkOrder(Base):
    __tablename__ = 'workorders'
    id = Column(Integer, primary_key=True, index=True)
    task = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default='Pending')
    priority = Column(String(50), default='Medium')
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    machine_id = Column(Integer, ForeignKey('machines.id'), nullable=True)
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    property = relationship("Property", back_populates="work_orders")
    machine = relationship("Machine", back_populates="work_orders")
    room = relationship("Room", back_populates="work_orders")
    assigned_to = relationship("User", back_populates="work_orders_assigned")
    files = relationship("WorkOrderFile", back_populates="work_order", cascade="all, delete-orphan")
    def __str__(self):
        return f"{self.task} - {self.status}"

class WorkOrderFile(Base):
    __tablename__ = 'workorderfiles'
    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String(500), nullable=False)
    upload_type = Column(String(50), default='Other')
    work_order_id = Column(Integer, ForeignKey('workorders.id'), nullable=False)
    work_order = relationship("WorkOrder", back_populates="files")
    def __str__(self):
        return f"File: {self.file_path}"
