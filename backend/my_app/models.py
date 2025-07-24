# backend/my_app/models.py

"""
SQLAlchemy models for PM System
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Text, Index, Table, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime

# Import Base from database with absolute import
from database import Base

# Association table for many-to-many relationship between machines and procedures
machine_procedure_association = Table(
    'machine_procedure_association',
    Base.metadata,
    Column('machine_id', Integer, ForeignKey('machines.id'), primary_key=True),
    Column('procedure_id', Integer, ForeignKey('procedures.id'), primary_key=True),
    Column('created_at', DateTime, server_default=func.now()),
    Index('idx_machine_procedure_machine', 'machine_id'),
    Index('idx_machine_procedure_procedure', 'procedure_id'),
)

# Association table for many-to-many relationship between work orders and topics
work_order_topic_association = Table(
    'work_order_topic_association',
    Base.metadata,
    Column('work_order_id', Integer, ForeignKey('work_orders.id'), primary_key=True),
    Column('topic_id', Integer, ForeignKey('topics.id'), primary_key=True),
    Column('created_at', DateTime, server_default=func.now()),
    Index('idx_work_order_topic_work_order', 'work_order_id'),
    Index('idx_work_order_topic_topic', 'topic_id'),
)

# Enums
class UserRole(str, enum.Enum):
    TECHNICIAN = "TECHNICIAN"
    SUPERVISOR = "SUPERVISOR"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"

class FrequencyType(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    ANNUAL = "ANNUAL"

class PMStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"

class IssueStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class IssuePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class WorkOrderType(str, enum.Enum):
    PM = "PM"
    ISSUE = "ISSUE"
    WORKORDER = "WORKORDER"

class WorkOrderStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    OVERDUE = "OVERDUE"

class InspectionResult(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    NEEDS_ATTENTION = "NEEDS_ATTENTION"

class ImageType(str, enum.Enum):
    BEFORE = "BEFORE"
    AFTER = "AFTER"
    DURING = "DURING"
    REFERENCE = "REFERENCE"

class AccessLevel(str, enum.Enum):
    READ_ONLY = "READ_ONLY"
    FULL_ACCESS = "FULL_ACCESS"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"

# Models with Indexes
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone = Column(String(20))
    role = Column(Enum(UserRole), nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    pm_schedules = relationship("PMSchedule", back_populates="responsible_user", lazy="selectin")
    pm_executions = relationship("PMExecution", back_populates="executor", lazy="selectin")
    reported_issues = relationship("Issue", foreign_keys="Issue.reported_by_id", back_populates="reporter", lazy="selectin")
    assigned_issues = relationship("Issue", foreign_keys="Issue.assigned_to_id", back_populates="assignee", lazy="selectin")
    inspections = relationship("Inspection", back_populates="inspector", lazy="selectin")
    property_access = relationship("UserPropertyAccess", back_populates="user", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_role_active', 'role', 'is_active'),
        Index('idx_user_name_search', 'first_name', 'last_name'),
        Index('idx_user_created_date', 'created_at'),
    )

class Property(Base):
    __tablename__ = "properties"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    address = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    rooms = relationship("Room", back_populates="property", lazy="selectin")
    user_access = relationship("UserPropertyAccess", back_populates="property", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_property_name_active', 'name', 'is_active'),
    )

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    room_number = Column(String(20), index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    property = relationship("Property", back_populates="rooms", lazy="selectin")
    machines = relationship("Machine", back_populates="room", lazy="selectin")
    issues = relationship("Issue", back_populates="room", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_room_property_active', 'property_id', 'is_active'),
        Index('idx_room_number_property', 'room_number', 'property_id'),
    )

class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    model = Column(String(100), index=True)
    serial_number = Column(String(100), unique=True, index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    room = relationship("Room", back_populates="machines", lazy="selectin")
    pm_schedules = relationship("PMSchedule", back_populates="machine", lazy="selectin")
    issues = relationship("Issue", back_populates="machine", lazy="selectin")
    inspections = relationship("Inspection", back_populates="machine", lazy="selectin")
    procedures = relationship("Procedure", secondary=machine_procedure_association, back_populates="machines", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_machine_room_active', 'room_id', 'is_active'),
        Index('idx_machine_name_model', 'name', 'model'),
        Index('idx_machine_serial_active', 'serial_number', 'is_active'),
    )

class Topic(Base):
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    procedures = relationship("Procedure", back_populates="topic", lazy="selectin")
    work_orders = relationship("WorkOrder", secondary=work_order_topic_association, back_populates="topics", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_topic_title_active', 'title', 'is_active'),
    )

class Procedure(Base):
    __tablename__ = "procedures"
    
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    instructions = Column(Text)
    estimated_minutes = Column(Integer, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    topic = relationship("Topic", back_populates="procedures", lazy="selectin")
    pm_schedules = relationship("PMSchedule", back_populates="procedure", lazy="selectin")
    inspections = relationship("Inspection", back_populates="procedure", lazy="selectin")
    machines = relationship("Machine", secondary=machine_procedure_association, back_populates="procedures", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_procedure_topic_active', 'topic_id', 'is_active'),
        Index('idx_procedure_title_topic', 'title', 'topic_id'),
        Index('idx_procedure_duration_active', 'estimated_minutes', 'is_active'),
    )

class PMSchedule(Base):
    __tablename__ = "pm_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    procedure_id = Column(Integer, ForeignKey("procedures.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    frequency = Column(Enum(FrequencyType), nullable=False, index=True)
    frequency_value = Column(Integer, nullable=False, default=1)
    last_completed = Column(DateTime, index=True)
    next_due = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    machine = relationship("Machine", back_populates="pm_schedules", lazy="selectin")
    procedure = relationship("Procedure", back_populates="pm_schedules", lazy="selectin")
    responsible_user = relationship("User", back_populates="pm_schedules", lazy="selectin")
    executions = relationship("PMExecution", back_populates="pm_schedule", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_pm_schedule_next_due_active', 'next_due', 'is_active'),
        Index('idx_pm_schedule_machine_active', 'machine_id', 'is_active'),
        Index('idx_pm_schedule_user_active', 'user_id', 'is_active'),
        Index('idx_pm_schedule_frequency_due', 'frequency', 'next_due'),
        Index('idx_pm_schedule_overdue', 'next_due', 'is_active'),
        Index('idx_pm_schedule_machine_procedure', 'machine_id', 'procedure_id'),
        Index('idx_pm_schedule_last_completed', 'last_completed', 'machine_id'),
    )

class PMExecution(Base):
    __tablename__ = "pm_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    pm_schedule_id = Column(Integer, ForeignKey("pm_schedules.id"), nullable=False, index=True)
    executed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(Enum(PMStatus), nullable=False, default=PMStatus.SCHEDULED, index=True)
    notes = Column(Text)
    started_at = Column(DateTime, index=True)
    completed_at = Column(DateTime, index=True)
    next_due_calculated = Column(DateTime, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    pm_schedule = relationship("PMSchedule", back_populates="executions", lazy="selectin")
    executor = relationship("User", back_populates="pm_executions", lazy="selectin")
    files = relationship("PMFile", back_populates="pm_execution", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_pm_execution_status_date', 'status', 'created_at'),
        Index('idx_pm_execution_schedule_status', 'pm_schedule_id', 'status'),
        Index('idx_pm_execution_executor_date', 'executed_by_id', 'created_at'),
        Index('idx_pm_execution_completed_date', 'completed_at', 'status'),
        Index('idx_pm_execution_started_date', 'started_at', 'status'),
        Index('idx_pm_execution_today_completed', 'completed_at', 'status'),
    )

class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), index=True)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    priority = Column(Enum(IssuePriority), nullable=False, default=IssuePriority.MEDIUM, index=True)
    status = Column(Enum(IssueStatus), nullable=False, default=IssueStatus.OPEN, index=True)
    reported_at = Column(DateTime, server_default=func.now(), index=True)
    resolved_at = Column(DateTime, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    machine = relationship("Machine", back_populates="issues", lazy="selectin")
    room = relationship("Room", back_populates="issues", lazy="selectin")
    reporter = relationship("User", foreign_keys=[reported_by_id], back_populates="reported_issues", lazy="selectin")
    assignee = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_issues", lazy="selectin")
    files = relationship("PMFile", back_populates="issue", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_issue_status_priority', 'status', 'priority'),
        Index('idx_issue_machine_status', 'machine_id', 'status'),
        Index('idx_issue_assigned_status', 'assigned_to_id', 'status'),
        Index('idx_issue_reporter_date', 'reported_by_id', 'reported_at'),
        Index('idx_issue_priority_status', 'priority', 'status'),
        Index('idx_issue_critical_open', 'priority', 'status'),
        Index('idx_issue_open_status', 'status', 'reported_at'),
        Index('idx_issue_resolved_date', 'resolved_at', 'status'),
    )

class Inspection(Base):
    __tablename__ = "inspections"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False, index=True)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    procedure_id = Column(Integer, ForeignKey("procedures.id"), index=True)
    title = Column(String(200), nullable=False, index=True)
    findings = Column(Text)
    result = Column(Enum(InspectionResult), nullable=False, index=True)
    inspection_date = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    machine = relationship("Machine", back_populates="inspections", lazy="selectin")
    inspector = relationship("User", back_populates="inspections", lazy="selectin")
    procedure = relationship("Procedure", back_populates="inspections", lazy="selectin")
    files = relationship("PMFile", back_populates="inspection", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_inspection_machine_date', 'machine_id', 'inspection_date'),
        Index('idx_inspection_inspector_date', 'inspector_id', 'inspection_date'),
        Index('idx_inspection_result_date', 'result', 'inspection_date'),
        Index('idx_inspection_procedure_result', 'procedure_id', 'result'),
        Index('idx_inspection_needs_attention', 'result', 'machine_id'),
        Index('idx_inspection_date_range', 'inspection_date', 'machine_id'),
    )

class PMFile(Base):
    __tablename__ = "pm_files"
    
    id = Column(Integer, primary_key=True, index=True)
    pm_execution_id = Column(Integer, ForeignKey("pm_executions.id"), index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), index=True)
    file_name = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=False, index=True)
    file_type = Column(String(50), nullable=False, index=True)
    image_type = Column(Enum(ImageType), index=True)
    description = Column(Text)
    uploaded_at = Column(DateTime, server_default=func.now(), index=True)
    
    # Relationships
    pm_execution = relationship("PMExecution", back_populates="files", lazy="selectin")
    issue = relationship("Issue", back_populates="files", lazy="selectin")
    inspection = relationship("Inspection", back_populates="files", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_pm_file_execution_type', 'pm_execution_id', 'image_type'),
        Index('idx_pm_file_issue_type', 'issue_id', 'file_type'),
        Index('idx_pm_file_inspection_type', 'inspection_id', 'image_type'),
        Index('idx_pm_file_uploaded_date', 'uploaded_at', 'file_type'),
        Index('idx_pm_file_image_type', 'image_type', 'uploaded_at'),
        Index('idx_pm_file_name_search', 'file_name'),
    )

class UserPropertyAccess(Base):
    __tablename__ = "user_property_access"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), primary_key=True, index=True)
    access_level = Column(Enum(AccessLevel), nullable=False, index=True)
    granted_at = Column(DateTime, server_default=func.now(), index=True)
    expires_at = Column(DateTime, index=True)
    
    # Relationships
    user = relationship("User", back_populates="property_access", lazy="selectin")
    property = relationship("Property", back_populates="user_access", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_property_access_level', 'access_level', 'user_id'),
        Index('idx_user_property_expires', 'expires_at', 'user_id'),
        Index('idx_property_access_granted', 'granted_at', 'property_id'),
    )

class WorkOrder(Base):
    __tablename__ = "work_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True, index=True)  # Made nullable for general work orders
    room_id = Column(Integer, ForeignKey("rooms.id"), index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), index=True)
    procedure_id = Column(Integer, ForeignKey("procedures.id"), index=True)
    title = Column(String(100), index=True)  # Job title
    description = Column(Text, nullable=False)
    status = Column(Enum(WorkOrderStatus), nullable=False, default=WorkOrderStatus.SCHEDULED, index=True)
    priority = Column(Enum(IssuePriority), nullable=True, index=True)  # Made nullable for general work orders
    type = Column(Enum(WorkOrderType), nullable=False, index=True)
    frequency = Column(Enum(FrequencyType), index=True)
    due_date = Column(DateTime, index=True)
    completed_at = Column(DateTime, index=True)
    estimated_duration = Column(Integer, index=True)  # Duration in minutes
    safety_requirements = Column(Text)  # Safety requirements and PPE
    required_tools = Column(Text)  # Required tools and equipment
    required_parts = Column(Text)  # Required parts and materials
    special_instructions = Column(Text)  # Special instructions and notes
    cost_estimate = Column(Float)  # Estimated cost
    before_images = Column(Text)  # JSON field for image paths
    after_images = Column(Text)   # JSON field for image paths
    pdf_file_path = Column(String(500))
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    machine = relationship("Machine", lazy="selectin")
    room = relationship("Room", lazy="selectin")
    property = relationship("Property", lazy="selectin")
    assignee = relationship("User", lazy="selectin")
    topic = relationship("Topic", lazy="selectin")
    procedure = relationship("Procedure", lazy="selectin")
    topics = relationship("Topic", secondary=work_order_topic_association, back_populates="work_orders", lazy="selectin")
    files = relationship("WorkOrderFile", back_populates="work_order", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_work_order_status_priority', 'status', 'priority'),
        Index('idx_work_order_machine_status', 'machine_id', 'status'),
        Index('idx_work_order_assigned_status', 'assigned_to_id', 'status'),
        Index('idx_work_order_type_status', 'type', 'status'),
        Index('idx_work_order_due_date', 'due_date', 'status'),
        Index('idx_work_order_topic_status', 'topic_id', 'status'),
        Index('idx_work_order_procedure_status', 'procedure_id', 'status'),
    )

class WorkOrderFile(Base):
    __tablename__ = "work_order_files"
    
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=False, index=True)
    file_type = Column(String(50), nullable=False, index=True)
    image_type = Column(Enum(ImageType), index=True)
    description = Column(Text)
    uploaded_at = Column(DateTime, server_default=func.now(), index=True)
    
    # Relationships
    work_order = relationship("WorkOrder", back_populates="files", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index('idx_work_order_file_work_order_type', 'work_order_id', 'image_type'),
        Index('idx_work_order_file_uploaded_date', 'uploaded_at', 'file_type'),
    )
