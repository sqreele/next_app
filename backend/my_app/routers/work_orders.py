# ==============================================================================
# File: my_app/admin.py (Fixed UI Select for Properties)
# Description: SQLAdmin configuration with proper relationship fields.
# ==============================================================================
from sqladmin import ModelView
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile
from markupsafe import Markup

class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.username, User.email, User.is_active]
    column_details_exclude_list = [User.hashed_password]
    column_searchable_list = [User.username, User.email]
    column_sortable_list = [User.id, User.username, User.email, User.is_active]

    form_columns = [
        User.username,
        User.email,
        User.is_active,
    ]

    form_args = {
        'username': {
            'label': 'Username',
            'description': 'Enter a unique username'
        },
        'email': {
            'label': 'Email Address',
            'description': 'Enter a valid email address'
        },
        'is_active': {
            'label': 'Active User',
            'description': 'Check if user is active'
        },
    }

    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"

class UserProfileAdmin(ModelView, model=UserProfile):
    column_list = [
        UserProfile.id,
        UserProfile.user_id,
        UserProfile.role,
        UserProfile.position,
    ]
    form_columns = [UserProfile.user, UserProfile.role, UserProfile.position]  # Changed from user_id to user
    column_searchable_list = [UserProfile.role, UserProfile.position]
    column_sortable_list = [UserProfile.id, UserProfile.role, UserProfile.position]

    form_args = {
        'user': {  # Changed from user_id to user
            'label': 'User (Required)',
            'description': 'Select the user for this profile'
        },
        'role': {
            'label': 'Role',
            'description': 'Enter the user role (e.g., Technician, Manager)'
        },
        'position': {
            'label': 'Position',
            'description': 'Enter the user position (optional)'
        },
    }

    name = "User Profile"
    name_plural = "User Profiles"
    icon = "fa-solid fa-id-card"

class PropertyAdmin(ModelView, model=Property):
    column_list = [Property.id, Property.name]
    form_columns = [Property.name]
    column_searchable_list = [Property.name]
    column_sortable_list = [Property.id, Property.name]

    form_args = {
        'name': {
            'label': 'Property Name',
            'description': 'Enter a unique property name'
        }
    }

    name = "Property"
    name_plural = "Properties"
    icon = "fa-solid fa-building"

class RoomAdmin(ModelView, model=Room):
    column_list = [
        Room.id,
        Room.name,
        Room.number,
        Room.room_type,
        Room.is_active,
        Room.property_id,
    ]
    form_columns = [
        Room.property,  # Changed from property_id to property
        Room.name,
        Room.number,
        Room.room_type,
        Room.is_active,
    ]
    column_searchable_list = [Room.name, Room.number, Room.room_type]
    column_sortable_list = [
        Room.id,
        Room.name,
        Room.number,
        Room.room_type,
        Room.is_active,
    ]

    form_args = {
        'property': {  # Changed from property_id to property
            'label': 'Property (Required)',
            'description': 'Select the property this room belongs to'
        },
        'name': {
            'label': 'Room Name',
            'description': 'Enter the room name'
        },
        'number': {
            'label': 'Room Number',
            'description': 'Enter the room number (optional)'
        },
        'room_type': {
            'label': 'Room Type',
            'description': 'Enter the room type (e.g., Standard, Suite, etc.)'
        },
        'is_active': {
            'label': 'Active Room',
            'description': 'Check if room is active and available'
        },
    }

    name = "Room"
    name_plural = "Rooms"
    icon = "fa-solid fa-door-open"

class MachineAdmin(ModelView, model=Machine):
    column_list = [Machine.id, Machine.name, Machine.status, "property.name", "room.name"]
    form_columns = [
        Machine.property,  # This is already correct
        Machine.name,
        Machine.status,
        Machine.room,  # This is already correct
    ]
    column_searchable_list = [Machine.name, Machine.status]
    column_sortable_list = [Machine.id, Machine.name, Machine.status]

    form_args = {
        'property': {  # This is already correct
            'label': 'Property (Required)',
            'description': 'Select the property this machine belongs to'
        },
        'name': {
            'label': 'Machine Name',
            'description': 'Enter the machine name (e.g., Lift No1, AC Unit)'
        },
        'status': {
            'label': 'Machine Status',
            'description': 'Current status of the machine'
        },
        'room': {  # This is already correct
            'label': 'Room (Optional)',
            'description': 'Select a room if the machine is located in a specific room'
        },
    }

    name = "Machine"
    name_plural = "Machines"
    icon = "fa-solid fa-robot"

# Helper function for image formatting
def format_image_preview(model, attribute):
    image_path = getattr(model, attribute, None)
    if image_path and image_path.strip():
        # Construct URL for the image
        url = f"/uploads/{image_path.lstrip('/')}"
        return Markup(f'<a href="{url}" target="_blank"><img src="{url}" width="100"></a>')
    return Markup('<span style="color: #ccc; font-size: 12px;">No Image</span>')

class WorkOrderAdmin(ModelView, model=WorkOrder):
    column_list = [
        WorkOrder.id,
        WorkOrder.task,
        WorkOrder.status,
        WorkOrder.priority,
        WorkOrder.due_date,
        "property.name",  # Show property name instead of ID
        "machine.name",   # Show machine name instead of ID
        "room.name",      # Show room name instead of ID
        "assigned_to.username",  # Show username instead of ID
        'before_image_path',
        'after_image_path',
        WorkOrder.pdf_file_path,
    ]
    
    form_columns = [
        WorkOrder.property,        # Changed from property_id to property
        WorkOrder.task,
        WorkOrder.description,
        WorkOrder.status,
        WorkOrder.priority,
        WorkOrder.due_date,
        WorkOrder.machine,         # Changed from machine_id to machine
        WorkOrder.room,            # Changed from room_id to room
        WorkOrder.assigned_to,     # Changed from assigned_to_id to assigned_to
        WorkOrder.before_image_path,
        WorkOrder.after_image_path,
        WorkOrder.pdf_file_path,
    ]
    
    column_searchable_list = [
        WorkOrder.task,
        WorkOrder.description,
        WorkOrder.status,
        WorkOrder.priority,
    ]
    
    column_sortable_list = [
        WorkOrder.id,
        WorkOrder.task,
        WorkOrder.status,
        WorkOrder.priority,
        WorkOrder.due_date,
        WorkOrder.created_at,
    ]

    column_labels = {
        "before_image_path": "Before Image",
        "after_image_path": "After Image",
        "property.name": "Property",
        "machine.name": "Machine",
        "room.name": "Room",
        "assigned_to.username": "Assigned To",
    }

    column_formatters = {
        'before_image_path': lambda m, a: format_image_preview(m, 'before_image_path'),
        'after_image_path': lambda m, a: format_image_preview(m, 'after_image_path'),
    }

    form_args = {
        'property': {  # Changed from property_id to property
            'label': 'Property (Required)',
            'description': 'Select the property for this work order'
        },
        'task': {
            'label': 'Task Title',
            'description': 'Enter a brief title for the task'
        },
        'description': {
            'label': 'Task Description',
            'description': 'Enter detailed description of the work to be done'
        },
        'status': {
            'label': 'Status',
            'description': 'Current status of the work order',
            'default': 'Pending'
        },
        'priority': {
            'label': 'Priority Level',
            'description': 'Set the priority level for this task',
            'default': 'Medium'
        },
        'due_date': {
            'label': 'Due Date',
            'description': 'When should this task be completed? (optional)'
        },
        'machine': {  # Changed from machine_id to machine
            'label': 'Machine (Optional)',
            'description': 'Select a machine if this work order is machine-specific'
        },
        'room': {  # Changed from room_id to room
            'label': 'Room (Optional)',
            'description': 'Select a room if this work order is room-specific'
        },
        'assigned_to': {  # Changed from assigned_to_id to assigned_to
            'label': 'Assigned To (Optional)',
            'description': 'Assign this work order to a specific user'
        },
        'before_image_path': {
            'label': 'Before Image Path',
            'description': 'File path from upload (e.g., before/filename.jpg)',
            'render_kw': {'placeholder': 'before/82d41b87-fb32-4bfb-90f9-7876c277326e.jpg'}
        },
        'after_image_path': {
            'label': 'After Image Path', 
            'description': 'File path from upload (e.g., after/filename.jpg)',
            'render_kw': {'placeholder': 'after/82d41b87-fb32-4bfb-90f9-7876c277326e.jpg'}
        },
        'pdf_file_path': {
            'label': 'PDF File Path',
            'description': 'Path to the PDF or document (optional)'
        },
    }

    name = "Work Order"
    name_plural = "Work Orders"
    icon = "fa-solid fa-list-check"

class WorkOrderFileAdmin(ModelView, model=WorkOrderFile):
    column_list = [
        WorkOrderFile.id,
        WorkOrderFile.file_path,
        WorkOrderFile.file_name,
        WorkOrderFile.file_size,
        WorkOrderFile.mime_type,
        WorkOrderFile.upload_type,
        WorkOrderFile.uploaded_at,
        "work_order.task",  # Show work order task instead of ID
    ]
    
    form_columns = [
        WorkOrderFile.work_order,  # Changed from work_order_id to work_order
        WorkOrderFile.file_path,
        WorkOrderFile.file_name,
        WorkOrderFile.file_size,
        WorkOrderFile.mime_type,
        WorkOrderFile.upload_type,
        WorkOrderFile.uploaded_at,
    ]
    
    column_searchable_list = [WorkOrderFile.file_path, WorkOrderFile.upload_type]
    column_sortable_list = [
        WorkOrderFile.id,
        WorkOrderFile.file_path,
        WorkOrderFile.upload_type,
    ]

    column_labels = {
        "work_order.task": "Work Order",
    }

    form_args = {
        'work_order': {  # Changed from work_order_id to work_order
            'label': 'Work Order (Required)',
            'description': 'Select the work order this file belongs to'
        },
        'file_path': {
            'label': 'File Path',
            'description': 'Enter the path to the uploaded file'
        },
        'upload_type': {
            'label': 'File Type',
            'description': 'Specify the type of file (e.g., Image, Document, etc.)',
            'default': 'Other'
        },
        'file_name': {
            'label': 'File Name',
            'description': 'Original file name (optional)'
        },
        'file_size': {
            'label': 'File Size',
            'description': 'File size in bytes (optional)'
        },
        'mime_type': {
            'label': 'MIME Type',
            'description': 'MIME type of the file (optional)'
        },
        'uploaded_at': {
            'label': 'Uploaded At',
            'description': 'Upload timestamp (optional)'
        },
    }

    name = "Work Order File"
    name_plural = "Work Order Files"
    icon = "fa-solid fa-file"
