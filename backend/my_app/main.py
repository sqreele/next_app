# ==============================================================================
# File: backend/my_app/main.py (Fixed for SQLAdmin)
# Description: Main FastAPI application setup.
# ==============================================================================
from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqladmin import Admin
from sqlalchemy import create_engine
from .database import engine as async_engine, Base, SQLALCHEMY_DATABASE_URL
from .routers import users, properties, rooms, machines, work_orders, auth  # Add auth here
from .connection_manager import manager
from .admin import (
    UserAdminFinal,  # Changed from UserAdmin to UserAdminFinal
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

from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static", StaticFiles(directory="Server/static"), name="static")

# Add Session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a synchronous engine for SQLAdmin
sync_engine = create_engine(
    SQLALCHEMY_DATABASE_URL.replace("+asyncpg", ""), 
    echo=True
)

# Setup Admin with synchronous engine
admin = Admin(app, sync_engine)
admin.add_view(UserAdminFinal)  # Use UserAdminFinal instead of UserAdmin
admin.add_view(UserProfileAdmin)
admin.add_view(PropertyAdmin)
admin.add_view(RoomAdmin)
admin.add_view(MachineAdmin)
admin.add_view(WorkOrderAdmin)
admin.add_view(WorkOrderFileAdmin)

async def create_db_and_tables():
    async with async_engine.begin() as conn:
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
app.include_router(image_upload.router, prefix="/api/v1", tags=["image_upload"])
app.include_router(auth.router)  # Changed from auth_router to auth.router

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

secret_key = os.getenv("SECRET_KEY")
google_client_id = os.getenv("GOOGLE_CLIENT_ID")
