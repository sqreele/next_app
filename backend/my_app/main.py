# ==============================================================================
# File: my_app/main.py
# Description: The main entry point for the FastAPI application.
# ==============================================================================
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqladmin import Admin
from .database import engine
from . import models
from .routers import users, work_orders # Import other routers as you create them
from .admin import UserAdmin, UserProfileAdmin, PropertyAdmin # Import other admins
from .connection_manager import manager

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MaintenancePro API - V4")

admin = Admin(app, engine)

app.include_router(users.router, prefix="/api/v1")
app.include_router(work_orders.router, prefix="/api/v1")
# app.include_router(machines.router, prefix="/api/v1")
# app.include_router(rooms.router, prefix="/api/v1")

admin.add_view(UserAdmin)
admin.add_view(UserProfileAdmin)
admin.add_view(PropertyAdmin)
# admin.add_view(RoomAdmin)
# admin.add_view(MachineAdmin)
# admin.add_view(WorkOrderAdmin)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
def read_root():
    return {"message": "Welcome to MaintenancePro API V4. Go to /admin to access the admin panel."}