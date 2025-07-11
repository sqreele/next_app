# ==============================================================================
# File: backend/my_app/crud.py (Fixed with proper async loading)
# Description: Fully asynchronous CRUD operations with proper relationship loading.
# ==============================================================================
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from . import models, schemas
from .security import get_password_hash

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
    await db.flush()  # Get db_user.id before commit

    # Create profile if provided
    if user.profile:
        db_profile = models.UserProfile(
            user_id=db_user.id,
            role=user.profile.role,
            position=user.profile.position
        )
        db.add(db_profile)
        await db.flush()  # Get profile ID

        # Add properties if provided
        if user.profile.property_ids:
            properties = await db.execute(
                select(models.Property).where(models.Property.id.in_(user.profile.property_ids))
            )
            property_objects = properties.scalars().all()
            db_profile.properties.extend(property_objects)

    await db.commit()
    
    # Reload user with all relationships
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

async def get_work_order(db: AsyncSession, work_order_id: int):
    result = await db.execute(select(models.WorkOrder).filter(models.WorkOrder.id == work_order_id))
    return result.scalars().first()

async def create_work_order(db: AsyncSession, work_order: schemas.WorkOrderCreate):
    db_work_order = models.WorkOrder(**work_order.dict())
    db.add(db_work_order)
    await db.commit()
    await db.refresh(db_work_order)
    return db_work_order

async def update_work_order(db: AsyncSession, work_order_id: int, work_order: schemas.WorkOrderCreate):
    result = await db.execute(select(models.WorkOrder).filter(models.WorkOrder.id == work_order_id))
    db_work_order = result.scalars().first()
    if db_work_order:
        for key, value in work_order.dict().items():
            setattr(db_work_order, key, value)
        await db.commit()
        await db.refresh(db_work_order)
    return db_work_order

async def delete_work_order(db: AsyncSession, work_order_id: int):
    result = await db.execute(select(models.WorkOrder).filter(models.WorkOrder.id == work_order_id))
    db_work_order = result.scalars().first()
    if db_work_order:
        await db.delete(db_work_order)
        await db.commit()
    return db_work_order

async def get_machines_by_property(db: AsyncSession, property_id: int, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Machine)
        .filter(models.Machine.property_id == property_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

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