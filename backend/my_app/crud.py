# ==============================================================================
# File: my_app/crud.py   # # Description: Contains reusable functions to interact with the database.
# ==============================================================================
from sqlalchemy.orm import Session
from . import models, schemas, security

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db_profile = models.UserProfile(user_id=db_user.id)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_user
    
def get_machine(db: Session, machine_id: int):
    return db.query(models.Machine).filter(models.Machine.id == machine_id).first()

def get_room(db: Session, room_id: int):
    return db.query(models.Room).filter(models.Room.id == room_id).first()

def create_work_order(db: Session, work_order: schemas.WorkOrderCreate, property_id: int):
    db_work_order = models.WorkOrder(**work_order.dict(), property_id=property_id)
    db.add(db_work_order)
    db.commit()
    db.refresh(db_work_order)
    return db_work_order
