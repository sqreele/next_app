# ==============================================================================
# File: backend/my_app/models.py (UPDATED WITH PERFORMANCE INDEXES)
# Description: Defines the database schema with performance optimizations.
# ==============================================================================
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Date,
    Boolean, Table, Text, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from sqlalchemy.dialects.postgresql import JSONB

# Association table
user_property_association = Table(
    'user_property_association', Base.metadata,
    Column('user_profile_id', Integer, ForeignKey('userprofiles.id')),
    Column('property_id', Integer, ForeignKey('properties.id')),
    # Add index for association table
    Index('idx_user_property_profile', 'user_profile_id'),
    Index('idx_user_property_property', 'property_id'),
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

    # Performance indexes
    __table_args__ = (
        Index('idx_user_active', 'is_active'),
        Index('idx_user_username_active', 'username', 'is_active'),
        Index('idx_user_email_active', 'email', 'is_active'),
    )

    def __init__(self, **kwargs):
        password = kwargs.pop('password', None)
        super().__init__(**kwargs)
        if password:
            self.password = password

    @property
    def password(self):
        return None

    @password.setter
    def password(self, password: str):
        from .security import get_password_hash
        if password:
            self.hashed_password = get_password_hash(password)
    
    def __str__(self):
        return self.username

class UserProfile(Base):
    __tablename__ = 'userprofiles'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    role = Column(String(50), default='Technician')
    position = Column(String(100), nullable=True)
    
    user = relationship("User", back_populates="profile")
    properties = relationship("Property", secondary=user_property_association, back_populates="user_profiles")
    
    # Performance indexes
    __table_args__ = (
        Index('idx_userprofile_role', 'role'),
        Index('idx_userprofile_user', 'user_id'),
        Index('idx_userprofile_position', 'position'),
        Index('idx_userprofile_role_position', 'role', 'position'),
    )
    
    def __str__(self):
        return f"Profile {self.id} - {self.role}"

class Property(Base):
    __tablename__ = 'properties'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    
    rooms = relationship("Room", back_populates="property", cascade="all, delete-orphan")
    machines = relationship("Machine", back_populates="property", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="property", cascade="all, delete-orphan")
    user_profiles = relationship("UserProfile", secondary=user_property_association, back_populates="properties")
    
    # Performance indexes
    __table_args__ = (
        Index('idx_property_name', 'name'),
    )
    
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
    
    # Performance indexes
    __table_args__ = (
        Index('idx_room_property', 'property_id'),
        Index('idx_room_active', 'is_active'),
        Index('idx_room_type', 'room_type'),
        Index('idx_room_property_active', 'property_id', 'is_active'),
        Index('idx_room_property_type', 'property_id', 'room_type'),
        Index('idx_room_name_property', 'name', 'property_id'),
    )
    
    def __str__(self):
        room_display = self.name
        if self.number:
            room_display += f" ({self.number})"
        return room_display

class Machine(Base):
    __tablename__ = 'machines'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    status = Column(String(50), default='Operational')
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=True)
    
    # Relationships
    property = relationship("Property", back_populates="machines")
    room = relationship("Room", back_populates="machines")
    work_orders = relationship("WorkOrder", back_populates="machine")
    procedures = relationship("Procedure", back_populates="machine", cascade="all, delete-orphan")
    
    # Performance indexes
    __table_args__ = (
        Index('idx_machine_property', 'property_id'),
        Index('idx_machine_room', 'room_id'),
        Index('idx_machine_status', 'status'),
        Index('idx_machine_name', 'name'),
        Index('idx_machine_property_status', 'property_id', 'status'),
        Index('idx_machine_room_status', 'room_id', 'status'),
        Index('idx_machine_property_room', 'property_id', 'room_id'),
    )
    
    def __str__(self):
        return self.name

class Topic(Base):
    __tablename__ = 'topics'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    
    work_orders = relationship("WorkOrder", back_populates="topic")
    
    # Performance indexes
    __table_args__ = (
        Index('idx_topic_title', 'title'),
    )
    
    def __str__(self):
        return self.title

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
    
    # Image columns
    before_images = Column(JSONB, nullable=True, server_default='[]')
    after_images = Column(JSONB, nullable=True, server_default='[]')
    before_image_path = Column(String(500), nullable=True)
    after_image_path = Column(String(500), nullable=True)
    pdf_file_path = Column(String(500), nullable=True)
    
    # Foreign keys
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    machine_id = Column(Integer, ForeignKey('machines.id'), nullable=True)
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True)
    
    # Work order type
    type = Column(String(50), nullable=False, default='pm')
    
    # Relationships
    property = relationship("Property", back_populates="work_orders")
    machine = relationship("Machine", back_populates="work_orders")
    room = relationship("Room", back_populates="work_orders")
    assigned_to = relationship("User", back_populates="work_orders_assigned")
    files = relationship("WorkOrderFile", back_populates="work_order", cascade="all, delete-orphan")
    topic = relationship("Topic", back_populates="work_orders")
    procedure_execution = relationship("ProcedureExecution", back_populates="work_order", uselist=False)
    
    # Performance indexes
    __table_args__ = (
        # Single column indexes
        Index('idx_workorder_status', 'status'),
        Index('idx_workorder_due_date', 'due_date'),
        Index('idx_workorder_property', 'property_id'),
        Index('idx_workorder_assigned_to', 'assigned_to_id'),
        Index('idx_workorder_created_at', 'created_at'),
        Index('idx_workorder_type', 'type'),
        Index('idx_workorder_priority', 'priority'),
        Index('idx_workorder_machine', 'machine_id'),
        Index('idx_workorder_room', 'room_id'),
        Index('idx_workorder_topic', 'topic_id'),
        Index('idx_workorder_completed_at', 'completed_at'),
        
        # Composite indexes for common queries
        Index('idx_workorder_status_property', 'status', 'property_id'),
        Index('idx_workorder_status_due_date', 'status', 'due_date'),
        Index('idx_workorder_property_type', 'property_id', 'type'),
        Index('idx_workorder_assigned_status', 'assigned_to_id', 'status'),
        Index('idx_workorder_due_date_status', 'due_date', 'status'),
        Index('idx_workorder_property_status_type', 'property_id', 'status', 'type'),
        Index('idx_workorder_machine_status', 'machine_id', 'status'),
        Index('idx_workorder_room_status', 'room_id', 'status'),
        Index('idx_workorder_created_status', 'created_at', 'status'),
        Index('idx_workorder_priority_status', 'priority', 'status'),
    )
    
    def __str__(self):
        return f"{self.task} - {self.status}"

class WorkOrderFile(Base):
    __tablename__ = 'workorderfiles'
    
    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    upload_type = Column(String(50), default='Other')
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    work_order_id = Column(Integer, ForeignKey('workorders.id'), nullable=False)
    
    work_order = relationship("WorkOrder", back_populates="files")
    
    # Performance indexes
    __table_args__ = (
        Index('idx_workorderfile_workorder', 'work_order_id'),
        Index('idx_workorderfile_upload_type', 'upload_type'),
        Index('idx_workorderfile_uploaded_at', 'uploaded_at'),
        Index('idx_workorderfile_mime_type', 'mime_type'),
    )
    
    def __str__(self):
        return f"File: {self.file_path}"

class Procedure(Base):
    __tablename__ = 'procedures'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    remark = Column(String(500), nullable=True)
    machine_id = Column(Integer, ForeignKey('machines.id'), nullable=True)
    frequency = Column(String(50), nullable=True, index=True)
    
    # PM image and scheduling fields
    pm_image_path = Column(String(500), nullable=True)
    next_due_date = Column(Date, nullable=True)
    last_completed_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    estimated_duration_minutes = Column(Integer, nullable=True)
    
    # Relationships
    machine = relationship("Machine", back_populates="procedures")
    procedure_executions = relationship("ProcedureExecution", back_populates="procedure", cascade="all, delete-orphan")

    # Performance indexes
    __table_args__ = (
        # Single column indexes
        Index('idx_procedure_machine', 'machine_id'),
        Index('idx_procedure_frequency', 'frequency'),
        Index('idx_procedure_active', 'is_active'),
        Index('idx_procedure_next_due', 'next_due_date'),
        Index('idx_procedure_last_completed', 'last_completed_date'),
        Index('idx_procedure_title', 'title'),
        Index('idx_procedure_duration', 'estimated_duration_minutes'),
        
        # Composite indexes for common queries
        Index('idx_procedure_machine_active', 'machine_id', 'is_active'),
        Index('idx_procedure_frequency_active', 'frequency', 'is_active'),
        Index('idx_procedure_due_date_active', 'next_due_date', 'is_active'),
        Index('idx_procedure_machine_frequency', 'machine_id', 'frequency'),
        Index('idx_procedure_active_due_date', 'is_active', 'next_due_date'),
    )

    def __str__(self):
        return f"{self.title} (Machine: {self.machine.name if self.machine else 'Unknown'})"

class ProcedureExecution(Base):
    __tablename__ = 'procedure_executions'
    
    id = Column(Integer, primary_key=True, index=True)
    procedure_id = Column(Integer, ForeignKey('procedures.id'), nullable=False)
    work_order_id = Column(Integer, ForeignKey('workorders.id'), nullable=True)
    
    # Execution details
    scheduled_date = Column(Date, nullable=False)
    completed_date = Column(Date, nullable=True)
    status = Column(String(50), default='Scheduled')  # Scheduled, In Progress, Completed, Skipped
    
    # Images for this execution
    before_images = Column(JSONB, nullable=True, server_default='[]')
    after_images = Column(JSONB, nullable=True, server_default='[]')
    execution_notes = Column(Text, nullable=True)
    
    # Who performed it
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    completed_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    procedure = relationship("Procedure", back_populates="procedure_executions")
    work_order = relationship("WorkOrder", back_populates="procedure_execution")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    completed_by = relationship("User", foreign_keys=[completed_by_id])
    
    # Performance indexes
    __table_args__ = (
        # Single column indexes
        Index('idx_procedure_execution_date', 'scheduled_date'),
        Index('idx_procedure_execution_status', 'status'),
        Index('idx_procedure_execution_procedure', 'procedure_id'),
        Index('idx_procedure_execution_assigned', 'assigned_to_id'),
        Index('idx_procedure_execution_completed_by', 'completed_by_id'),
        Index('idx_procedure_execution_completed_date', 'completed_date'),
        Index('idx_procedure_execution_created_at', 'created_at'),
        Index('idx_procedure_execution_workorder', 'work_order_id'),
        Index('idx_procedure_execution_started_at', 'started_at'),
        Index('idx_procedure_execution_completed_at', 'completed_at'),
        
        # Composite indexes for common queries
        Index('idx_procedure_execution_date_status', 'scheduled_date', 'status'),
        Index('idx_procedure_execution_procedure_status', 'procedure_id', 'status'),
        Index('idx_procedure_execution_assigned_status', 'assigned_to_id', 'status'),
        Index('idx_procedure_execution_date_procedure', 'scheduled_date', 'procedure_id'),
        Index('idx_procedure_execution_status_completed', 'status', 'completed_date'),
        Index('idx_procedure_execution_procedure_date', 'procedure_id', 'scheduled_date'),
        
        # Calendar view optimization
        Index('idx_procedure_execution_calendar', 'scheduled_date', 'status', 'procedure_id'),
        Index('idx_procedure_execution_assigned_calendar', 'assigned_to_id', 'scheduled_date', 'status'),
    )
    
    def __str__(self):
        return f"{self.procedure.title} - {self.scheduled_date} ({self.status})"
