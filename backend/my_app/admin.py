# ==============================================================================
# File: my_app/admin.py (Corrected)
# Description: SQLAdmin configuration for the admin panel.
# ==============================================================================
from sqladmin import ModelView
from wtforms import PasswordField
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile

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

    async def scaffold_form_class(self):
        form_class = await super().scaffold_form_class()
        # Add password field to the form
        form_class.password = PasswordField("Password", description="Leave blank to keep current password")
        return form_class

    async def on_model_change(self, request, form, model, is_created):
        from .security import get_password_hash
        # Only update password if it's provided and not empty
        if hasattr(form, 'password') and form.password and form.password.data:
            model.hashed_password = get_password_hash(form.password.data)

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

# The rest of your admin classes remain the same...
class UserProfileAdmin(ModelView, model=UserProfile):
    column_list = [
        UserProfile.id,
        UserProfile.user_id,
        UserProfile.role,
        UserProfile.position,
    ]
    form_columns = [UserProfile.user_id, UserProfile.role, UserProfile.position]
    column_searchable_list = [UserProfile.role, UserProfile.position]
    column_sortable_list = [UserProfile.id, UserProfile.role, UserProfile.position]

    form_args = {
        'user_id': {
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
        Room.property_id,
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
        'property_id': {
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
        Machine.property,
        Machine.name,
        Machine.status,
        Machine.room,
    ]
    column_searchable_list = [Machine.name, Machine.status]
    column_sortable_list = [Machine.id, Machine.name, Machine.status]

    form_args = {
        'property': {
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
        'room': {
            'label': 'Room (Optional)',
            'description': 'Select a room if the machine is located in a specific room'
        },
    }

    name = "Machine"
    name_plural = "Machines"
    icon = "fa-solid fa-robot"

class WorkOrderAdmin(ModelView, model=WorkOrder):
    column_list = [
        WorkOrder.id,
        WorkOrder.task,
        WorkOrder.status,
        WorkOrder.priority,
        WorkOrder.due_date,
        WorkOrder.property_id,
        WorkOrder.machine_id,
        WorkOrder.room_id,
        WorkOrder.assigned_to_id,
    ]
    form_columns = [
        WorkOrder.property_id,
        WorkOrder.task,
        WorkOrder.description,
        WorkOrder.status,
        WorkOrder.priority,
        WorkOrder.due_date,
        WorkOrder.machine_id,
        WorkOrder.room_id,
        WorkOrder.assigned_to_id,
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

    form_args = {
        'property_id': {
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
        'machine_id': {
            'label': 'Machine (Optional)',
            'description': 'Select a machine if this work order is machine-specific'
        },
        'room_id': {
            'label': 'Room (Optional)',
            'description': 'Select a room if this work order is room-specific'
        },
        'assigned_to_id': {
            'label': 'Assigned To (Optional)',
            'description': 'Assign this work order to a specific user'
        },
    }

    name = "Work Order"
    name_plural = "Work Orders"
    icon = "fa-solid fa-list-check"

class WorkOrderFileAdmin(ModelView, model=WorkOrderFile):
    column_list = [
        WorkOrderFile.id,
        WorkOrderFile.file_path,
        WorkOrderFile.upload_type,
        WorkOrderFile.work_order_id,
    ]
    form_columns = [
        WorkOrderFile.work_order_id,
        WorkOrderFile.file_path,
        WorkOrderFile.upload_type,
    ]
    column_searchable_list = [WorkOrderFile.file_path, WorkOrderFile.upload_type]
    column_sortable_list = [
        WorkOrderFile.id,
        WorkOrderFile.file_path,
        WorkOrderFile.upload_type,
    ]

    form_args = {
        'work_order_id': {
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
    }

    name = "Work Order File"
    name_plural = "Work Order Files"
    icon = "fa-solid fa-file"
