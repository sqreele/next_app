
# ==============================================================================
# File: backend/my_app/crud.py (UPDATED FOR MANY-TO-MANY PROCEDURES AND WORK ORDER)
# Description: Fully asynchronous CRUD operations with proper relationship loading.
# ==============================================================================
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from . import models, schemas
from .security import get_password_hash
from typing import List, Optional
from .models import WorkOrderType
from fastapi import HTTPException

# --- User CRUD ---
async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.profile).selectinload(models.UserProfile.properties)
        )
        .filter(models.User.id == user_id)
    )
    return result.scalars().first()

async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.profile).selectinload(models.UserProfile.properties)
        )
        .filter(models.User.username == username)
    )
    return result.scalars().first()

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.profile).selectinload(models.UserProfile.properties)
        )
        .filter(models.User.email == email)
    )
    return result.scalars().first()

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.profile).selectinload(models.UserProfile.properties)
        )
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    await db.flush()

    if user.profile:
        db_profile = models.UserProfile(
            user_id=db_user.id,
            role=user.profile.role,
            position=user.profile.position
        )
        db.add(db_profile)
        await db.flush()

        if user.profile.property_ids:
            properties = await db.execute(
                select(models.Property).where(models.Property.id.in_(user.profile.property_ids))
            )
            property_objects = properties.scalars().all()
            db_profile.properties.extend(property_objects)

    await db.commit()
    
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.profile).selectinload(models.UserProfile.properties)
        )
        .filter(models.User.id == db_user.id)
    )
    return result.scalars().first()

async def get_unique_username(db: AsyncSession, base_username: str) -> str:
    """Generate a unique username based on a base username"""
    username = base_username
    counter = 1
    
    while True:
        existing_user = await get_user_by_username(db, username)
        if not existing_user:
            return username
        username = f"{base_username}{counter}"
        counter += 1

# --- Property CRUD ---
async def get_properties(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.Property).offset(skip).limit(limit))
    return result.scalars().all()

async def create_property(db: AsyncSession, property: schemas.PropertyCreate):
    db_property = models.Property(name=property.name)
    db.add(db_property)
    await db.commit()
    await db.refresh(db_property)
    return db_property

# --- Room CRUD ---
async def get_rooms(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.Room).offset(skip).limit(limit))
    return result.scalars().all()

async def create_room(db: AsyncSession, room: schemas.RoomCreate, property_id: int):
    db_room = models.Room(**room.dict(), property_id=property_id)
    db.add(db_room)
    await db.commit()
    await db.refresh(db_room)
    return db_room

# --- Machine CRUD ---
async def get_machines(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Machine)
        .options(selectinload(models.Machine.work_orders))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def create_machine(db: AsyncSession, machine: schemas.MachineCreate, property_id: int):
    db_machine = models.Machine(**machine.dict(), property_id=property_id)
    db.add(db_machine)
    await db.commit()
    await db.refresh(db_machine)
    return db_machine

async def get_machines_by_property(db: AsyncSession, property_id: int, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Machine)
        .options(selectinload(models.Machine.work_orders))
        .filter(models.Machine.property_id == property_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_machine(db: AsyncSession, machine_id: int):
    result = await db.execute(
        select(models.Machine)
        .options(selectinload(models.Machine.work_orders))
        .filter(models.Machine.id == machine_id)
    )
    return result.scalars().first()

async def get_machine_with_procedures(db: AsyncSession, machine_id: int):
    """Get machine with all its procedures"""
    result = await db.execute(
        select(models.Machine)
        .options(selectinload(models.Machine.procedures))
        .filter(models.Machine.id == machine_id)
    )
    return result.scalars().first()

# --- Procedure CRUD ---
async def get_procedures(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Get all procedures"""
    result = await db.execute(
        select(models.Procedure)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_procedures_with_machines(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Get all procedures with their machine details"""
    result = await db.execute(
        select(models.Procedure)
        .options(selectinload(models.Procedure.machines))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_procedure(db: AsyncSession, procedure_id: int):
    """Get a single procedure by ID with machines"""
    result = await db.execute(
        select(models.Procedure)
        .options(selectinload(models.Procedure.machines))
        .filter(models.Procedure.id == procedure_id)
    )
    return result.scalars().first()

async def get_procedures_by_machine(db: AsyncSession, machine_id: int):
    """Get all procedures for a specific machine"""
    result = await db.execute(
        select(models.Machine)
        .options(selectinload(models.Machine.procedures))
        .filter(models.Machine.id == machine_id)
    )
    machine = result.scalars().first()
    return machine.procedures if machine else []

async def create_procedure(db: AsyncSession, procedure: schemas.ProcedureCreate):
    """Create a procedure and assign it to machines with proper transaction management"""
    try:
        db_procedure = models.Procedure(
            title=procedure.title,
            remark=procedure.remark,
            frequency=procedure.frequency
        )
        db.add(db_procedure)
        await db.flush()
        
        if procedure.machine_ids:
            machines = await db.execute(
                select(models.Machine).where(models.Machine.id.in_(procedure.machine_ids))
            )
            machine_objects = machines.scalars().all()
            if len(machine_objects) != len(procedure.machine_ids):
                await db.rollback()
                raise HTTPException(status_code=400, detail="One or more machine IDs are invalid")
            db_procedure.machines.extend(machine_objects)
        
        await db.commit()
        await db.refresh(db_procedure)
        
        result = await db.execute(
            select(models.Procedure)
            .options(selectinload(models.Procedure.machines))
            .filter(models.Procedure.id == db_procedure.id)
        )
        return result.scalars().first()
    except Exception as e:
        await db.rollback()
        print(f"Error creating procedure: {e}")
        raise e

async def update_procedure(db: AsyncSession, procedure_id: int, procedure: schemas.ProcedureUpdate):
    """Update a procedure and its machine assignments with proper validation"""
    try:
        db_procedure = await db.get(models.Procedure, procedure_id)
        if not db_procedure:
            return None
        
        if procedure.title is not None:
            db_procedure.title = procedure.title
        if procedure.remark is not None:
            db_procedure.remark = procedure.remark
        if procedure.frequency is not None:
            db_procedure.frequency = procedure.frequency
        
        if procedure.machine_ids is not None:
            db_procedure.machines.clear()
            if procedure.machine_ids:
                machines = await db.execute(
                    select(models.Machine).where(models.Machine.id.in_(procedure.machine_ids))
                )
                machine_objects = machines.scalars().all()
                if len(machine_objects) != len(procedure.machine_ids):
                    await db.rollback()
                    raise HTTPException(status_code=400, detail="One or more machine IDs are invalid")
                db_procedure.machines.extend(machine_objects)
        
        await db.commit()
        await db.refresh(db_procedure)
        
        result = await db.execute(
            select(models.Procedure)
            .options(selectinload(models.Procedure.machines))
            .filter(models.Procedure.id == procedure_id)
        )
        return result.scalars().first()
    except Exception as e:
        await db.rollback()
        print(f"Error updating procedure: {e}")
        raise e

async def delete_procedure(db: AsyncSession, procedure_id: int):
    """Delete a procedure"""
    db_procedure = await db.get(models.Procedure, procedure_id)
    if not db_procedure:
        return None
    
    await db.delete(db_procedure)
    await db.commit()
    return db_procedure

# --- Machine-Procedure Assignment CRUD ---
async def assign_procedures_to_machine(db: AsyncSession, machine_id: int, procedure_ids: list[int]):
    """Assign multiple procedures to a machine"""
    machine = await db.get(models.Machine, machine_id)
    if not machine:
        return None
    
    machine.procedures.clear()
    
    if procedure_ids:
        procedures = await db.execute(
            select(models.Procedure).where(models.Procedure.id.in_(procedure_ids))
        )
        procedure_objects = procedures.scalars().all()
        if len(procedure_objects) != len(procedure_ids):
            raise HTTPException(status_code=400, detail="One or more procedure IDs are invalid")
        machine.procedures.extend(procedure_objects)
    
    await db.commit()
    await db.refresh(machine)
    return machine

async def assign_machines_to_procedure(db: AsyncSession, procedure_id: int, machine_ids: list[int]):
    """Assign multiple machines to a procedure"""
    procedure = await db.get(models.Procedure, procedure_id)
    if not procedure:
        return None
    
    procedure.machines.clear()
    
    if machine_ids:
        machines = await db.execute(
            select(models.Machine).where(models.Machine.id.in_(machine_ids))
        )
        machine_objects = machines.scalars().all()
        if len(machine_objects) != len(machine_ids):
            raise HTTPException(status_code=400, detail="One or more machine IDs are invalid")
        procedure.machines.extend(machine_objects)
    
    await db.commit()
    await db.refresh(procedure)
    return procedure

# --- Procedure Execution CRUD ---
async def create_procedure_execution(db: AsyncSession, execution: schemas.ProcedureExecutionCreate):
    """Create a procedure execution for a specific machine"""
    procedure = await db.get(models.Procedure, execution.procedure_id)
    if not procedure:
        raise HTTPException(status_code=400, detail="Procedure not found")
    
    if execution.machine_id:
        machine = await db.get(models.Machine, execution.machine_id)
        if not machine:
            raise HTTPException(status_code=400, detail="Machine not found")
    
    db_execution = models.ProcedureExecution(**execution.model_dump())
    db.add(db_execution)
    await db.commit()
    await db.refresh(db_execution)
    
    result = await db.execute(
        select(models.ProcedureExecution)
        .options(
            selectinload(models.ProcedureExecution.procedure).selectinload(models.Procedure.machines),
            selectinload(models.ProcedureExecution.machine),
            selectinload(models.ProcedureExecution.assigned_to),
            selectinload(models.ProcedureExecution.completed_by)
        )
        .filter(models.ProcedureExecution.id == db_execution.id)
    )
    return result.scalars().first()

# --- WorkOrder CRUD ---
async def get_work_orders(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Get work orders with all relationships properly loaded"""
    try:
        result = await db.execute(
            select(models.WorkOrder)
            .options(
                selectinload(models.WorkOrder.room),
                selectinload(models.WorkOrder.property),
                selectinload(models.WorkOrder.machine),
                selectinload(models.WorkOrder.assigned_to),
                selectinload(models.WorkOrder.topic)
            )
            .offset(skip)
            .limit(limit)
            .order_by(models.WorkOrder.created_at.desc())
        )
        work_orders = result.scalars().all()
        
        for wo in work_orders:
            _ = wo.property
            _ = wo.room  
            _ = wo.machine
            _ = wo.assigned_to
            _ = wo.topic
            
        return work_orders
    except Exception as e:
        print(f"Error in get_work_orders CRUD: {e}")
        raise e

async def create_work_order(db: AsyncSession, work_order: schemas.WorkOrderCreate):
    """Create a work order with validation and procedure execution for PM"""
    try:
        # Validate based on WorkOrderType
        if work_order.type == WorkOrderType.PM:
            if not work_order.machine_id or not work_order.procedure_id:
                raise HTTPException(status_code=400, detail="machine_id and procedure_id are required for PM")
            if not work_order.frequency:
                raise HTTPException(status_code=400, detail="frequency is required for PM")
            if not work_order.priority:
                raise HTTPException(status_code=400, detail="priority is required for PM")
            # Validate machine-procedure association
            machine = await get_machine_with_procedures(db, work_order.machine_id)
            if not machine or not any(p.id == work_order.procedure_id for p in machine.procedures):
                raise HTTPException(status_code=400, detail="Invalid machine-procedure combination")
        elif work_order.type == WorkOrderType.ISSUE:
            if not work_order.machine_id:
                raise HTTPException(status_code=400, detail="machine_id is required for ISSUE")
            if work_order.procedure_id or work_order.frequency:
                raise HTTPException(status_code=400, detail="procedure_id and frequency are not allowed for ISSUE")
            if not work_order.priority:
                raise HTTPException(status_code=400, detail="priority is required for ISSUE")
        elif work_order.type == WorkOrderType.WORKORDER:
            if work_order.procedure_id or work_order.frequency or work_order.machine_id or work_order.priority:
                raise HTTPException(status_code=400, detail="procedure_id, frequency, machine_id, and priority are not allowed for WORKORDER")

        # Set default status if not provided
        work_order_data = work_order.model_dump()
        if not work_order_data.get('status'):
            work_order_data['status'] = 'Pending' if work_order.type in [WorkOrderType.PM, WorkOrderType.ISSUE] else 'Scheduled'
        
        # Handle nullable fields
        if work_order_data.get('pdf_file_path') == "":
            work_order_data['pdf_file_path'] = None
        if not work_order_data.get('before_images'):
            work_order_data['before_images'] = []
        if not work_order_data.get('after_images'):
            work_order_data['after_images'] = []
        
        print(f"🔍 [CRUD] Creating work order with data:")
        print(f"   - Description: {work_order.description}")
        print(f"   - Type: {work_order.type}")
        print(f"   - Before images: {work_order_data['before_images']}")
        print(f"   - After images: {work_order_data['after_images']}")
        print(f"   - PDF file path: '{work_order_data['pdf_file_path']}'")
        
        db_work_order = models.WorkOrder(**work_order_data)
        db.add(db_work_order)
        await db.flush()

        # Create ProcedureExecution for PM
        if work_order.type == WorkOrderType.PM:
            execution = schemas.ProcedureExecutionCreate(
                procedure_id=work_order.procedure_id,
                machine_id=work_order.machine_id,
                work_order_id=db_work_order.id,
                assigned_to_id=work_order.assigned_to_id,
                due_date=work_order.due_date
            )
            await create_procedure_execution(db, execution)

        await db.commit()
        await db.refresh(db_work_order)
        
        print(f"✅ [CRUD] Work order created successfully!")
        print(f"   - ID: {db_work_order.id}")
        print(f"   - Before images: {db_work_order.before_images}")
        print(f"   - After images: {db_work_order.after_images}")
        print(f"   - PDF file path: '{db_work_order.pdf_file_path}'")
        
        result = await db.execute(
            select(models.WorkOrder)
            .options(
                selectinload(models.WorkOrder.room),
                selectinload(models.WorkOrder.property),
                selectinload(models.WorkOrder.machine),
                selectinload(models.WorkOrder.assigned_to),
                selectinload(models.WorkOrder.topic)
            )
            .filter(models.WorkOrder.id == db_work_order.id)
        )
        return result.scalars().first()
    except Exception as e:
        await db.rollback()
        print(f"Error creating work order: {e}")
        raise e

async def update_work_order(db: AsyncSession, work_order_id: int, work_order: schemas.WorkOrderCreate):
    """Update a work order with full replacement"""
    try:
        result = await db.execute(select(models.WorkOrder).filter(models.WorkOrder.id == work_order_id))
        db_work_order = result.scalars().first()
        if not db_work_order:
            return None
        
        # Validate based on WorkOrderType
        if work_order.type == WorkOrderType.PM:
            if not work_order.machine_id or not work_order.procedure_id:
                raise HTTPException(status_code=400, detail="machine_id and procedure_id are required for PM")
            if not work_order.frequency:
                raise HTTPException(status_code=400, detail="frequency is required for PM")
            if not work_order.priority:
                raise HTTPException(status_code=400, detail="priority is required for PM")
            machine = await get_machine_with_procedures(db, work_order.machine_id)
            if not machine or not any(p.id == work_order.procedure_id for p in machine.procedures):
                raise HTTPException(status_code=400, detail="Invalid machine-procedure combination")
        elif work_order.type == WorkOrderType.ISSUE:
            if not work_order.machine_id:
                raise HTTPException(status_code=400, detail="machine_id is required for ISSUE")
            if work_order.procedure_id or work_order.frequency:
                raise HTTPException(status_code=400, detail="procedure_id and frequency are not allowed for ISSUE")
            if not work_order.priority:
                raise HTTPException(status_code=400, detail="priority is required for ISSUE")
        elif work_order.type == WorkOrderType.WORKORDER:
            if work_order.procedure_id or work_order.frequency or work_order.machine_id or work_order.priority:
                raise HTTPException(status_code=400, detail="procedure_id, frequency, machine_id, and priority are not allowed for WORKORDER")

        work_order_data = work_order.dict()
        if work_order_data.get('pdf_file_path') == "":
            work_order_data['pdf_file_path'] = None
        if not work_order_data.get('before_images'):
            work_order_data['before_images'] = []
        if not work_order_data.get('after_images'):
            work_order_data['after_images'] = []

        for key, value in work_order_data.items():
            setattr(db_work_order, key, value)
        
        await db.commit()
        await db.refresh(db_work_order)
        
        result = await db.execute(
            select(models.WorkOrder)
            .options(
                selectinload(models.WorkOrder.room),
                selectinload(models.WorkOrder.property),
                selectinload(models.WorkOrder.machine),
                selectinload(models.WorkOrder.assigned_to),
                selectinload(models.WorkOrder.topic)
            )
            .filter(models.WorkOrder.id == work_order_id)
        )
        return result.scalars().first()
    except Exception as e:
        await db.rollback()
        print(f"Error updating work order: {e}")
        raise e

async def patch_work_order(db: AsyncSession, work_order_id: int, work_order_update: schemas.WorkOrderUpdate):
    """Update work order with partial data (PATCH method)"""
    try:
        result = await db.execute(select(models.WorkOrder).filter(models.WorkOrder.id == work_order_id))
        db_work_order = result.scalars().first()
        if not db_work_order:
            return None
        
        update_data = work_order_update.model_dump(exclude_unset=True)
        
        # Validate if type is being updated
        if 'type' in update_data:
            if update_data['type'] == WorkOrderType.PM:
                if not update_data.get('machine_id', db_work_order.machine_id) or not update_data.get('procedure_id', db_work_order.procedure_id):
                    raise HTTPException(status_code=400, detail="machine_id and procedure_id are required for PM")
                if not update_data.get('frequency', db_work_order.frequency):
                    raise HTTPException(status_code=400, detail="frequency is required for PM")
                if not update_data.get('priority', db_work_order.priority):
                    raise HTTPException(status_code=400, detail="priority is required for PM")
                machine = await get_machine_with_procedures(db, update_data.get('machine_id', db_work_order.machine_id))
                if not machine or not any(p.id == update_data.get('procedure_id', db_work_order.procedure_id) for p in machine.procedures):
                    raise HTTPException(status_code=400, detail="Invalid machine-procedure combination")
            elif update_data['type'] == WorkOrderType.ISSUE:
                if not update_data.get('machine_id', db_work_order.machine_id):
                    raise HTTPException(status_code=400, detail="machine_id is required for ISSUE")
                if update_data.get('procedure_id') or update_data.get('frequency') or db_work_order.procedure_id or db_work_order.frequency:
                    raise HTTPException(status_code=400, detail="procedure_id and frequency are not allowed for ISSUE")
                if not update_data.get('priority', db_work_order.priority):
                    raise HTTPException(status_code=400, detail="priority is required for ISSUE")
            elif update_data['type'] == WorkOrderType.WORKORDER:
                if update_data.get('procedure_id') or update_data.get('frequency') or update_data.get('machine_id') or update_data.get('priority') or \
                   db_work_order.procedure_id or db_work_order.frequency or db_work_order.machine_id or db_work_order.priority:
                    raise HTTPException(status_code=400, detail="procedure_id, frequency, machine_id, and priority are not allowed for WORKORDER")
        
        for key, value in update_data.items():
            if key == 'pdf_file_path' and value == "":
                value = None
            if key == 'before_images' and not value:
                value = []
            if key == 'after_images' and not value:
                value = []
            setattr(db_work_order, key, value)
        
        await db.commit()
        await db.refresh(db_work_order)
        
        result = await db.execute(
            select(models.WorkOrder)
            .options(
                selectinload(models.WorkOrder.room),
                selectinload(models.WorkOrder.property),
                selectinload(models.WorkOrder.machine),
                selectinload(models.WorkOrder.assigned_to),
                selectinload(models.WorkOrder.topic)
            )
            .filter(models.WorkOrder.id == work_order_id)
        )
        return result.scalars().first()
    except Exception as e:
        await db.rollback()
        print(f"Error patching work order: {e}")
        raise e

async def delete_work_order(db: AsyncSession, work_order_id: int):
    result = await db.execute(select(models.WorkOrder).filter(models.WorkOrder.id == work_order_id))
    db_work_order = result.scalars().first()
    if db_work_order:
        await db.delete(db_work_order)
        await db.commit()
    return db_work_order

async def create_work_order_file(db: AsyncSession, file: schemas.WorkOrderFileCreate):
    db_file = models.WorkOrderFile(**file.dict())
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)
    return db_file

async def update_user_password(db: AsyncSession, user: models.User, new_password: str):
    """Update user password"""
    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    return user

async def get_machines_by_work_order_type(
    db: AsyncSession, 
    work_order_type: WorkOrderType, 
    skip: int = 0, 
    limit: int = 100
) -> List[models.Machine]:
    """
    Retrieve machines suitable for the specified work order type.
    For 'pm', return machines with associated procedures.
    For 'issue', return all machines.
    For 'workorder', return no machines (as machine_id is not allowed).
    """
    if work_order_type == WorkOrderType.PM:
        result = await db.execute(
            select(models.Machine)
            .options(selectinload(models.Machine.procedures))
            .filter(models.Machine.procedures.any())  # Only machines with procedures
            .offset(skip)
            .limit(limit)
            .distinct()
        )
    elif work_order_type == WorkOrderType.ISSUE:
        result = await db.execute(
            select(models.Machine)
            .options(selectinload(models.Machine.work_orders))
            .offset(skip)
            .limit(limit)
            .distinct()
        )
    else:  # WorkOrderType.WORKORDER
        return []  # No machines for workorder type
    
    return result.scalars().all()


