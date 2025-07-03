# ==============================================================================
# File: backend/my_app/main.py (Corrected)
# Description: Main FastAPI application setup.
# ==============================================================================
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqladmin import Admin
from .database import engine, Base
from .routers import users, properties, rooms, machines, work_orders
from .connection_manager import manager
from .admin import (
    UserAdmin, 
    UserProfileAdmin, 
    PropertyAdmin, 
    RoomAdmin, 
    MachineAdmin, 
    WorkOrderAdmin, 
    WorkOrderFileAdmin
)

# Create FastAPI app
app = FastAPI(
    title="Property Management API", 
    version="1.0.0",
    docs_url="/docs",  # This ensures /docs works
    redoc_url="/redoc"
)

# Setup Admin - This creates /admin route
admin = Admin(app, engine)
admin.add_view(UserAdmin)
admin.add_view(UserProfileAdmin)
admin.add_view(PropertyAdmin)
admin.add_view(RoomAdmin)
admin.add_view(MachineAdmin)
admin.add_view(WorkOrderAdmin)
admin.add_view(WorkOrderFileAdmin)

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()

# Include API routers
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(properties.router, prefix="/api/v1", tags=["properties"])
app.include_router(rooms.router, prefix="/api/v1", tags=["rooms"])
app.include_router(machines.router, prefix="/api/v1", tags=["machines"])
app.include_router(work_orders.router, prefix="/api/v1", tags=["work_orders"])

@app.get("/")
async def root():
    return {"message": "Property Management API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(f"You wrote: {data}", websocket)
            await manager.broadcast(f"Client #{client_id} says: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client #{client_id} left the chat")
