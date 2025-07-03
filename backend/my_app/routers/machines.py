# ==============================================================================
# File: my_app/routers/machines.py
# Description: API endpoints for managing Machines.
# ==============================================================================
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, dependencies

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("/", response_model=List[schemas.Machine])
def read_machines(
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.profile.role == 'Admin':
        return db.query(models.Machine).all()
        
    user_property_ids = [p.id for p in current_user.profile.properties]
    return db.query(models.Machine).filter(models.Machine.property_id.in_(user_property_ids)).all()