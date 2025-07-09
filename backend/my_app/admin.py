# ==============================================================================
# File: my_app/admin.py (Fixed Image Previews - Final Version)
# Description: SQLAdmin configuration with working image previews.
# ==============================================================================
from sqladmin import ModelView
from wtforms import PasswordField
from wtforms.validators import Optional, DataRequired
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile
import os
from markupsafe import Markup

# ... [Keep all other classes unchanged until WorkOrderAdmin] ...

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
        WorkOrder.before_image_path,
        "before_preview",  # Custom column for preview
        WorkOrder.after_image_path,
        "after_preview",   # Custom column for preview
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
        WorkOrder.before_image_path,
        WorkOrder.after_image_path,
    ]
    
    column_sortable_list = [
        WorkOrder.id,
        WorkOrder.task,
        WorkOrder.status,
        WorkOrder.priority,
        WorkOrder.due_date,
        WorkOrder.created_at,
        WorkOrder.before_image_path,
        WorkOrder.after_image_path,
    ]

    # Column labels for better display
    column_labels = {
        "before_preview": "Before Image",
        "after_preview": "After Image",
        "before_image_path": "Before Path",
        "after_image_path": "After Path",
    }

    # FIXED: Proper column formatters
    column_formatters = {
        "before_preview": lambda view, context, model, name: _format_image_preview(model.before_image_path, "Before"),
        "after_preview": lambda view, context, model, name: _format_image_preview(model.after_image_path, "After"),
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
        WorkOrderFile.work_order_id,
        "preview",  # Custom column
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

    column_labels = {
        "preview": "Preview",
    }

    # FIXED: Proper column formatters
    column_formatters = {
        "preview": lambda view, context, model, name: _format_file_image_preview(model.file_path, model.mime_type),
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


# FIXED: Helper functions with proper Markup
def _format_image_preview(image_path, label):
    """Format image preview for work orders"""
    if not image_path or image_path.strip() == "":
        return Markup(f'<span style="color: #ccc; font-size: 12px;">No {label}</span>')
    
    # Check if it's an image file
    if not image_path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp')):
        return Markup(f'<span style="color: #666; font-size: 12px; word-break: break-all;">{image_path}</span>')
    
    try:
        # Construct URL - handle different path formats
        if image_path.startswith("uploads/"):
            url = f"/{image_path}"
        elif "/" in image_path:
            url = f"/uploads/{image_path}"
        else:
            url = f"/uploads/{image_path}"
        
        # Get filename for display
        filename = image_path.split('/')[-1] if '/' in image_path else image_path
        
        html = f'''
        <div style="text-align: center; max-width: 120px;">
            <img src="{url}" 
                 style="max-height: 60px; max-width: 100px; object-fit: contain; 
                        border: 1px solid #ddd; border-radius: 4px; margin-bottom: 4px;
                        cursor: pointer; display: block;" 
                 onclick="window.open('{url}', '_blank')"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" 
                 title="Click to view full size" />
            <span style="display: none; color: #999; font-size: 12px;">Not Found</span>
            <div style="font-size: 10px; color: #666; word-break: break-all;">
                {filename[:20]}{'...' if len(filename) > 20 else ''}
            </div>
        </div>
        '''
        return Markup(html)
        
    except Exception as e:
        return Markup(f'<span style="color: #f00; font-size: 11px;">Error</span>')


def _format_file_image_preview(file_path, mime_type):
    """Format image preview for work order files"""
    if not file_path or file_path.strip() == "":
        return Markup('<span style="color: #ccc; font-size: 12px;">No File</span>')
    
    # Check if it's an image file based on path or mime type
    is_image = (
        file_path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp')) or
        (mime_type and mime_type.startswith('image/'))
    )
    
    if not is_image:
        return Markup(f'<span style="color: #666; font-size: 12px; word-break: break-all;">{file_path}</span>')
    
    try:
        # Construct URL
        if file_path.startswith("uploads/"):
            url = f"/{file_path}"
        elif "/" in file_path:
            url = f"/uploads/{file_path}"
        else:
            url = f"/uploads/{file_path}"
        
        html = f'''
        <img src="{url}" 
             style="max-height: 50px; max-width: 80px; object-fit: contain; 
                    border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" 
             onclick="window.open('{url}', '_blank')"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" 
             title="Click to view full size" />
        <span style="display: none; color: #999; font-size: 12px;">Not Found</span>
        '''
        return Markup(html)
        
    except Exception as e:
        return Markup('<span style="color: #f00; font-size: 11px;">Error</span>')
