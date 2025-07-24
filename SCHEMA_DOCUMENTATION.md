# Schema Model Documentation: User Many-to-Many Models Properties

## Overview

This document describes the database schema for the PM (Preventive Maintenance) System, focusing on the many-to-many relationships between users and properties, as well as the newly added machine-procedure associations.

## Database Schema Architecture

### Core Entity Hierarchy

```
Property
├── Room (1:many)
    ├── Machine (1:many)
        ├── PMSchedule (1:many)
        ├── Issue (1:many)
        └── Inspection (1:many)
```

### User Access Control

```
User ↔ Property (many:many via UserPropertyAccess)
User → PMSchedule (1:many as responsible_user)
User → PMExecution (1:many as executor)
User → Issue (1:many as reporter)
User → Issue (1:many as assignee)
User → Inspection (1:many as inspector)
```

## Many-to-Many Relationships

### 1. User ↔ Property (via UserPropertyAccess)

**Purpose**: Controls which users have access to which properties and their access levels.

**Table**: `user_property_access`

**Columns**:
- `user_id` (PK, FK to users.id)
- `property_id` (PK, FK to properties.id)
- `access_level` (ENUM: READ_ONLY, FULL_ACCESS, SUPERVISOR, ADMIN)
- `granted_at` (DATETIME)
- `expires_at` (DATETIME, nullable)

**Model Definition**:
```python
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
```

**Access Levels**:
- `READ_ONLY`: Can view property data
- `FULL_ACCESS`: Can create/edit work orders and schedules
- `SUPERVISOR`: Can assign tasks and approve work
- `ADMIN`: Full administrative access to property

**Use Cases**:
- Multi-tenant system where users only access specific properties
- Role-based access control at the property level
- Time-limited access grants (via expires_at)
- Audit trail of access grants (via granted_at)

### 2. Machine ↔ Procedure (via machine_procedure_association)

**Purpose**: Defines which maintenance procedures can be performed on which machines.

**Table**: `machine_procedure_association`

**Columns**:
- `machine_id` (PK, FK to machines.id)
- `procedure_id` (PK, FK to procedures.id)
- `created_at` (DATETIME)

**Model Definition**:
```python
# Association table
machine_procedure_association = Table(
    'machine_procedure_association',
    Base.metadata,
    Column('machine_id', Integer, ForeignKey('machines.id'), primary_key=True),
    Column('procedure_id', Integer, ForeignKey('procedures.id'), primary_key=True),
    Column('created_at', DateTime, server_default=func.now()),
    Index('idx_machine_procedure_machine', 'machine_id'),
    Index('idx_machine_procedure_procedure', 'procedure_id'),
)

# Updated Machine model
class Machine(Base):
    # ... existing columns ...
    procedures = relationship("Procedure", secondary=machine_procedure_association, back_populates="machines", lazy="selectin")

# Updated Procedure model  
class Procedure(Base):
    # ... existing columns ...
    machines = relationship("Machine", secondary=machine_procedure_association, back_populates="procedures", lazy="selectin")
```

**Use Cases**:
- Validation: Only allow PM schedules for valid machine-procedure combinations
- Equipment-specific procedures (e.g., HVAC procedures only for HVAC machines)
- Compliance requirements (certain machines require specific procedures)
- Work order validation

## Schema Relationships (Pydantic)

### User Property Access Schemas

```python
class UserPropertyAccessBase(BaseSchema):
    user_id: int
    property_id: int
    access_level: AccessLevel
    expires_at: Optional[datetime] = None

class UserPropertyAccessCreate(UserPropertyAccessBase):
    pass

class UserPropertyAccessUpdate(BaseSchema):
    access_level: Optional[AccessLevel] = None
    expires_at: Optional[datetime] = None

class UserPropertyAccess(UserPropertyAccessBase):
    granted_at: datetime
    user: Optional[UserSummary] = None
    property: Optional[Property] = None
```

### Machine-Procedure Schemas

```python
class MachineWithProcedures(BaseSchema):
    id: int
    room_id: int
    name: str
    model: Optional[str]
    serial_number: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    room: Optional[Room] = None
    procedures: List[Procedure] = []

class ProcedureWithMachines(BaseSchema):
    id: int
    topic_id: int
    title: str
    description: Optional[str]
    instructions: Optional[str]
    estimated_minutes: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    topic: Optional[Topic] = None
    machines: List[MachineSummary] = []

class ProcedureCreate(ProcedureBase):
    machine_ids: Optional[List[int]] = []  # Optional list of machine IDs to associate

class ProcedureUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    instructions: Optional[str] = Field(None, max_length=5000)
    estimated_minutes: Optional[int] = Field(None, ge=1, le=1440)
    is_active: Optional[bool] = None
    machine_ids: Optional[List[int]] = None  # Optional list of machine IDs to update associations
```

## Database Indexes

### UserPropertyAccess Indexes

```sql
CREATE INDEX idx_user_property_access_level ON user_property_access (access_level, user_id);
CREATE INDEX idx_user_property_expires ON user_property_access (expires_at, user_id);
CREATE INDEX idx_property_access_granted ON user_property_access (granted_at, property_id);
```

### Machine-Procedure Association Indexes

```sql
CREATE INDEX idx_machine_procedure_machine ON machine_procedure_association (machine_id);
CREATE INDEX idx_machine_procedure_procedure ON machine_procedure_association (procedure_id);
```

## API Usage Examples

### User Property Access

```python
# Grant user access to property
user_access = UserPropertyAccessCreate(
    user_id=1,
    property_id=2,
    access_level=AccessLevel.FULL_ACCESS,
    expires_at=datetime.now() + timedelta(days=30)
)

# Get all properties a user has access to
user_properties = await get_user_properties(user_id=1)

# Get all users with access to a property
property_users = await get_property_users(property_id=2)
```

### Machine-Procedure Association

```python
# Create procedure with machine associations
procedure = ProcedureCreate(
    topic_id=1,
    title="HVAC Filter Replacement",
    description="Monthly filter replacement procedure",
    estimated_minutes=30,
    machine_ids=[1, 2, 3]  # Associate with multiple machines
)

# Update procedure machine associations
procedure_update = ProcedureUpdate(
    title="Updated HVAC Filter Replacement",
    machine_ids=[1, 2, 4]  # Update associations
)

# Get machines with their procedures
machines_with_procedures = await get_machines_with_procedures()

# Get procedures for a specific machine
machine_procedures = await get_procedures_for_machine(machine_id=1)
```

## Migration Notes

### Adding Machine-Procedure Association

A new migration has been created: `899398de0caf_add_machine_procedure_association.py`

To apply the migration:
```bash
alembic upgrade head
```

### Data Migration Considerations

After applying the migration, you may want to:
1. Populate the machine_procedure_association table with existing relationships
2. Update existing PMSchedule records to ensure they reference valid machine-procedure combinations
3. Add validation in your application to enforce these relationships

## Security Considerations

### User Property Access

1. **Principle of Least Privilege**: Users should only have the minimum access level required
2. **Time-Limited Access**: Use expires_at for temporary access grants
3. **Audit Trail**: The granted_at field provides an audit trail of access grants
4. **Access Level Hierarchy**: Implement proper access level checks in your application logic

### Machine-Procedure Associations

1. **Validation**: Always validate machine-procedure combinations before creating PM schedules
2. **Data Integrity**: Use foreign key constraints to ensure referential integrity
3. **Business Logic**: Implement business rules for which procedures can be assigned to which machines

## Performance Considerations

1. **Lazy Loading**: Both relationships use `lazy="selectin"` for efficient loading
2. **Indexes**: Comprehensive indexing on foreign keys and commonly queried columns
3. **Caching**: Consider caching user property access for frequently accessed data
4. **Pagination**: Use pagination for endpoints that return large datasets

## Future Enhancements

1. **User Groups**: Consider adding user groups for easier property access management
2. **Property Hierarchies**: Support for property hierarchies (buildings, floors, units)
3. **Procedure Versioning**: Version control for procedures
4. **Access Logging**: Log access attempts and actions for compliance