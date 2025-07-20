from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqladmin import Admin
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from my_app.routers import calendar, users, properties, rooms, machines, work_orders, auth, topic, procedure
from my_app.admin import ProcedureExecutionAdmin, UserAdmin, UserProfileAdmin, PropertyAdmin, RoomAdmin, MachineAdmin, WorkOrderAdmin, WorkOrderFileAdmin, TopicAdmin, ProcedureAdmin
from my_app.login_admin import authentication_backend, init_admin_auth
from my_app.database import async_engine, sync_engine, Base, get_db
from my_app.connection_manager import manager
from my_app.models import WorkOrder, WorkOrderFile, Machine, Procedure, ProcedureExecution, machine_procedure_association, User, Property, Room, Topic
from my_app.schemas import WorkOrderCreate, WorkOrderResponse, WorkOrderType, FileUploadResponse
from datetime import date

app = FastAPI(title="Property Management API", version="1.0.0")

# Add middlewares
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "secret"))
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Setup static files
UPLOADS_DIR = "/app/uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Setup Admin
admin = Admin(
    app,
    sync_engine,
    authentication_backend=authentication_backend,
    templates_dir="my_app/templates"
)

# Add admin views
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

@app.get("/api/admin/procedures")
async def get_procedures_for_admin():
    from sqlalchemy.orm import Session
    from my_app.models import Procedure
    with Session(sync_engine) as db:
        procedures = db.query(Procedure).order_by(Procedure.title).all()
        return [
            {
                "id": proc.id,
                "title": proc.title,
                "remark": proc.remark or "",
                "frequency": proc.frequency or ""
            }
            for proc in procedures
        ]

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

@app.post("/api/v1/work_orders/", response_model=WorkOrderResponse)
async def create_work_order(
    work_order: WorkOrderCreate = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # Validate foreign keys
    if work_order.machine_id:
        machine = await db.get(Machine, work_order.machine_id)
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
    if work_order.procedure_id:
        procedure = await db.get(Procedure, work_order.procedure_id)
        if not procedure:
            raise HTTPException(status_code=404, detail="Procedure not found")
    if work_order.room_id:
        room = await db.get(Room, work_order.room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
    if work_order.assigned_to_id:
        user = await db.get(User, work_order.assigned_to_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    if work_order.property_id:
        property = await db.get(Property, work_order.property_id)
        if not property:
            raise HTTPException(status_code=404, detail="Property not found")
    if work_order.topic_id:
        topic = await db.get(Topic, work_order.topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")

    # Validate machine_id and procedure_id for pm
    if work_order.type == WorkOrderType.PM and work_order.machine_id and work_order.procedure_id:
        result = await db.execute(
            select(machine_procedure_association).where(
                machine_procedure_association.c.machine_id == work_order.machine_id,
                machine_procedure_association.c.procedure_id == work_order.procedure_id
            )
        )
        if not result.fetchone():
            raise HTTPException(status_code=422, detail="Selected machine and procedure are not associated")

    # Create WorkOrder
    db_work_order = WorkOrder(**work_order.dict(exclude={'before_images', 'after_images'}))
    db.add(db_work_order)
    await db.commit()
    await db.refresh(db_work_order)

    # Create WorkOrderFile records for images
    for img_path in work_order.before_images:
        file_record = WorkOrderFile(
            file_path=img_path,
            file_name=os.path.basename(img_path),
            mime_type="image/jpeg",
            upload_type="before",
            work_order_id=db_work_order.id
        )
        db.add(file_record)
    for img_path in work_order.after_images:
        file_record = WorkOrderFile(
            file_path=img_path,
            file_name=os.path.basename(img_path),
            mime_type="image/jpeg",
            upload_type="after",
            work_order_id=db_work_order.id
        )
        db.add(file_record)

    # Create ProcedureExecution for pm
    if work_order.type == WorkOrderType.PM and work_order.procedure_id and work_order.machine_id:
        execution = ProcedureExecution(
            procedure_id=work_order.procedure_id,
            work_order_id=db_work_order.id,
            machine_id=work_order.machine_id,
            scheduled_date=work_order.due_date or date.today(),
            status="Scheduled",
            assigned_to_id=work_order.assigned_to_id
        )
        db.add(execution)

    # Update JSONB fields
    db_work_order.before_images = work_order.before_images
    db_work_order.after_images = work_order.after_images
    await db.commit()
    await db.refresh(db_work_order)

    return WorkOrderResponse(data=db_work_order, message="Work order created successfully")