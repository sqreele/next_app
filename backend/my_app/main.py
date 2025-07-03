# ==============================================================================
# File: my_app/admin.py
# Description: SQLAdmin configuration for the admin panel.
# ==============================================================================
from sqladmin import ModelView
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile

class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.username, User.email, User.is_active]
    column_details_exclude_list = [User.hashed_password]
    form_columns = [User.username, User.email, User.is_active]
    column_searchable_list = [User.username, User.email]
    column_sortable_list = [User.id, User.username, User.email, User.is_active]
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"

class UserProfileAdmin(ModelView, model=UserProfile):
    column_list = [UserProfile.id, UserProfile.user_id, UserProfile.role, UserProfile.position]
    form_columns = [UserProfile.user_id, UserProfile.role, UserProfile.position]
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
    form_columns = [Room.name, Room.number, Room.room_type, Room.is_active, Room.property_id]
    column_searchable_list = [Room.name, Room.number, Room.room_type]
    column_sortable_list = [Room.id, Room.name, Room.number, Room.room_type, Room.is_active]
    name = "Room"
    name_plural = "Rooms"
    icon = "fa-solid fa-door-open"

class MachineAdmin(ModelView, model=Machine):
    column_list = [Machine.id, Machine.name, Machine.status, Machine.property_id, Machine.room_id]
    form_columns = [Machine.name, Machine.status, Machine.property_id, Machine.room_id]
    column_searchable_list = [Machine.name, Machine.status]
    column_sortable_list = [Machine.id, Machine.name, Machine.status]
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
        WorkOrder.assigned_to_id
    ]
    form_columns = [
        WorkOrder.task,
        WorkOrder.description,
        WorkOrder.status,
        WorkOrder.priority,
        WorkOrder.due_date,
        WorkOrder.property_id,
        WorkOrder.machine_id,
        WorkOrder.room_id,
        WorkOrder.assigned_to_id
    ]
    column_searchable_list = [WorkOrder.task, WorkOrder.description, WorkOrder.status, WorkOrder.priority]
    column_sortable_list = [
        WorkOrder.id, 
        WorkOrder.task, 
        WorkOrder.status, 
        WorkOrder.priority, 
        WorkOrder.due_date,
        WorkOrder.created_at
    ]
    name = "Work Order"
    name_plural = "Work Orders"
    icon = "fa-solid fa-list-check"

class WorkOrderFileAdmin(ModelView, model=WorkOrderFile):
    column_list = [WorkOrderFile.id, WorkOrderFile.file_path, WorkOrderFile.upload_type, WorkOrderFile.work_order_id]
    form_columns = [WorkOrderFile.file_path, WorkOrderFile.upload_type, WorkOrderFile.work_order_id]
    column_searchable_list = [WorkOrderFile.file_path, WorkOrderFile.upload_type]
    column_sortable_list = [WorkOrderFile.id, WorkOrderFile.file_path, WorkOrderFile.upload_type]
    name = "Work Order File"
    name_plural = "Work Order Files"
    icon = "fa-solid fa-file"
