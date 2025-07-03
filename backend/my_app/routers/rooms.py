
# ==============================================================================
# File: my_app/routers/rooms.py
# Description: API endpoints for managing Rooms.
# ==============================================================================
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, dependencies

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("/", response_model=List[schemas.Room])
def read_rooms(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.profile.role == 'Admin':
        return db.query(models.Room).all()
    
    user_properties = current_user.profile.properties
    return db.query(models.Room).filter(models.Room.properties.any(models.Property.id.in_([p.id for p in user_properties]))).all()

