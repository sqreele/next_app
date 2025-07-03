# ==============================================================================
# File: my_app/routers/work_orders.py
# Description: API endpoints for managing Work Orders.
# ==============================================================================
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from .. import crud, schemas, models, dependencies
from ..connection_manager import manager

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])

@router.post("/", response_model=schemas.WorkOrder, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    work_order: schemas.WorkOrderCreate,
    db: Session = Depends(dependencies.get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    property_id = None
    if work_order.machine_id:
        machine = crud.get_machine(db, machine_id=work_order.machine_id)
        if not machine: raise HTTPException(status_code=404, detail="Machine not found")
        property_id = machine.property_id
    elif work_order.room_id:
        room = crud.get_room(db, room_id=work_order.room_id)
        if not room: raise HTTPException(status_code=404, detail="Room not found")
        if not room.properties:
            raise HTTPException(status_code=400, detail="Room is not associated with any property")
        property_id = room.properties[0].id
    else:
        raise HTTPException(status_code=400, detail="Work order must link to a machine or room")

    user_property_ids = [p.id for p in current_user.profile.properties]
    if current_user.profile.role != 'Admin' and property_id not in user_property_ids:
        raise HTTPException(status_code=403, detail="User does not have access to this property")

    new_wo = crud.create_work_order(db=db, work_order=work_order, property_id=property_id)
    
    notification_message = {"type": "new_work_order", "data": {"id": new_wo.id, "task": new_wo.task, "property_id": new_wo.property_id}}
    await manager.broadcast(json.dumps(notification_message))
    
    return new_wo
