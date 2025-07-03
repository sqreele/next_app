# ==============================================================================
# File: my_app/routers/properties.py
# Description: API endpoints for managing Properties.
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, dependencies

router = APIRouter(prefix="/properties", tags=["Properties"])

@router.post("/", response_model=schemas.Property, status_code=201)
def create_property(
    property: schemas.PropertyCreate, 
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_admin_user)
):
    db_property = crud.get_property_by_name(db, name=property.name)
    if db_property:
        raise HTTPException(status_code=400, detail="Property with this name already exists")
    return crud.create_property(db=db, property=property)

@router.get("/", response_model=List[schemas.Property])
def read_properties(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if hasattr(current_user, 'profile') and current_user.profile.role == 'Admin':
        return db.query(models.Property).all()
    return current_user.profile.properties


