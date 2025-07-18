from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqladmin import Admin
from fastapi.staticfiles import StaticFiles
from my_app.routers import calendar
from my_app.admin import ProcedureExecutionAdmin

# Import the admin authentication system
from my_app.login_admin import authentication_backend, init_admin_auth

# Import after loading env
from my_app.database import engine as async_engine, sync_engine, Base
from my_app.routers import users, properties, rooms, machines, work_orders, auth, topic, procedure
from my_app.connection_manager import manager

# Create FastAPI app
app = FastAPI(title="Property Management API", version="1.0.0")

# Add middlewares
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "secret"))
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Setup static files
UPLOADS_DIR = "/app/uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Setup Admin with Authentication - UPDATED
from my_app.admin import (UserAdmin, UserProfileAdmin, PropertyAdmin, RoomAdmin, 
                          MachineAdmin, WorkOrderAdmin, WorkOrderFileAdmin, TopicAdmin, ProcedureAdmin)

# Create admin with authentication backend
admin = Admin(app, sync_engine, authentication_backend=authentication_backend)

# Add all admin views
admin.add_view(UserAdmin)
admin.add_view(UserProfileAdmin)
admin.add_view(PropertyAdmin)
admin.add_view(RoomAdmin)
admin.add_view(MachineAdmin)
admin.add_view(ProcedureAdmin)
admin.add_view(WorkOrderAdmin)
admin.add_view(WorkOrderFileAdmin)
admin.add_view(TopicAdmin)
admin.add_view(ProcedureExecutionAdmin)

# Database setup
async def create_db_and_tables():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()
    # Initialize admin authentication system
    init_admin_auth()

# Include routers
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(properties.router, prefix="/api/v1", tags=["properties"])
app.include_router(rooms.router, prefix="/api/v1", tags=["rooms"])
app.include_router(machines.router, prefix="/api/v1", tags=["machines"])
app.include_router(work_orders.router, prefix="/api/v1", tags=["work_orders"])
app.include_router(auth.router)
app.include_router(topic.router, prefix="/api/v1", tags=["topics"])
app.include_router(procedure.router, prefix="/api/v1", tags=["procedures"])
app.include_router(calendar.router, prefix="/api/v1", tags=["calendar"])

@app.get("/")
async def root():
    return {"message": "Property Management API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Debug endpoints (remove these in production)
@app.get("/debug/check-admin")
async def check_admin_exists():
    """Debug endpoint to check if admin exists"""
    from sqlalchemy.orm import Session
    from my_app.models import User, UserProfile
    from my_app.database import sync_engine
    
    with Session(sync_engine) as db:
        try:
            # Check for admin users
            admin_users = db.query(User).join(UserProfile).filter(
                UserProfile.role == 'Admin'
            ).all()
            
            result = {
                "admin_count": len(admin_users),
                "admins": []
            }
            
            for user in admin_users:
                result["admins"].append({
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_active": user.is_active,
                    "has_profile": user.profile is not None,
                    "role": user.profile.role if user.profile else None
                })
            
            return result
            
        except Exception as e:
            return {"error": str(e)}

@app.post("/debug/create-admin")
async def manual_create_admin(username: str = "admin", password: str = "admin123"):
    """Manually create admin user"""
    from sqlalchemy.orm import Session
    from my_app.models import User, UserProfile
    from my_app.security import get_password_hash
    
    with Session(sync_engine) as db:
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.username == username).first()
            if existing_user:
                return {"error": f"User '{username}' already exists"}
            
            # Create user
            admin_user = User(
                username=username,
                email=f"{username}@maintenancepro.com",
                hashed_password=get_password_hash(password),
                is_active=True
            )
            db.add(admin_user)
            db.flush()
            
            # Create profile
            admin_profile = UserProfile(
                user_id=admin_user.id,
                role="Admin",
                position="System Administrator"
            )
            db.add(admin_profile)
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Admin user '{username}' created successfully",
                "username": username,
                "password": password,
                "user_id": admin_user.id
            }
            
        except Exception as e:
            db.rollback()
            return {"error": str(e)}

@app.post("/debug/test-auth")
async def test_auth(username: str, password: str):
    """Test authentication manually"""
    from sqlalchemy.orm import Session
    from my_app.security import verify_password
    from my_app.models import User, UserProfile
    
    with Session(sync_engine) as db:
        try:
            user = db.query(User).filter(User.username == username).first()
            
            if not user:
                return {"error": "User not found"}
            
            password_valid = verify_password(password, user.hashed_password)
            
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            
            return {
                "user_found": True,
                "username": user.username,
                "is_active": user.is_active,
                "password_valid": password_valid,
                "has_profile": profile is not None,
                "role": profile.role if profile else None,
                "can_access_admin": profile and profile.role in ['Admin', 'Manager'] if profile else False
            }
            
        except Exception as e:
            return {"error": str(e)}

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
