# ==============================================================================
# File: my_app/models.py
# Description: Defines the database schema using SQLAlchemy ORM.
# ==============================================================================
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Date,
    Boolean, Table
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

user_property_association = Table(
    'user_property_association', Base.metadata,
    Column('user_profile_id', Integer, ForeignKey('userprofiles.id')),
    Column('property_id', Integer, ForeignKey('properties.id'))
)


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    work_orders_assigned = relationship("WorkOrder", back_populates="assigned_to")
    def __str__(self):
        return self.username

class UserProfile(Base):
    __tablename__ = 'userprofiles'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    role = Column(String, default='Technician')
    position = Column(String, nullable=True)
    user = relationship("User", back_populates="profile")
    properties = relationship("Property", secondary=user_property_association)
    def __str__(self):
        return self.username

class Property(Base):
    __tablename__ = 'properties'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    rooms = relationship("Room", back_populates="property", cascade="all, delete-orphan")
    machines = relationship("Machine", back_populates="property", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="property", cascade="all, delete-orphan")
    def __str__(self):
        return self.username

class Room(Base):
    __tablename__ = 'rooms'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    number = Column(String, nullable=True)
    room_type = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    property_id = Column(Integer, ForeignKey('properties.id'))
    property = relationship("Property", back_populates="rooms")
    machines = relationship("Machine", back_populates="room")
    work_orders = relationship("WorkOrder", back_populates="room")
    def __str__(self):
        return self.username

class Machine(Base):
    __tablename__ = 'machines'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    status = Column(String, default='Operational')
    property_id = Column(Integer, ForeignKey('properties.id'))
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=True)
    property = relationship("Property", back_populates="machines")
    room = relationship("Room", back_populates="machines")
    work_orders = relationship("WorkOrder", back_populates="machine")
    def __str__(self):
        return self.username

class WorkOrder(Base):
    __tablename__ = 'workorders'
    id = Column(Integer, primary_key=True, index=True)
    task = Column(String, index=True)
    description = Column(String, nullable=True)
    status = Column(String, default='Pending')
    priority = Column(String, default='Medium')
    due_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    property_id = Column(Integer, ForeignKey('properties.id'))
    machine_id = Column(Integer, ForeignKey('machines.id'), nullable=True)
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    property = relationship("Property", back_populates="work_orders")
    machine = relationship("Machine", back_populates="work_orders") # Corrected from "machine"
    room = relationship("Room", back_populates="work_orders")
    assigned_to = relationship("User", back_populates="work_orders_assigned")
    files = relationship("WorkOrderFile", back_populates="work_order", cascade="all, delete-orphan")
    def __str__(self):
        return self.username

class WorkOrderFile(Base):
    __tablename__ = 'workorderfiles'
    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, nullable=False)
    upload_type = Column(String, default='Other')
    work_order_id = Column(Integer, ForeignKey('workorders.id'))
    work_order = relationship("WorkOrder", back_populates="files")
    def __str__(self):
        return self.username
