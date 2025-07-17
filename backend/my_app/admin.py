from sqladmin import ModelView
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile, Topic, Procedure, ProcedureExecution
from markupsafe import Markup
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import text

# Helper functions
def format_image_preview(model, attribute):
    image_path = getattr(model, attribute, None)
    if image_path and isinstance(image_path, str) and image_path.strip():
        clean_path = image_path.strip('/')
        url = f"/Uploads/{clean_path}"
        return Markup(f'<a href="{url}" target="_blank"><img src="{url}" width="100" height="75" style="object-fit: cover; border-radius: 4px;" alt="Image" loading="lazy"></a>')
    return Markup('<span style="color: #ccc; font-size: 12px;">No Image</span>')

def format_image_array(model, attribute):
    images = getattr(model, attribute, [])
    if images and isinstance(images, list) and len(images) > 0:
        previews = []
        for img_path in images[:3]:
            if img_path and isinstance(img_path, str) and img_path.strip():
                clean_path = img_path.strip('/')
                url = f"/Uploads/{clean_path}"
                previews.append(f'<a href="{url}" target="_blank"><img src="{url}" width="50" height="50" style="object-fit: cover; border-radius: 4px;" alt="Image" loading="lazy"></a>')
        if len(images) > 3:
            previews.append(f'<span style="color: #666; font-size: 12px;">...and {len(images) - 3} more</span>')
        return Markup(f'<div class="image-preview-container">{("".join(previews))}</div>')
    return Markup('<span style="color: #ccc; font-size: 12px;">No Images</span>')

class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.username, User.email, User.is_active]
    column_details_exclude_list = [User.hashed_password]
    column_searchable_list = [User.username, User.email]
    column_sortable_list = [User.id, User.username, User.email, User.is_active]
    form_columns = [User.username, User.email, User.is_active]
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"

class UserProfileAdmin(ModelView, model=UserProfile):
    column_list = [UserProfile.id, UserProfile.user_id, UserProfile.role, UserProfile.position, UserProfile.properties]
    form_columns = [UserProfile.user_id, UserProfile.role, UserProfile.position, UserProfile.properties]
    column_searchable_list = [UserProfile.role, UserProfile.position]
    column_sortable_list = [UserProfile.id, UserProfile.role, UserProfile.position]
    name = "User Profile"
    name_plural = "User Profiles"
    icon = "fa-solid fa-id-card"

class PropertyAdmin(ModelView, model=Property):
    column_list = [Property.id, Property.name]
    form_columns = [Property.name]
    column_searchable_list = [Property.name]
    column_sortable_list = [Property.id, Property.name]
    name = "Property"
    name_plural = "Properties"
    icon = "fa-solid fa-building"

class RoomAdmin(ModelView, model=Room):
    column_list = [Room.id, Room.name, Room.number, Room.room_type, Room.is_active, Room.property_id]
    form_columns = [Room.property_id, Room.name, Room.number, Room.room_type, Room.is_active]
    column_searchable_list = [Room.name, Room.number, Room.room_type]
    column_sortable_list = [Room.id, Room.name, Room.number, Room.room_type, Room.is_active]
    name = "Room"
    name_plural = "Rooms"
    icon = "fa-solid fa-door-open"

class MachineAdmin(ModelView, model=Machine):
    column_list = [Machine.id, Machine.name, Machine.status, "property.name", "room.name", "procedures", "has_pm", "has_issue"]
    form_columns = [Machine.property, Machine.name, Machine.status, Machine.room, Machine.procedures]
    column_searchable_list = [Machine.name, Machine.status]
    column_sortable_list = [Machine.id, Machine.name, Machine.status]
    column_filters = ["name", "status", "property.name", "room.name", "work_orders.type"]  # Added work_orders.type filter
    name = "Machine"
    name_plural = "Machines"
    icon = "fa-solid fa-robot"

    # Load relationships
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(Machine.procedures),
            selectinload(Machine.work_orders),  # Load work orders for has_pm and has_issue
            selectinload(Machine.property),
            selectinload(Machine.room)
        )

    # Formatters for custom columns
    column_formatters = {
        'procedures': lambda m, a: f"{len(m.procedures)} procedures" if m.procedures else "No procedures",
        'has_pm': lambda m, a: "Yes" if any(wo.type == 'pm' for wo in m.work_orders) else "No",
        'has_issue': lambda m, a: "Yes" if any(wo.type == 'issue' for wo in m.work_orders) else "No",
        'property.name': lambda m, a: m.property.name if m.property else "No Property",
        'room.name': lambda m, a: m.room.name if m.room else "No Room"
    }

class ProcedureAdmin(ModelView, model=Procedure):
    column_list = [Procedure.id, Procedure.title, Procedure.remark, Procedure.frequency, "machines"]
    form_columns = ["machines", "title", "remark", "frequency"]
    column_searchable_list = [Procedure.title, Procedure.remark]
    column_sortable_list = [Procedure.id, Procedure.title]
    column_labels = {
        'id': 'ID',
        'title': 'Title',
        'remark': 'Remark',
        'frequency': 'Frequency',
        'machines': 'Machines'
    }
    column_formatters = {
        'machines': lambda m, a: ', '.join([machine.name for machine in m.machines]) if m.machines else 'No Machines'
    }
    page_size = 10

    def get_query(self, request):
        return super().get_query(request).options(selectinload(Procedure.machines))

    name = "Procedure"
    name_plural = "Procedures"
    icon = "fa-solid fa-list"

class WorkOrderAdmin(ModelView, model=WorkOrder):
    column_list = [WorkOrder.id, WorkOrder.task, WorkOrder.status, WorkOrder.priority, WorkOrder.due_date,
                   WorkOrder.property_id, WorkOrder.machine_id, WorkOrder.room_id, WorkOrder.assigned_to,
                   'before_images', 'after_images', WorkOrder.pdf_file_path, WorkOrder.topic_id, WorkOrder.type]
    form_columns = [WorkOrder.property_id, WorkOrder.task, WorkOrder.description, WorkOrder.status,
                    WorkOrder.priority, WorkOrder.due_date, WorkOrder.machine_id, WorkOrder.room_id,
                    WorkOrder.assigned_to_id, WorkOrder.pdf_file_path, WorkOrder.topic_id, WorkOrder.type]
    column_searchable_list = [WorkOrder.task, WorkOrder.description, WorkOrder.status, WorkOrder.priority]
    column_sortable_list = [WorkOrder.id, WorkOrder.task, WorkOrder.status, WorkOrder.priority, WorkOrder.due_date, WorkOrder.created_at]
    column_filters = ["status", "priority", "type"]  # Added type filter for WorkOrder
    column_formatters = {
        'before_images': lambda m, a: format_image_array(m, 'before_images'),
        'after_images': lambda m, a: format_image_array(m, 'after_images'),
        'assigned_to': lambda m, a: m.assigned_to.username if m.assigned_to else "Unassigned",
        'pdf_file_path': lambda m, a: Markup(f'<a href="/Uploads/{m.pdf_file_path.strip("/")}" target="_blank" class="pdf-link">📄 View PDF</a>') if m.pdf_file_path else Markup('<span style="color: #ccc; font-size: 12px;">No PDF</span>'),
        'type': lambda m, a: m.type.upper() if m.type else "N/A"
    }
    name = "Work Order"
    name_plural = "Work Orders"
    icon = "fa-solid fa-list-check"

    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(WorkOrder.assigned_to),
            selectinload(WorkOrder.property),
            selectinload(WorkOrder.machine),
            selectinload(WorkOrder.room),
            selectinload(WorkOrder.topic)
        )

class WorkOrderFileAdmin(ModelView, model=WorkOrderFile):
    column_list = [WorkOrderFile.id, WorkOrderFile.file_path, WorkOrderFile.file_name, WorkOrderFile.file_size,
                   WorkOrderFile.mime_type, WorkOrderFile.upload_type, WorkOrderFile.uploaded_at, WorkOrderFile.work_order_id]
    form_columns = [WorkOrderFile.work_order_id, WorkOrderFile.file_path, WorkOrderFile.file_name,
                    WorkOrderFile.file_size, WorkOrderFile.mime_type, WorkOrderFile.upload_type, WorkOrderFile.uploaded_at]
    column_searchable_list = [WorkOrderFile.file_path, WorkOrderFile.upload_type]
    column_sortable_list = [WorkOrderFile.id, WorkOrderFile.file_path, WorkOrderFile.upload_type, WorkOrderFile.uploaded_at]
    name = "Work Order File"
    name_plural = "Work Order Files"
    icon = "fa-solid fa-file"

class TopicAdmin(ModelView, model=Topic):
    column_list = [Topic.id, Topic.title]
    form_columns = [Topic.title]
    column_searchable_list = [Topic.title]
    column_sortable_list = [Topic.id, Topic.title]
    name = "Topic"
    name_plural = "Topics"
    icon = "fa-solid fa-tag"

class ProcedureExecutionAdmin(ModelView, model=ProcedureExecution):
    column_list = [ProcedureExecution.id, "procedure.title", "machine.name",
                   ProcedureExecution.scheduled_date, ProcedureExecution.status,
                   ProcedureExecution.completed_date, "assigned_to.username",
                   'before_images', 'after_images']
    form_columns = ["procedure", "machine", "scheduled_date", "status", "assigned_to",
                    "execution_notes", "completed_date", "completed_by"]
    column_searchable_list = ["procedure.title", "machine.name", "execution_notes"]
    column_sortable_list = [ProcedureExecution.scheduled_date, ProcedureExecution.status]
    column_labels = {
        'procedure.title': 'Procedure',
        'machine.name': 'Machine',
        'assigned_to.username': 'Assigned To',
        'completed_by.username': 'Completed By',
        'before_images': 'Before Images',
        'after_images': 'After Images'
    }
    column_formatters = {
        'before_images': lambda m, a: format_image_array(m, 'before_images'),
        'after_images': lambda m, a: format_image_array(m, 'after_images'),
        'procedure.title': lambda m, a: m.procedure.title if m.procedure else 'No Procedure',
        'machine.name': lambda m, a: m.machine.name if m.machine else 'No Machine',
        'assigned_to.username': lambda m, a: m.assigned_to.username if m.assigned_to else 'Unassigned',
        'completed_by.username': lambda m, a: m.completed_by.username if m.completed_by else 'Not Completed'
    }
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(ProcedureExecution.procedure),
            selectinload(ProcedureExecution.machine),
            selectinload(ProcedureExecution.assigned_to),
            selectinload(ProcedureExecution.completed_by)
        )
    name = "Procedure Execution"
    name_plural = "Procedure Executions"
    icon = "fa-solid fa-calendar-check"
