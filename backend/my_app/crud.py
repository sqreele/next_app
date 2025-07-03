# ==============================================================================
# File: backend/my_app/crud.py (Corrected)
# Description: Fully asynchronous CRUD operations.
# ==============================================================================
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from . import models, schemas
from .security import get_password_hash

# --- User CRUD ---
async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.User).filter(models.User.id == user_id))
    return result.scalars().first()

async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(models.User).filter(models.User.username == username))
    return result.scalars().first()

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return result.scalars().all()

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

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
    result = await db.execute(select(models.Machine).offset(skip).limit(limit))
    return result.scalars().all()

async def create_machine(db: AsyncSession, machine: schemas.MachineCreate, property_id: int):
    db_machine = models.Machine(**machine.dict(), property_id=property_id)
    db.add(db_machine)
    await db.commit()
    await db.refresh(db_machine)
    return db_machine

# --- WorkOrder CRUD ---
async def get_work_orders(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.WorkOrder).offset(skip).limit(limit))
    return result.scalars().all()

async def create_work_order(db: AsyncSession, work_order: schemas.WorkOrderCreate, property_id: int):
    db_work_order = models.WorkOrder(**work_order.dict(), property_id=property_id)
    db.add(db_work_order)
    await db.commit()
    await db.refresh(db_work_order)
    return db_work_order
# Add this function to your existing crud.py
async def get_machines_by_property(db: AsyncSession, property_id: int, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Machine)
        .filter(models.Machine.property_id == property_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()    

