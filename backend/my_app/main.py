# ==============================================================================
# File: backend/my_app/main.py (Corrected)
# Description: Main FastAPI application setup.
# ==============================================================================
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette_admin.contrib.sqla import Admin
from .database import engine, Base
from .models import User, UserProfile, Property, Room, Machine, WorkOrder
from .routers import users, properties, rooms, machines, work_orders
from .connection_manager import manager

app = FastAPI()

# Setup Admin
admin = Admin(engine, title="Admin Panel")
admin.add_view(User)
admin.add_view(UserProfile)
admin.add_view(Property)
admin.add_view(Room)
admin.add_view(Machine)
admin.add_view(WorkOrder)
admin.mount_to(app)

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()

app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(properties.router, prefix="/api/v1", tags=["properties"])
app.include_router(rooms.router, prefix="/api/v1", tags=["rooms"])
app.include_router(machines.router, prefix="/api/v1", tags=["machines"])
app.include_router(work_orders.router, prefix="/api/v1", tags=["work_orders"])

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
        await manager.broadcast(f"Client #{client_id} left the chat"

