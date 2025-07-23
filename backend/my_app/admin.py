from sqladmin import ModelView
from markupsafe import Markup
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.exc import DetachedInstanceError
from datetime import datetime, timedelta
import pytz
from .models import (
    User, Property, Room, Machine, Topic, Procedure, PMSchedule, PMExecution,
    Issue, Inspection, PMFile, UserPropertyAccess,
    UserRole, FrequencyType, PMStatus, IssueStatus, IssuePriority,
    InspectionResult, ImageType, AccessLevel
)

# Helper functions for safe data access and formatting
def safe_get_attr(obj, attr, default="N/A"):
    """Safely get attribute from object."""
    try:
        value = getattr(obj, attr, default)
        return value if value is not None else default
    except (DetachedInstanceError, AttributeError) as e:
        print(f"Error in safe_get_attr for {attr}: {str(e)}")  # Debug
        return default

def safe_get_relationship_name(obj, relationship_attr, name_attr="name", default="Unknown"):
    """Safely get name from related object."""
    try:
        related_obj = getattr(obj, relationship_attr, None)
        if related_obj:
            if hasattr(related_obj, name_attr):
                return getattr(related_obj, name_attr)
            elif hasattr(related_obj, 'title'):
                return related_obj.title
            elif hasattr(related_obj, 'username'):
                return related_obj.username
            print(f"No {name_attr}, title, or username in {relationship_attr}")  # Debug
        print(f"No related object for {relationship_attr}")  # Debug
        return default
    except (DetachedInstanceError, AttributeError) as e:
        print(f"Error in safe_get_relationship_name for {relationship_attr}: {str(e)}")  # Debug
        return default

def safe_get_user_full_name(obj, relationship_attr, default="Unknown"):
    """Safely get user's full name."""
    try:
        user = getattr(obj, relationship_attr, None)
        if user and hasattr(user, 'first_name') and hasattr(user, 'last_name'):
            full_name = f"{user.first_name} {user.last_name}".strip()
            return full_name if full_name else (user.username if hasattr(user, 'username') else default)
        print(f"No user or incomplete user data for {relationship_attr}")  # Debug
        return default
    except (DetachedInstanceError, AttributeError) as e:
        print(f"Error in safe_get_user_full_name for {relationship_attr}: {str(e)}")  # Debug
        return default

def format_enum_badge(model, attribute, color_map=None):
    """Format enum value as colored badge."""
    try:
        value = getattr(model, attribute, None)
        if not value:
            return Markup('<span class="badge badge-secondary">N/A</span>')
        
        enum_value = value.value if hasattr(value, 'value') else str(value)
        
        default_colors = {
            # User Roles
            'TECHNICIAN': 'info',
            'SUPERVISOR': 'warning',
            'MANAGER': 'primary',
            'ADMIN': 'danger',
            # PM Status
            'SCHEDULED': 'info',
            'IN_PROGRESS': 'warning',
            'COMPLETED': 'success',
            'CANCELLED': 'secondary',
            'OVERDUE': 'danger',
            # Issue Status
            'OPEN': 'warning',
            'ASSIGNED': 'info',
            'RESOLVED': 'success',
            'CLOSED': 'secondary',
            # Issue Priority
            'LOW': 'secondary',
            'MEDIUM': 'info',
            'HIGH': 'warning',
            'CRITICAL': 'danger',
            # Inspection Result
            'PASS': 'success',
            'FAIL': 'danger',
            'NEEDS_ATTENTION': 'warning',
            # Frequency
            'DAILY': 'info',
            'WEEKLY': 'primary',
            'MONTHLY': 'warning',
            'QUARTERLY': 'secondary',
            'ANNUAL': 'dark',
            # Access Level
            'READ_ONLY': 'secondary',
            'FULL_ACCESS': 'success',
            'SUPERVISOR': 'warning',
            'ADMIN': 'danger'
        }
        
        colors = color_map or default_colors
        color = colors.get(enum_value, 'secondary')
        
        return Markup(f'<span class="badge badge-{color}">{enum_value}</span>')
    except Exception as e:
        print(f"Error in format_enum_badge for {attribute}: {str(e)}")  # Debug
        return Markup('<span class="badge badge-secondary">Error</span>')

def format_image_preview(model, attribute):
    """Format image path as preview."""
    try:
        image_path = getattr(model, attribute, None)
        print(f"Image path: {image_path}")  # Debug
        if image_path and isinstance(image_path, str) and image_path.strip():
            clean_path = image_path.strip('/')
            url = f"/Uploads/{clean_path}"
            return Markup(f'''
                <a href="{url}" target="_blank">
                    <img src="{url}" width="60" height="45" 
                         style="object-fit: cover; border-radius: 4px;" 
                         alt="Preview" loading="lazy">
                </a>
            ''')
        return Markup('<span style="color: #999; font-size: 12px;">No Image</span>')
    except Exception as e:
        print(f"Error in format_image_preview for {attribute}: {str(e)}")  # Debug
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_file_link(model, attribute):
    """Format file path as download link."""
    try:
        file_path = getattr(model, attribute, None)
        print(f"File path: {file_path}")  # Debug
        if file_path and isinstance(file_path, str) and file_path.strip():
            clean_path = file_path.strip('/')
            url = f"/Uploads/{clean_path}"
            file_name = getattr(model, 'file_name', 'Download')
            return Markup(f'<a href="{url}" target="_blank" class="btn btn-sm btn-outline-primary">📄 {file_name}</a>')
        return Markup('<span style="color: #999; font-size: 12px;">No File</span>')
    except Exception as e:
        print(f"Error in format_file_link for {attribute}: {str(e)}")  # Debug
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_datetime(model, attribute):
    """Format datetime for display with timezone."""
    try:
        dt = getattr(model, attribute, None)
        if dt and isinstance(dt, datetime):
            if dt.tzinfo is None:  # Make naive datetime timezone-aware
                dt = pytz.utc.localize(dt)
            return dt.strftime("%Y-%m-%d %H:%M %Z")
        return "N/A"
    except Exception as e:
        print(f"Error in format_datetime for {attribute}: {str(e)}")  # Debug
        return "Error"

def format_overdue_status(model, attribute):
    """Format overdue status with color coding."""
    try:
        next_due = getattr(model, attribute, None)
        if next_due and isinstance(next_due, datetime):
            if next_due.tzinfo is None:
                next_due = pytz.utc.localize(next_due)
            now = datetime.now(pytz.utc)
            if next_due < now:
                days_overdue = (now - next_due).days
                return Markup(f'<span class="badge badge-danger">Overdue {days_overdue} days</span>')
            elif next_due <= now + timedelta(days=7):
                days_until = (next_due - now).days
                return Markup(f'<span class="badge badge-warning">Due in {days_until} days</span>')
            else:
                return Markup('<span class="badge badge-success">On Schedule</span>')
        return "N/A"
    except Exception as e:
        print(f"Error in format_overdue_status for {attribute}: {str(e)}")  # Debug
        return "Error"

# Admin Model Views
class UserAdmin(ModelView, model=User):
    column_list = [
        User.id, User.username, User.first_name, User.last_name,
        User.email, User.role, User.is_active, User.created_at
    ]
    column_details_list = [
        User.id, User.username, User.first_name, User.last_name,
        User.email, User.phone, User.role, User.is_active,
        User.created_at, User.updated_at
    ]
    form_columns = [
        User.username, User.email, User.first_name, User.last_name,
        User.phone, User.role, User.is_active
    ]
    column_searchable_list = [User.username, User.email, User.first_name, User.last_name]
    column_sortable_list = [User.id, User.username, User.first_name, User.last_name, User.role, User.created_at]
    column_filters = [User.role, User.is_active]
    
    column_formatters = {
        'role': lambda m, a: format_enum_badge(m, 'role'),
        'is_active': lambda m, a: Markup('<span class="badge badge-success">Active</span>' if m.is_active else '<span class="badge badge-secondary">Inactive</span>'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"

class PropertyAdmin(ModelView, model=Property):
    column_list = [Property.id, Property.name, Property.address, Property.is_active, Property.created_at]
    form_columns = [Property.name, Property.address, Property.is_active]
    column_searchable_list = [Property.name, Property.address]
    column_sortable_list = [Property.id, Property.name, Property.is_active, Property.created_at]
    column_filters = [Property.is_active]
    
    column_formatters = {
        'is_active': lambda m, a: Markup('<span class="badge badge-success">Active</span>' if m.is_active else '<span class="badge badge-secondary">Inactive</span>'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
    }
    
    name = "Property"
    name_plural = "Properties"
    icon = "fa-solid fa-building"

class RoomAdmin(ModelView, model=Room):
    column_list = [Room.id, Room.name, Room.room_number, "property_name", Room.is_active]
    form_columns = [Room.property_id, Room.name, Room.room_number, Room.is_active]
    column_searchable_list = [Room.name, Room.room_number]
    column_sortable_list = [Room.id, Room.name, Room.room_number, Room.is_active]
    column_filters = [Room.property_id, Room.is_active]
    
    column_formatters = {
        'property_name': lambda m, a: safe_get_relationship_name(m, 'property'),
        'is_active': lambda m, a: Markup('<span class="badge badge-success">Active</span>' if m.is_active else '<span class="badge badge-secondary">Inactive</span>'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    def get_query(self, request):
        return super().get_query(request).options(selectinload(Room.property))
    
    name = "Room"
    name_plural = "Rooms"
    icon = "fa-solid fa-door-open"

class MachineAdmin(ModelView, model=Machine):
    column_list = [
        Machine.id, Machine.name, Machine.model, Machine.serial_number,
        "room_name", "property_name", Machine.is_active
    ]
    form_columns = [
        Machine.room_id, Machine.name, Machine.model, Machine.serial_number,
        Machine.description, Machine.is_active
    ]
    column_searchable_list = [Machine.name, Machine.model, Machine.serial_number]
    column_sortable_list = [Machine.id, Machine.name, Machine.model, Machine.serial_number, Machine.is_active]
    column_filters = [Machine.room_id, Machine.is_active]
    
    column_formatters = {
        'room_name': lambda m, a: safe_get_relationship_name(m, 'room'),
        'property_name': lambda m, a: safe_get_relationship_name(m.room, 'property') if hasattr(m, 'room') and m.room else 'N/A',
        'is_active': lambda m, a: Markup('<span class="badge badge-success">Active</span>' if m.is_active else '<span class="badge badge-secondary">Inactive</span>'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(Machine.room).selectinload(Room.property)
        )
    
    name = "Machine"
    name_plural = "Machines"
    icon = "fa-solid fa-cogs"

class TopicAdmin(ModelView, model=Topic):
    column_list = [Topic.id, Topic.title, Topic.description, Topic.is_active, Topic.created_at]
    form_columns = [Topic.title, Topic.description, Topic.is_active]
    column_searchable_list = [Topic.title, Topic.description]
    column_sortable_list = [Topic.id, Topic.title, Topic.is_active, Topic.created_at]
    column_filters = [Topic.is_active]
    
    column_formatters = {
        'is_active': lambda m, a: Markup('<span class="badge badge-success">Active</span>' if m.is_active else '<span class="badge badge-secondary">Inactive</span>'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    name = "Topic"
    name_plural = "Topics"
    icon = "fa-solid fa-tags"

class ProcedureAdmin(ModelView, model=Procedure):
    column_list = [
        Procedure.id, Procedure.title, "topic_name",
        Procedure.estimated_minutes, Procedure.is_active
    ]
    form_columns = [
        Procedure.topic_id, Procedure.title, Procedure.description,
        Procedure.instructions, Procedure.estimated_minutes, Procedure.is_active
    ]
    column_searchable_list = [Procedure.title, Procedure.description]
    column_sortable_list = [Procedure.id, Procedure.title, Procedure.estimated_minutes, Procedure.is_active]
    column_filters = [Procedure.topic_id, Procedure.is_active]
    
    column_formatters = {
        'topic_name': lambda m, a: safe_get_relationship_name(m, 'topic', 'title'),
        'estimated_minutes': lambda m, a: f"{m.estimated_minutes} min" if m.estimated_minutes else "N/A",
        'is_active': lambda m, a: Markup('<span class="badge badge-success">Active</span>' if m.is_active else '<span class="badge badge-secondary">Inactive</span>'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    def get_query(self, request):
        return super().get_query(request).options(selectinload(Procedure.topic))
    
    name = "Procedure"
    name_plural = "Procedures"
    icon = "fa-solid fa-list-alt"

class PMScheduleAdmin(ModelView, model=PMSchedule):
    column_list = [
        PMSchedule.id, "machine_name", "procedure_title", "responsible_user_name",
        PMSchedule.frequency, PMSchedule.next_due, "due_status", PMSchedule.is_active
    ]
    form_columns = [
        PMSchedule.machine_id, PMSchedule.procedure_id, PMSchedule.user_id,
        PMSchedule.frequency, PMSchedule.frequency_value, PMSchedule.next_due,
        PMSchedule.last_completed, PMSchedule.is_active
    ]
    column_searchable_list = []
    column_sortable_list = [PMSchedule.id, PMSchedule.frequency, PMSchedule.next_due, PMSchedule.is_active]
    column_filters = [PMSchedule.machine_id, PMSchedule.procedure_id, PMSchedule.user_id, PMSchedule.frequency, PMSchedule.is_active]
    
    column_formatters = {
        'machine_name': lambda m, a: safe_get_relationship_name(m, 'machine'),
        'procedure_title': lambda m, a: safe_get_relationship_name(m, 'procedure', 'title'),
        'responsible_user_name': lambda m, a: safe_get_user_full_name(m, 'responsible_user'),
        'frequency': lambda m, a: format_enum_badge(m, 'frequency'),
        'next_due': lambda m, a: format_datetime(m, 'next_due'),
        'due_status': lambda m, a: format_overdue_status(m, 'next_due'),
        'is_active': lambda m, a: Markup('<span class="badge badge-success">Active</span>' if m.is_active else '<span class="badge badge-secondary">Inactive</span>'),
        'last_completed': lambda m, a: format_datetime(m, 'last_completed'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(PMSchedule.machine).selectinload(Machine.room).selectinload(Room.property),
            selectinload(PMSchedule.procedure).selectinload(Procedure.topic),
            selectinload(PMSchedule.responsible_user)
        )
    
    name = "PM Schedule"
    name_plural = "PM Schedules"
    icon = "fa-solid fa-calendar-alt"

class PMExecutionAdmin(ModelView, model=PMExecution):
    column_list = [
        PMExecution.id, "schedule_info", "executor_name", PMExecution.status,
        PMExecution.started_at, PMExecution.completed_at
    ]
    form_columns = [
        PMExecution.pm_schedule_id, PMExecution.executed_by_id, PMExecution.status,
        PMExecution.notes, PMExecution.started_at, PMExecution.completed_at,
        PMExecution.next_due_calculated
    ]
    column_searchable_list = [PMExecution.notes]
    column_sortable_list = [PMExecution.id, PMExecution.status, PMExecution.started_at, PMExecution.completed_at]
    column_filters = [PMExecution.pm_schedule_id, PMExecution.executed_by_id, PMExecution.status]
    
    column_formatters = {
        'schedule_info': lambda m, a: (
            f"{safe_get_relationship_name(m.pm_schedule, 'machine')} - {safe_get_relationship_name(m.pm_schedule, 'procedure', 'title')}"
            if hasattr(m, 'pm_schedule') and m.pm_schedule else 'No Schedule'
        ),
        'executor_name': lambda m, a: safe_get_user_full_name(m, 'executor'),
        'status': lambda m, a: format_enum_badge(m, 'status'),
        'started_at': lambda m, a: format_datetime(m, 'started_at'),
        'completed_at': lambda m, a: format_datetime(m, 'completed_at'),
        'next_due_calculated': lambda m, a: format_datetime(m, 'next_due_calculated'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(PMExecution.pm_schedule)
                .selectinload(PMSchedule.machine)
                .selectinload(Machine.room)
                .selectinload(Room.property),
            selectinload(PMExecution.pm_schedule).selectinload(PMSchedule.procedure),
            selectinload(PMExecution.executor)
        )
    
    name = "PM Execution"
    name_plural = "PM Executions"
    icon = "fa-solid fa-play-circle"

class IssueAdmin(ModelView, model=Issue):
    column_list = [
        Issue.id, Issue.title, "machine_name", "reporter_name", "assignee_name",
        Issue.priority, Issue.status, Issue.reported_at
    ]
    form_columns = [
        Issue.machine_id, Issue.room_id, Issue.reported_by_id, Issue.assigned_to_id,
        Issue.title, Issue.description, Issue.priority, Issue.status
    ]
    column_searchable_list = [Issue.title, Issue.description]
    column_sortable_list = [Issue.id, Issue.title, Issue.priority, Issue.status, Issue.reported_at]
    column_filters = [Issue.machine_id, Issue.reported_by_id, Issue.assigned_to_id, Issue.priority, Issue.status]
    
    column_formatters = {
        'machine_name': lambda m, a: safe_get_relationship_name(m, 'machine'),
        'reporter_name': lambda m, a: safe_get_user_full_name(m, 'reporter'),
        'assignee_name': lambda m, a: safe_get_user_full_name(m, 'assignee'),
        'priority': lambda m, a: format_enum_badge(m, 'priority'),
        'status': lambda m, a: format_enum_badge(m, 'status'),
        'reported_at': lambda m, a: format_datetime(m, 'reported_at'),
        'resolved_at': lambda m, a: format_datetime(m, 'resolved_at'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(Issue.machine).selectinload(Machine.room).selectinload(Room.property),
            selectinload(Issue.reporter),
            selectinload(Issue.assignee),
            selectinload(Issue.room)
        )
    
    name = "Issue"
    name_plural = "Issues"
    icon = "fa-solid fa-exclamation-triangle"

class InspectionAdmin(ModelView, model=Inspection):
    column_list = [
        Inspection.id, Inspection.title, "machine_name", "inspector_name",
        Inspection.result, Inspection.inspection_date
    ]
    form_columns = [
        Inspection.machine_id, Inspection.inspector_id, Inspection.procedure_id,
        Inspection.title, Inspection.findings, Inspection.result, Inspection.inspection_date
    ]
    column_searchable_list = [Inspection.title, Inspection.findings]
    column_sortable_list = [Inspection.id, Inspection.title, Inspection.result, Inspection.inspection_date]
    column_filters = [Inspection.machine_id, Inspection.inspector_id, Inspection.procedure_id, Inspection.result]
    
    column_formatters = {
        'machine_name': lambda m, a: safe_get_relationship_name(m, 'machine'),
        'inspector_name': lambda m, a: safe_get_user_full_name(m, 'inspector'),
        'result': lambda m, a: format_enum_badge(m, 'result'),
        'inspection_date': lambda m, a: format_datetime(m, 'inspection_date'),
        'created_at': lambda m, a: format_datetime(m, 'created_at'),
        'updated_at': lambda m, a: format_datetime(m, 'updated_at'),
    }
    
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(Inspection.machine).selectinload(Machine.room).selectinload(Room.property),
            selectinload(Inspection.inspector),
            selectinload(Inspection.procedure)
        )
    
    name = "Inspection"
    name_plural = "Inspections"
    icon = "fa-solid fa-search"

class PMFileAdmin(ModelView, model=PMFile):
    column_list = [
        PMFile.id, PMFile.file_name, PMFile.file_type, PMFile.image_type,
        "related_to", "file_preview", PMFile.uploaded_at
    ]
    form_columns = [
        PMFile.pm_execution_id, PMFile.issue_id, PMFile.inspection_id,
        PMFile.file_name, PMFile.file_path, PMFile.file_type, PMFile.image_type,
        PMFile.description
    ]
    column_searchable_list = [PMFile.file_name, PMFile.description]
    column_sortable_list = [PMFile.id, PMFile.file_name, PMFile.file_type, PMFile.uploaded_at]
    column_filters = [PMFile.pm_execution_id, PMFile.issue_id, PMFile.inspection_id, PMFile.file_type, PMFile.image_type]
    
    column_formatters = {
        'image_type': lambda m, a: format_enum_badge(m, 'image_type') if m.image_type else 'N/A',
        'related_to': lambda m, a: (
            f"PM Execution #{m.pm_execution_id}" if m.pm_execution_id else
            f"Issue #{m.issue_id}" if m.issue_id else
            f"Inspection #{m.inspection_id}" if m.inspection_id else
            "Unknown"
        ),
        'file_preview': lambda m, a: (
            format_image_preview(m, 'file_path') if m.file_type and m.file_type.startswith('image/') 
            else format_file_link(m, 'file_path')
        ),
        'uploaded_at': lambda m, a: format_datetime(m, 'uploaded_at'),
    }
    
    name = "PM File"
    name_plural = "PM Files"
    icon = "fa-solid fa-file"

class UserPropertyAccessAdmin(ModelView, model=UserPropertyAccess):
    column_list = [
        "user_name", "property_name", UserPropertyAccess.access_level,
        UserPropertyAccess.granted_at, UserPropertyAccess.expires_at
    ]
    form_columns = [
        UserPropertyAccess.user_id, UserPropertyAccess.property_id,
        UserPropertyAccess.access_level, UserPropertyAccess.expires_at
    ]
    column_searchable_list = []
    column_sortable_list = [UserPropertyAccess.access_level, UserPropertyAccess.granted_at, UserPropertyAccess.expires_at]
    column_filters = [UserPropertyAccess.user_id, UserPropertyAccess.property_id, UserPropertyAccess.access_level]
    
    column_formatters = {
        'user_name': lambda m, a: safe_get_user_full_name(m, 'user'),
        'property_name': lambda m, a: safe_get_relationship_name(m, 'property'),
        'access_level': lambda m, a: format_enum_badge(m, 'access_level'),
        'granted_at': lambda m, a: format_datetime(m, 'granted_at'),
        'expires_at': lambda m, a: format_datetime(m, 'expires_at') if m.expires_at else 'Never',
    }
    
    def get_query(self, request):
        return super().get_query(request).options(
            selectinload(UserPropertyAccess.user),
            selectinload(UserPropertyAccess.property)
        )
    
    name = "User Property Access"
    name_plural = "User Property Accesses"  # Fixed: Correct plural form
    icon = "fa-solid fa-key"
