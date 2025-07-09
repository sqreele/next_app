# ==============================================================================
# File: my_app/admin.py (Updated with Image Previews)
# Description: SQLAdmin configuration for the admin panel.
# ==============================================================================
from sqladmin import ModelView
from wtforms import PasswordField
from wtforms.validators import Optional, DataRequired
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile
import os


class UserAdminFinal(ModelView, model=User):
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
        """Override to add custom password field"""
        form_class = await super().scaffold_form_class()
        
        # Add password field
        setattr(form_class, 'password', PasswordField(
            'Password',
            validators=[Optional()],
            description="Required for new users. Leave blank to keep current password when editing.",
            render_kw={"placeholder": "Enter password"}
        ))
        
        return form_class

    async def insert_model(self, request, data):
        """Handle creating new users with password"""
        from .security import get_password_hash
        
        # Extract password from form data
        password = data.get('password', '')
        if not password:
            raise ValueError("Password is required for new users")
        
        # Remove password from data dict to avoid conflict
        data_copy = dict(data)
        data_copy.pop('password', None)
        
        # Create the model instance
        model = self.model(**data_copy)
        model.hashed_password = get_password_hash(password)
        
        # Add to session and commit
        request.state.session.add(model)
        await request.state.session.commit()
        await request.state.session.refresh(model)
        return model

    async def update_model(self, request, pk, data):
        """Handle updating existing users with optional password"""
        from .security import get_password_hash
        
        # Get the existing model
        model = await request.state.session.get(self.model, pk)
        if not model:
            raise ValueError("User not found")
        
        # Extract password from form data
        password = data.get('password', '')
        
        # Remove password from data dict to avoid conflict
        data_copy = dict(data)
        data_copy.pop('password', None)
        
        # Update model attributes
        for key, value in data_copy.items():
            if hasattr(model, key):
                setattr(model, key, value)
        
        # Update password only if provided
        if password:
            model.hashed_password = get_password_hash(password)
        
        await request.state.session.commit()
        await request.state.session.refresh(model)
        return model

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
        "before_image_preview",  # Changed from WorkOrder.before_image_path
        "after_image_preview",   # Changed from WorkOrder.after_image_path
        WorkOrder.pdf_file_path,
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

    # Add image preview methods
    def before_image_preview(self, obj):
        """Display before image preview"""
        if obj.before_image_path and obj.before_image_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
            try:
                # Handle different file path formats
                if obj.before_image_path.startswith("uploads/"):
                    url = f"/{obj.before_image_path}"
                elif "/" in obj.before_image_path:
                    url = f"/uploads/{obj.before_image_path}"
                else:
                    url = f"/uploads/{obj.before_image_path}"
                
                return f'''
                <div style="text-align: center;">
                    <img src="{url}" 
                         style="max-height:80px; max-width:120px; object-fit:contain; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 5px;" 
                         onerror="this.style.display='none'; this.nextSibling.style.display='inline';" />
                    <span style="display:none; color: #999; font-size: 12px;">Image not found</span>
                    <div style="font-size: 10px; color: #666; max-width: 120px; word-wrap: break-word;">
                        {obj.before_image_path.split('/')[-1] if '/' in obj.before_image_path else obj.before_image_path}
                    </div>
                </div>
                '''
            except Exception as e:
                return f'<span style="color: #999; font-size: 12px;">Error loading image</span>'
        elif obj.before_image_path:
            return f'<span style="color: #666; font-size: 12px;">{obj.before_image_path}</span>'
        return '<span style="color: #ccc;">No image</span>'
    
    before_image_preview.__name__ = "Before Image"
    before_image_preview.allow_html = True

    def after_image_preview(self, obj):
        """Display after image preview"""
        if obj.after_image_path and obj.after_image_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
            try:
                # Handle different file path formats
                if obj.after_image_path.startswith("uploads/"):
                    url = f"/{obj.after_image_path}"
                elif "/" in obj.after_image_path:
                    url = f"/uploads/{obj.after_image_path}"
                else:
                    url = f"/uploads/{obj.after_image_path}"
                
                return f'''
                <div style="text-align: center;">
                    <img src="{url}" 
                         style="max-height:80px; max-width:120px; object-fit:contain; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 5px;" 
                         onerror="this.style.display='none'; this.nextSibling.style.display='inline';" />
                    <span style="display:none; color: #999; font-size: 12px;">Image not found</span>
                    <div style="font-size: 10px; color: #666; max-width: 120px; word-wrap: break-word;">
                        {obj.after_image_path.split('/')[-1] if '/' in obj.after_image_path else obj.after_image_path}
                    </div>
                </div>
                '''
            except Exception as e:
                return f'<span style="color: #999; font-size: 12px;">Error loading image</span>'
        elif obj.after_image_path:
            return f'<span style="color: #666; font-size: 12px;">{obj.after_image_path}</span>'
        return '<span style="color: #ccc;">No image</span>'
    
    after_image_preview.__name__ = "After Image"
    after_image_preview.allow_html = True

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
        'before_image_path': {
            'label': 'Before Image Path',
            'description': 'Path to the before image (e.g., workorder/filename.jpg)'
        },
        'after_image_path': {
            'label': 'After Image Path',
            'description': 'Path to the after image (e.g., workorder/filename.jpg)'
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
        WorkOrderFile.work_order_id,
        "image_preview",  # Add this line for the preview column
    ]
    form_columns = [
        WorkOrderFile.work_order_id,
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

    # Add image preview method
    def image_preview(self, obj):
        if obj.file_path and obj.file_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
            try:
                # Handle different file path formats
                if obj.file_path.startswith("uploads/"):
                    # If file_path already includes uploads/ prefix
                    url = f"/{obj.file_path}"
                elif "/" in obj.file_path:
                    # If file_path has subdirectories
                    url = f"/uploads/{obj.file_path}"
                else:
                    # If file_path is just the filename
                    url = f"/uploads/{obj.file_path}"
                
                return f'''
                <img src="{url}" 
                     style="max-height:60px; max-width:100px; object-fit:contain; border: 1px solid #ddd; border-radius: 4px;" 
                     onerror="this.style.display='none'; this.nextSibling.style.display='inline';" />
                <span style="display:none; color: #999; font-size: 12px;">Image not found</span>
                '''
            except Exception as e:
                return f'<span style="color: #999; font-size: 12px;">Error loading image</span>'
        return ""
    
    image_preview.__name__ = "Image Preview"
    image_preview.allow_html = True

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
