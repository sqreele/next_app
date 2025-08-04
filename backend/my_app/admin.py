from sqladmin import ModelView
from markupsafe import Markup
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.orm.exc import DetachedInstanceError
from datetime import datetime, timedelta
import pytz
import logging
from contextlib import asynccontextmanager
from typing import Any
from database import get_db
from models import (
    User, Property, Room, Machine, Topic, Procedure, PMSchedule, PMExecution,
    Issue, Inspection, PMFile, UserPropertyAccess, Job, JobStatus,
    UserRole, FrequencyType, PMStatus, IssueStatus, IssuePriority,
    InspectionResult, ImageType, AccessLevel, machine_procedure_association
)

@asynccontextmanager
async def get_db_context():
    """Context manager for database sessions in admin"""
    db = None
    try:
        db = await get_db().__anext__()
        yield db
    finally:
        if db:
            await db.close()

# Set up logging for debugging
logger = logging.getLogger(__name__)

# Helper functions for safe data access and formatting
def safe_get_attr(obj, attr, default="N/A"):
    """Safely get attribute from object."""
    try:
        if obj is None:
            return default
        value = getattr(obj, attr, default)
        return value if value is not None else default
    except (DetachedInstanceError, AttributeError) as e:
        logger.error(f"Error in safe_get_attr for {attr}: {str(e)}")
        return default
    except Exception as e:
        logger.error(f"Unexpected error in safe_get_attr for {attr}: {str(e)}")
        return default

def safe_get_relationship_name(obj, relationship_attr, name_attr="name", default="Unknown"):
    """Safely get name from related object."""
    try:
        if obj is None:
            return default
        related_obj = getattr(obj, relationship_attr, None)
        if related_obj:
            # Try different name attributes
            for attr in [name_attr, 'title', 'username', 'first_name']:
                if hasattr(related_obj, attr):
                    value = getattr(related_obj, attr)
                    if value:
                        return value
            return str(related_obj.id) if hasattr(related_obj, 'id') else default
        return default
    except (DetachedInstanceError, AttributeError) as e:
        logger.error(f"Error in safe_get_relationship_name for {relationship_attr}: {str(e)}")
        return default
    except Exception as e:
        logger.error(f"Unexpected error in safe_get_relationship_name for {relationship_attr}: {str(e)}")
        return default

def safe_get_user_full_name(obj, relationship_attr, default="Unknown"):
    """Safely get user's full name."""
    try:
        if obj is None:
            return default
        user = getattr(obj, relationship_attr, None)
        if user:
            if hasattr(user, 'first_name') and hasattr(user, 'last_name'):
                first = getattr(user, 'first_name', '')
                last = getattr(user, 'last_name', '')
                full_name = f"{first} {last}".strip()
                if full_name:
                    return full_name
            if hasattr(user, 'username'):
                username = getattr(user, 'username', '')
                if username:
                    return username
            return str(user.id) if hasattr(user, 'id') else default
        return default
    except (DetachedInstanceError, AttributeError) as e:
        logger.error(f"Error in safe_get_user_full_name for {relationship_attr}: {str(e)}")
        return default
    except Exception as e:
        logger.error(f"Unexpected error in safe_get_user_full_name for {relationship_attr}: {str(e)}")
        return default

def format_enum_badge(model, attribute, color_map=None):
    """Format enum value as colored badge."""
    try:
        if model is None:
            return Markup('<span class="badge badge-secondary">N/A</span>')
        
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
        logger.error(f"Error in format_enum_badge for {attribute}: {str(e)}")
        return Markup('<span class="badge badge-danger">Error</span>')

def format_image_preview(model, attribute):
    """Format image path as preview."""
    try:
        if model is None:
            return Markup('<span style="color: #999; font-size: 12px;">No Model</span>')
        
        image_path = getattr(model, attribute, None)
        if image_path and isinstance(image_path, str) and image_path.strip():
            clean_path = image_path.strip('/')
            url = f"/uploads/{clean_path}"
            return Markup(f'''
                <a href="{url}" target="_blank">
                    <img src="{url}" width="60" height="45" 
                         style="object-fit: cover; border-radius: 4px;" 
                         alt="Preview" loading="lazy"
                         onerror="this.style.display='none'; this.nextSibling.style.display='inline';">
                    <span style="display:none; color: #999; font-size: 12px;">Image Error</span>
                </a>
            ''')
        return Markup('<span style="color: #999; font-size: 12px;">No Image</span>')
    except Exception as e:
        logger.error(f"Error in format_image_preview for {attribute}: {str(e)}")
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_file_link(model, attribute):
    """Format file path as download link."""
    try:
        if model is None:
            return Markup('<span style="color: #999; font-size: 12px;">No Model</span>')
        
        file_path = getattr(model, attribute, None)
        if file_path and isinstance(file_path, str) and file_path.strip():
            clean_path = file_path.strip('/')
            url = f"/uploads/{clean_path}"
            file_name = getattr(model, 'file_name', 'Download')
            return Markup(f'<a href="{url}" target="_blank" class="btn btn-sm btn-outline-primary">📄 {file_name}</a>')
        return Markup('<span style="color: #999; font-size: 12px;">No File</span>')
    except Exception as e:
        logger.error(f"Error in format_file_link for {attribute}: {str(e)}")
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_datetime(model, attribute):
    """Format datetime for display with timezone."""
    try:
        if model is None:
            return "No Model"
        
        dt = getattr(model, attribute, None)
        if dt and isinstance(dt, datetime):
            if dt.tzinfo is None:  # Make naive datetime timezone-aware
                dt = pytz.utc.localize(dt)
            return dt.strftime("%Y-%m-%d %H:%M %Z")
        return "N/A"
    except Exception as e:
        logger.error(f"Error in format_datetime for {attribute}: {str(e)}")
        return "Error"

def format_overdue_status(model, attribute):
    """Format overdue status with color coding."""
    try:
        if model is None:
            return "No Model"
        
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
        logger.error(f"Error in format_overdue_status for {attribute}: {str(e)}")
        return "Error"

def format_many_to_many_count(model, relationship_attr, item_name="items"):
    """Format many-to-many relationship count."""
    try:
        if model is None:
            return "No Model"
        
        related_items = getattr(model, relationship_attr, None)
        if related_items is not None:
            count = len(related_items) if hasattr(related_items, '__len__') else 0
            if count == 0:
                return f"No {item_name}"
            elif count == 1:
                return f"1 {item_name[:-1] if item_name.endswith('s') else item_name}"
            else:
                return f"{count} {item_name}"
        return f"No {item_name}"
    except Exception as e:
        logger.error(f"Error in format_many_to_many_count for {relationship_attr}: {str(e)}")
        return "Error"

def format_many_to_many_list(model, relationship_attr, display_attr="name", badge_class="info", max_items=10):
    """Format many-to-many relationship as a list of badges."""
    try:
        if model is None:
            return Markup('<span style="color: #999; font-size: 12px;">No Model</span>')
        
        related_items = getattr(model, relationship_attr, None)
        if related_items and hasattr(related_items, '__iter__'):
            items_list = list(related_items)
            if not items_list:
                return Markup('<span style="color: #999; font-size: 12px;">None assigned</span>')
            
            # Limit the number of items displayed
            display_items = items_list[:max_items]
            badges = []
            
            for item in display_items:
                # Try different display attributes
                display_value = None
                for attr in [display_attr, 'title', 'name', 'username']:
                    if hasattr(item, attr):
                        value = getattr(item, attr, None)
                        if value:
                            display_value = str(value)
                            break
                
                if not display_value and hasattr(item, 'id'):
                    display_value = f"ID: {item.id}"
                elif not display_value:
                    display_value = "Unknown"
                
                badges.append(f'<span class="badge badge-{badge_class} mr-1 mb-1">{display_value}</span>')
            
            result = ''.join(badges)
            
            # Add "and X more" if there are more items
            if len(items_list) > max_items:
                remaining = len(items_list) - max_items
                result += f'<span class="badge badge-secondary mr-1 mb-1">+{remaining} more</span>'
            
            return Markup(result)
        
        return Markup('<span style="color: #999; font-size: 12px;">None assigned</span>')
    except Exception as e:
        logger.error(f"Error in format_many_to_many_list for {relationship_attr}: {str(e)}")
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_machine_procedures_detailed(model, attribute):
    """Detailed formatter for machine procedures with additional info."""
    try:
        if model is None:
            return Markup('<span style="color: #999; font-size: 12px;">No Model</span>')
        
        procedures = getattr(model, 'procedures', None)
        if procedures and hasattr(procedures, '__iter__'):
            procedures_list = list(procedures)
            if not procedures_list:
                return Markup('<span style="color: #999; font-size: 12px;">No procedures assigned</span>')
            
            items = []
            for proc in procedures_list[:5]:  # Show max 5 procedures
                title = getattr(proc, 'title', 'Unknown')
                topic_name = safe_get_relationship_name(proc, 'topic', 'title', 'No Topic')
                estimated_time = getattr(proc, 'estimated_minutes', None)
                time_text = f" ({estimated_time}min)" if estimated_time else ""
                
                items.append(f'''
                    <div class="mb-1">
                        <span class="badge badge-info">{title}</span>
                        <small class="text-muted"> - {topic_name}{time_text}</small>
                    </div>
                ''')
            
            result = ''.join(items)
            
            if len(procedures_list) > 5:
                remaining = len(procedures_list) - 5
                result += f'<small class="text-muted">...and {remaining} more procedures</small>'
            
            return Markup(result)
        
        return Markup('<span style="color: #999; font-size: 12px;">No procedures assigned</span>')
    except Exception as e:
        logger.error(f"Error in format_machine_procedures_detailed: {str(e)}")
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_procedure_machines_detailed(model, attribute):
    """Detailed formatter for procedure machines with additional info."""
    try:
        if model is None:
            return Markup('<span style="color: #999; font-size: 12px;">No Model</span>')
        
        machines = getattr(model, 'machines', None)
        if machines and hasattr(machines, '__iter__'):
            machines_list = list(machines)
            if not machines_list:
                return Markup('<span style="color: #999; font-size: 12px;">No machines assigned</span>')
            
            items = []
            for machine in machines_list[:5]:  # Show max 5 machines
                name = getattr(machine, 'name', 'Unknown')
                model_name = getattr(machine, 'model', '')
                room_name = safe_get_relationship_name(machine, 'room', 'name', 'Unknown Room')
                
                display_text = f"{name}"
                if model_name:
                    display_text += f" ({model_name})"
                
                items.append(f'''
                    <div class="mb-1">
                        <span class="badge badge-primary">{display_text}</span>
                        <small class="text-muted"> - {room_name}</small>
                    </div>
                ''')
            
            result = ''.join(items)
            
            if len(machines_list) > 5:
                remaining = len(machines_list) - 5
                result += f'<small class="text-muted">...and {remaining} more machines</small>'
            
            return Markup(result)
        
        return Markup('<span style="color: #999; font-size: 12px;">No machines assigned</span>')
    except Exception as e:
        logger.error(f"Error in format_procedure_machines_detailed: {str(e)}")
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_user_property_access_detailed(model, attribute):
    """Detailed formatter for user property access with additional info."""
    try:
        if model is None:
            return Markup('<span style="color: #999; font-size: 12px;">No Model</span>')
        
        access_list = getattr(model, 'property_access', None)
        if access_list and hasattr(access_list, '__iter__'):
            items = []
            for access in access_list[:5]:  # Show max 5 access details
                property_name = safe_get_relationship_name(access, 'property')
                access_level = format_enum_badge(access, 'access_level')
                granted_at = format_datetime(access, 'granted_at')
                expires_at = format_datetime(access, 'expires_at') if getattr(access, 'expires_at', None) else 'Never'
                
                items.append(f'''
                    <div class="mb-1">
                        <span class="badge badge-info">{property_name}</span>
                        <small class="text-muted"> - {access_level} (Granted: {granted_at}, Expires: {expires_at})</small>
                    </div>
                ''')
            
            result = ''.join(items)
            
            if len(access_list) > 5:
                remaining = len(access_list) - 5
                result += f'<small class="text-muted">...and {remaining} more</small>'
            
            return Markup(result)
        
        return Markup('<span style="color: #999; font-size: 12px;">No property access details</span>')
    except Exception as e:
        logger.error(f"Error in format_user_property_access_detailed: {str(e)}")
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

def format_property_user_access_detailed(model, attribute):
    """Detailed formatter for property user access with additional info."""
    try:
        if model is None:
            return Markup('<span style="color: #999; font-size: 12px;">No Model</span>')
        
        access_list = getattr(model, 'user_access', None)
        if access_list and hasattr(access_list, '__iter__'):
            items = []
            for access in access_list[:5]:  # Show max 5 access details
                user_name = safe_get_user_full_name(access, 'user')
                access_level = format_enum_badge(access, 'access_level')
                granted_at = format_datetime(access, 'granted_at')
                expires_at = format_datetime(access, 'expires_at') if getattr(access, 'expires_at', None) else 'Never'
                
                items.append(f'''
                    <div class="mb-1">
                        <span class="badge badge-success">{user_name}</span>
                        <small class="text-muted"> - {access_level} (Granted: {granted_at}, Expires: {expires_at})</small>
                    </div>
                ''')
            
            result = ''.join(items)
            
            if len(access_list) > 5:
                remaining = len(access_list) - 5
                result += f'<small class="text-muted">...and {remaining} more</small>'
            
            return Markup(result)
        
        return Markup('<span style="color: #999; font-size: 12px;">No user access details</span>')
    except Exception as e:
        logger.error(f"Error in format_property_user_access_detailed: {str(e)}")
        return Markup('<span style="color: #999; font-size: 12px;">Error</span>')

# Safe formatter wrapper
def safe_formatter(formatter_func):
    """Wrapper to make formatters safe from exceptions."""
    def wrapper(model, attribute):
        try:
            return formatter_func(model, attribute)
        except Exception as e:
            logger.error(f"Formatter error: {e}")
            return "Error"
    return wrapper

# Admin Model Views with improved error handling
class UserAdmin(ModelView, model=User):
    column_list = [
        User.id, User.username, User.first_name, User.last_name,
        User.email, User.role, "property_access_count", User.is_active, User.created_at
    ]
    column_details_list = [
        User.id, User.username, User.first_name, User.last_name,
        User.email, User.phone, User.role, "property_access_list", 
        User.is_active, User.created_at, User.updated_at
    ]
    form_columns = [
        User.username, User.email, User.first_name, User.last_name,
        User.phone, User.role, User.is_active
    ]
    column_searchable_list = [User.username, User.email, User.first_name, User.last_name]
    column_sortable_list = [User.id, User.username, User.first_name, User.last_name, User.role, User.created_at]
    column_filters = [User.role, User.is_active]
    
    column_formatters = {
        'role': safe_formatter(lambda m, a: format_enum_badge(m, 'role')),
        'property_access_count': safe_formatter(lambda m, a: format_many_to_many_count(m, 'property_access', 'properties')),
        'property_access_list': safe_formatter(lambda m, a: format_user_property_access_detailed(m, 'property_access')),
        'is_active': safe_formatter(lambda m, a: Markup('<span class="badge badge-success">Active</span>' if getattr(m, 'is_active', False) else '<span class="badge badge-secondary">Inactive</span>')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            selectinload(User.property_access).joinedload(UserPropertyAccess.property)
        )
    
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"

class PropertyAdmin(ModelView, model=Property):
    column_list = [Property.id, Property.name, Property.address, "user_access_count", Property.is_active, Property.created_at]
    column_details_list = [
        Property.id, Property.name, Property.address, "user_access_list",
        Property.is_active, Property.created_at, Property.updated_at
    ]
    form_columns = [Property.name, Property.address, Property.is_active]
    column_searchable_list = [Property.name, Property.address]
    column_sortable_list = [Property.id, Property.name, Property.is_active, Property.created_at]
    column_filters = [Property.is_active]
    
    column_formatters = {
        'user_access_count': safe_formatter(lambda m, a: format_many_to_many_count(m, 'user_access', 'users')),
        'user_access_list': safe_formatter(lambda m, a: format_property_user_access_detailed(m, 'user_access')),
        'is_active': safe_formatter(lambda m, a: Markup('<span class="badge badge-success">Active</span>' if getattr(m, 'is_active', False) else '<span class="badge badge-secondary">Inactive</span>')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            selectinload(Property.user_access).joinedload(UserPropertyAccess.user)
        )
    
    name = "Property"
    name_plural = "Properties"
    icon = "fa-solid fa-building"

class RoomAdmin(ModelView, model=Room):
    column_list = [Room.id, Room.name, Room.room_number, "property_name", "machines_count", Room.is_active]
    column_details_list = [
        Room.id, Room.name, Room.room_number, "property_name", "machines_list",
        Room.is_active, Room.created_at, Room.updated_at
    ]
    form_columns = [Room.property_id, Room.name, Room.room_number, Room.is_active]
    column_searchable_list = [Room.name, Room.room_number]
    column_sortable_list = [Room.id, Room.name, Room.room_number, Room.is_active]
    column_filters = [Room.property_id, Room.is_active]
    
    column_formatters = {
        'property_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'property')),
        'machines_count': safe_formatter(lambda m, a: format_many_to_many_count(m, 'machines', 'machines')),
        'machines_list': safe_formatter(lambda m, a: format_many_to_many_list(m, 'machines', 'name', 'secondary', 8)),
        'is_active': safe_formatter(lambda m, a: Markup('<span class="badge badge-success">Active</span>' if getattr(m, 'is_active', False) else '<span class="badge badge-secondary">Inactive</span>')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(Room.property),
            selectinload(Room.machines)
        )
    
    name = "Room"
    name_plural = "Rooms"
    icon = "fa-solid fa-door-open"

class MachineAdmin(ModelView, model=Machine):
    column_list = [
        Machine.id, Machine.name, Machine.model, Machine.serial_number,
        "room_name", "property_name", "procedures_count", Machine.is_active
    ]
    column_details_list = [
        Machine.id, Machine.name, Machine.model, Machine.serial_number,
        Machine.description, "room_name", "property_name", "procedures_list", 
        Machine.is_active, Machine.created_at, Machine.updated_at
    ]
    form_columns = [
        Machine.room_id, Machine.name, Machine.model, Machine.serial_number,
        Machine.description, Machine.is_active
    ]
    column_searchable_list = [Machine.name, Machine.model, Machine.serial_number]
    column_sortable_list = [Machine.id, Machine.name, Machine.model, Machine.serial_number, Machine.is_active]
    column_filters = [Machine.room_id, Machine.is_active]
    
    async def insert_model(self, request, data: dict) -> Any:
        """Custom insert with validation"""
        # Validate room_id is provided and valid
        if not data.get('room_id'):
            raise ValueError("Room ID is required and cannot be empty")
        
        # Validate room exists
        from crud import room
        async with get_db_context() as db:
            existing_room = await room.get(db, data['room_id'])
            if not existing_room:
                raise ValueError(f"Room with ID {data['room_id']} does not exist")
        
        return await super().insert_model(request, data)
    
    column_formatters = {
        'room_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'room')),
        'property_name': safe_formatter(lambda m, a: safe_get_relationship_name(getattr(m, 'room', None), 'property') if hasattr(m, 'room') and m.room else 'N/A'),
        'procedures_count': safe_formatter(lambda m, a: format_many_to_many_count(m, 'procedures', 'procedures')),
        'procedures_list': safe_formatter(lambda m, a: format_machine_procedures_detailed(m, 'procedures')),
        'is_active': safe_formatter(lambda m, a: Markup('<span class="badge badge-success">Active</span>' if getattr(m, 'is_active', False) else '<span class="badge badge-secondary">Inactive</span>')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(Machine.room).joinedload(Room.property),
            selectinload(Machine.procedures)  # Load many-to-many relationship
        )
    
    name = "Machine"
    name_plural = "Machines"
    icon = "fa-solid fa-cogs"

class TopicAdmin(ModelView, model=Topic):
    column_list = [Topic.id, Topic.title, Topic.description, "procedures_count", Topic.is_active, Topic.created_at]
    column_details_list = [
        Topic.id, Topic.title, Topic.description, "procedures_list", 
        Topic.is_active, Topic.created_at, Topic.updated_at
    ]
    form_columns = [Topic.title, Topic.description, Topic.is_active]
    column_searchable_list = [Topic.title, Topic.description]
    column_sortable_list = [Topic.id, Topic.title, Topic.is_active, Topic.created_at]
    column_filters = [Topic.is_active]
    
    column_formatters = {
        'procedures_count': safe_formatter(lambda m, a: format_many_to_many_count(m, 'procedures', 'procedures')),
        'procedures_list': safe_formatter(lambda m, a: format_many_to_many_list(m, 'procedures', 'title', 'info', 6)),
        'is_active': safe_formatter(lambda m, a: Markup('<span class="badge badge-success">Active</span>' if getattr(m, 'is_active', False) else '<span class="badge badge-secondary">Inactive</span>')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            selectinload(Topic.procedures)
        )
    
    name = "Topic"
    name_plural = "Topics"
    icon = "fa-solid fa-tags"

class ProcedureAdmin(ModelView, model=Procedure):
    column_list = [
        Procedure.id, Procedure.title, "topic_name",
        Procedure.estimated_minutes, "machines_count", Procedure.is_active
    ]
    column_details_list = [
        Procedure.id, Procedure.title, "topic_name", Procedure.description,
        Procedure.instructions, Procedure.estimated_minutes, "machines_list",
        Procedure.is_active, Procedure.created_at, Procedure.updated_at
    ]
    form_columns = [
        Procedure.topic_id, Procedure.title, Procedure.description,
        Procedure.instructions, Procedure.estimated_minutes, Procedure.is_active
    ]
    column_searchable_list = [Procedure.title, Procedure.description]
    column_sortable_list = [Procedure.id, Procedure.title, Procedure.estimated_minutes, Procedure.is_active]
    column_filters = [Procedure.topic_id, Procedure.is_active]
    
    column_formatters = {
        'topic_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'topic', 'title')),
        'estimated_minutes': safe_formatter(lambda m, a: f"{m.estimated_minutes} min" if getattr(m, 'estimated_minutes', None) else "N/A"),
        'machines_count': safe_formatter(lambda m, a: format_many_to_many_count(m, 'machines', 'machines')),
        'machines_list': safe_formatter(lambda m, a: format_procedure_machines_detailed(m, 'machines')),
        'is_active': safe_formatter(lambda m, a: Markup('<span class="badge badge-success">Active</span>' if getattr(m, 'is_active', False) else '<span class="badge badge-secondary">Inactive</span>')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(Procedure.topic),
            selectinload(Procedure.machines)  # Load many-to-many relationship
        )
    
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
        'machine_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'machine')),
        'procedure_title': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'procedure', 'title')),
        'responsible_user_name': safe_formatter(lambda m, a: safe_get_user_full_name(m, 'responsible_user')),
        'frequency': safe_formatter(lambda m, a: format_enum_badge(m, 'frequency')),
        'next_due': safe_formatter(lambda m, a: format_datetime(m, 'next_due')),
        'due_status': safe_formatter(lambda m, a: format_overdue_status(m, 'next_due')),
        'is_active': safe_formatter(lambda m, a: Markup('<span class="badge badge-success">Active</span>' if getattr(m, 'is_active', False) else '<span class="badge badge-secondary">Inactive</span>')),
        'last_completed': safe_formatter(lambda m, a: format_datetime(m, 'last_completed')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(PMSchedule.machine).joinedload(Machine.room).joinedload(Room.property),
            joinedload(PMSchedule.procedure).joinedload(Procedure.topic),
            joinedload(PMSchedule.responsible_user)
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
        'schedule_info': safe_formatter(lambda m, a: (
            f"{safe_get_relationship_name(m.pm_schedule, 'machine')} - {safe_get_relationship_name(m.pm_schedule, 'procedure', 'title')}"
            if hasattr(m, 'pm_schedule') and m.pm_schedule else 'No Schedule'
        )),
        'executor_name': safe_formatter(lambda m, a: safe_get_user_full_name(m, 'executor')),
        'status': safe_formatter(lambda m, a: format_enum_badge(m, 'status')),
        'started_at': safe_formatter(lambda m, a: format_datetime(m, 'started_at')),
        'completed_at': safe_formatter(lambda m, a: format_datetime(m, 'completed_at')),
        'next_due_calculated': safe_formatter(lambda m, a: format_datetime(m, 'next_due_calculated')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(PMExecution.pm_schedule)
                .joinedload(PMSchedule.machine)
                .joinedload(Machine.room)
                .joinedload(Room.property),
            joinedload(PMExecution.pm_schedule).joinedload(PMSchedule.procedure),
            joinedload(PMExecution.executor)
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
        'machine_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'machine')),
        'reporter_name': safe_formatter(lambda m, a: safe_get_user_full_name(m, 'reporter')),
        'assignee_name': safe_formatter(lambda m, a: safe_get_user_full_name(m, 'assignee')),
        'priority': safe_formatter(lambda m, a: format_enum_badge(m, 'priority')),
        'status': safe_formatter(lambda m, a: format_enum_badge(m, 'status')),
        'reported_at': safe_formatter(lambda m, a: format_datetime(m, 'reported_at')),
        'resolved_at': safe_formatter(lambda m, a: format_datetime(m, 'resolved_at')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(Issue.machine).joinedload(Machine.room).joinedload(Room.property),
            joinedload(Issue.reporter),
            joinedload(Issue.assignee),
            joinedload(Issue.room)
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
        'machine_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'machine')),
        'inspector_name': safe_formatter(lambda m, a: safe_get_user_full_name(m, 'inspector')),
        'result': safe_formatter(lambda m, a: format_enum_badge(m, 'result')),
        'inspection_date': safe_formatter(lambda m, a: format_datetime(m, 'inspection_date')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(Inspection.machine).joinedload(Machine.room).joinedload(Room.property),
            joinedload(Inspection.inspector),
            joinedload(Inspection.procedure)
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
        'image_type': safe_formatter(lambda m, a: format_enum_badge(m, 'image_type') if getattr(m, 'image_type', None) else 'N/A'),
        'related_to': safe_formatter(lambda m, a: (
            f"PM Execution #{m.pm_execution_id}" if getattr(m, 'pm_execution_id', None) else
            f"Issue #{m.issue_id}" if getattr(m, 'issue_id', None) else
            f"Inspection #{m.inspection_id}" if getattr(m, 'inspection_id', None) else
            "Unknown"
        )),
        'file_preview': safe_formatter(lambda m, a: (
            format_image_preview(m, 'file_path') if getattr(m, 'file_type', None) and m.file_type.startswith('image/') 
            else format_file_link(m, 'file_path')
        )),
        'uploaded_at': safe_formatter(lambda m, a: format_datetime(m, 'uploaded_at')),
    }
    
    name = "PM File"
    name_plural = "PM Files"
    icon = "fa-solid fa-file"

# Create a helper class for Machine-Procedure Association management
class MachineProcedureAssociationView:
    """Helper view to display machine-procedure associations"""
    
    @staticmethod
    def get_machine_procedures_summary():
        """Get a summary of machine-procedure associations for display"""
        return "Machine-Procedure associations can be managed through the Machine or Procedure admin pages."

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
        'user_name': safe_formatter(lambda m, a: safe_get_user_full_name(m, 'user')),
        'property_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'property')),
        'access_level': safe_formatter(lambda m, a: format_enum_badge(m, 'access_level')),
        'granted_at': safe_formatter(lambda m, a: format_datetime(m, 'granted_at')),
        'expires_at': safe_formatter(lambda m, a: format_datetime(m, 'expires_at') if getattr(m, 'expires_at', None) else 'Never'),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(UserPropertyAccess.user),
            joinedload(UserPropertyAccess.property)
        )
    
    name = "User Property Access"
    name_plural = "User Property Accesses"  # Fixed: Correct plural form
    icon = "fa-solid fa-key"


class JobAdmin(ModelView, model=Job):
    column_list = [
        Job.id, Job.title, "user_name", "property_name", "topic_name",
        Job.status, Job.created_at, Job.completed_at
    ]
    column_details_list = [
        Job.id, Job.title, Job.description, "user_name", "property_name", 
        "topic_name", "room_name", Job.status, Job.notes, Job.before_image,
        Job.after_image, Job.export_data, Job.pdf_file_path, Job.started_at,
        Job.completed_at, Job.created_at, Job.updated_at
    ]
    form_columns = [
        Job.user_id, Job.property_id, Job.topic_id, Job.room_id,
        Job.title, Job.description, Job.status, Job.notes,
        Job.before_image, Job.after_image, Job.export_data, Job.pdf_file_path,
        Job.started_at, Job.completed_at
    ]
    column_searchable_list = [Job.title, Job.description, Job.notes]
    column_sortable_list = [Job.id, Job.title, Job.status, Job.created_at, Job.completed_at]
    column_filters = [Job.user_id, Job.property_id, Job.topic_id, Job.room_id, Job.status]
    
    column_formatters = {
        'user_name': safe_formatter(lambda m, a: safe_get_user_full_name(m, 'user')),
        'property_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'property')),
        'topic_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'topic', 'title')),
        'room_name': safe_formatter(lambda m, a: safe_get_relationship_name(m, 'room')),
        'status': safe_formatter(lambda m, a: format_enum_badge(m, 'status')),
        'before_image': safe_formatter(lambda m, a: format_image_preview(m, 'before_image')),
        'after_image': safe_formatter(lambda m, a: format_image_preview(m, 'after_image')),
        'started_at': safe_formatter(lambda m, a: format_datetime(m, 'started_at')),
        'completed_at': safe_formatter(lambda m, a: format_datetime(m, 'completed_at')),
        'created_at': safe_formatter(lambda m, a: format_datetime(m, 'created_at')),
        'updated_at': safe_formatter(lambda m, a: format_datetime(m, 'updated_at')),
    }
    
    def get_query(self, request):
        """Optimize query with proper joins."""
        return super().get_query(request).options(
            joinedload(Job.user),
            joinedload(Job.property),
            joinedload(Job.topic),
            joinedload(Job.room)
        )
    
    name = "Job"
    name_plural = "Jobs"
    icon = "fa-solid fa-briefcase"
