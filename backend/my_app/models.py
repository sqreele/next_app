# ==============================================================================
# File: backend/my_app/models.py (WITH MACHINE-PROCEDURE MANY-TO-MANY)
# Description: Defines the database schema using the imported Base.
# ==============================================================================
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Date,
    Boolean, Table, Text, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.orm.exc import DetachedInstanceError
from .database import Base
from sqlalchemy.dialects.postgresql import JSONB

# Association table for user-property
user_property_association = Table(
    'user_property_association', Base.metadata,
    Column('user_profile_id', Integer, ForeignKey('userprofiles.id')),
    Column('property_id', Integer, ForeignKey('properties.id'))
)

# NEW: Association table for machine-procedure many-to-many
machine_procedure_association = Table(
    'machine_procedure_association', Base.metadata,
    Column('machine_id', Integer, ForeignKey('machines.id')),
    Column('procedure_id', Integer, ForeignKey('procedures.id')),
    Index('idx_machine_procedure_machine', 'machine_id'),
    Index('idx_machine_procedure_procedure', 'procedure_id'),
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
    
    # CHANGED: Many-to-many relationship with procedures
    procedures = relationship("Procedure", secondary=machine_procedure_association, back_populates="machines")
    
    def __str__(self):
        return self.name

class Topic(Base):
    __tablename__ = 'topics'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    
    work_orders = relationship("WorkOrder", back_populates="topic")
    
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
    
    # Your requested performance indexes
    __table_args__ = (
        Index('idx_workorder_status', 'status'),
        Index('idx_workorder_due_date', 'due_date'),
        Index('idx_workorder_property', 'property_id'),
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
    
    def __str__(self):
        return f"File: {self.file_path}"

class Procedure(Base):
    __tablename__ = 'procedures'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    remark = Column(String(500), nullable=True)
    frequency = Column(String(50), nullable=True, index=True)  # Daily, Weekly, Monthly, Quarterly, Yearly
    
    # REMOVED: machine_id foreign key (now many-to-many)
    # machine_id = Column(Integer, ForeignKey('machines.id'), nullable=True)
    
    # CHANGED: Many-to-many relationship with machines
    machines = relationship("Machine", secondary=machine_procedure_association, back_populates="procedures")
    procedure_executions = relationship("ProcedureExecution", back_populates="procedure", cascade="all, delete-orphan")

    # UPDATED: Performance indexes (removed idx_procedure_machine since no machine_id column)
    __table_args__ = (
        Index('idx_procedure_frequency', 'frequency'),
        Index('idx_procedure_title', 'title'),
    )

    def __str__(self):
        # UPDATED: Show count of machines instead of single machine
        try:
            machine_count = len(self.machines) if self.machines else 0
            return f"{self.title} ({machine_count} machines)"
        except DetachedInstanceError:
            return f"{self.title} (ID: {self.id})"

class ProcedureExecution(Base):
    __tablename__ = 'procedure_executions'
    id = Column(Integer, primary_key=True, index=True)
    procedure_id = Column(Integer, ForeignKey('procedures.id'), nullable=False)
    work_order_id = Column(Integer, ForeignKey('workorders.id'), nullable=True)
    
    # NEW: Add machine_id to specify which machine this execution is for
    machine_id = Column(Integer, ForeignKey('machines.id'), nullable=True)
    
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
    machine = relationship("Machine")  # NEW: Direct relationship to machine
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    completed_by = relationship("User", foreign_keys=[completed_by_id])
    
    # UPDATED: Performance indexes (added machine_id)
    __table_args__ = (
        Index('idx_procedure_execution_date', 'scheduled_date'),
        Index('idx_procedure_execution_machine', 'machine_id'),  # NEW: Index for machine
        Index('idx_procedure_execution_procedure', 'procedure_id'),
        Index('idx_procedure_execution_status', 'status'),
    )
    
    def __str__(self):
        try:
            procedure_title = self.procedure.title if self.procedure else 'Unknown Procedure'
            machine_name = self.machine.name if self.machine else 'No Machine'
            return f"{procedure_title} - {machine_name} - {self.scheduled_date} ({self.status})"
        except DetachedInstanceError:
            return f"Procedure Execution {self.id} - {self.scheduled_date} ({self.status})"
