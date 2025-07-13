from sqladmin import ModelView
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile
from markupsafe import Markup
from sqlalchemy.orm import selectinload

# Helper function for single image formatting
def format_image_preview(model, attribute):
    image_path = getattr(model, attribute, None)
    if image_path and isinstance(image_path, str) and image_path.strip():
        clean_path = image_path.strip('/')
        url = f"/uploads/{clean_path}"
        return Markup(f'<a href="{url}" target="_blank"><img src="{url}" width="100" height="75" style="object-fit: cover; border-radius: 4px;" alt="Image" loading="lazy"></a>')
    return Markup('<span style="color: #ccc; font-size: 12px;">No Image</span>')

# Helper function for image array formatting
def format_image_array(model, attribute):
    images = getattr(model, attribute, [])
    if images and isinstance(images, list) and len(images) > 0:
        previews = []
        for img_path in images[:3]:
            if img_path and isinstance(img_path, str) and img_path.strip():
                clean_path = img_path.strip('/')
                url = f"/uploads/{clean_path}"
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
        UserProfile.properties,
    ]
    form_columns = [
        UserProfile.user_id,
        UserProfile.role,
        UserProfile.position,
        UserProfile.properties,
    ]
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
        'properties': {
            'label': 'Properties',
            'description': 'Select properties associated with this user profile'
        },
    }

    column_labels = {
        'properties': 'Associated Properties',
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
    column_list = [
        Machine.id, 
        Machine.name, 
        Machine.status, 
        "property.name", 
        "room.name",
        "has_pm",
        "has_issue"
    ]
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

    column_labels = {
        "has_pm": "Has PM",
        "has_issue": "Has Issue",
    }

    def get_query(self, request):
        return super().get_query(request).options(selectinload(Machine.work_orders))

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
        WorkOrder.assigned_to,
        'before_images',
        'after_images',
        WorkOrder.pdf_file_path,
    ]
    
    # Add custom CSS for better image display
    def get_css(self):
        return """
        <style>
        .image-preview-container {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            align-items: center;
        }
        .image-preview-container img {
            border: 1px solid #ddd;
            transition: transform 0.2s;
        }
        .image-preview-container img:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .pdf-link {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
        }
        .pdf-link:hover {
            text-decoration: underline;
        }
        </style>
        """
    
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
        "before_images": "Before Images",
        "after_images": "After Images",
        "assigned_to": "Assigned User",
        "pdf_file_path": "PDF Document",
    }

    column_formatters = {
        'before_images': lambda m, a: format_image_array(m, 'before_images'),
        'after_images': lambda m, a: format_image_array(m, 'after_images'),
        'assigned_to': lambda m, a: m.assigned_to.username if m.assigned_to else "Unassigned",
        'pdf_file_path': lambda m, a: Markup(f'<a href="/uploads/{m.pdf_file_path.strip("/")}" target="_blank" class="pdf-link">📄 View PDF</a>') if m.pdf_file_path else Markup('<span style="color: #ccc; font-size: 12px;">No PDF</span>'),
    }

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
        WorkOrderFile.uploaded_at,
    ]

    column_labels = {
        "file_path": "File Path",
        "file_name": "File Name",
        "file_size": "File Size (Bytes)",
        "mime_type": "MIME Type",
        "upload_type": "File Type",
        "uploaded_at": "Uploaded At",
        "work_order_id": "Work Order",
    }

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