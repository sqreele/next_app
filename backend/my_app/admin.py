# ==============================================================================
# File: my_app/main.py
# Description: The main entry point for the FastAPI application.
# ==============================================================================
from sqladmin import ModelView
from .models import User, UserProfile, Property, Room, Machine, WorkOrder, WorkOrderFile

class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.username, User.email, "profile"]
    column_details_exclude_list = [User.hashed_password]
    form_columns = [User.username, User.email, User.is_active, "profile"]
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"

class UserProfileAdmin(ModelView, model=UserProfile):
    column_list = [UserProfile.id, "user", "role", "position"]
    form_columns = [UserProfile.user, UserProfile.role, UserProfile.position, UserProfile.properties]
    name = "User Profile"
    name_plural = "User Profiles"
    icon = "fa-solid fa-id-card"

class PropertyAdmin(ModelView, model=Property):
    column_list = [Property.id, Property.name]
    form_columns = [Property.name]
    name = "Property"
    name_plural = "Properties"
    icon = "fa-solid fa-building"

class RoomAdmin(ModelView, model=Room):
    column_list = [Room.id, Room.name, Room.number, Room.room_type, Room.is_active]
    form_columns = [Room.name, Room.number, Room.room_type, Room.is_active, "properties"]
    name = "Room"
    name_plural = "Rooms"
    icon = "fa-solid fa-door-open"

class MachineAdmin(ModelView, model=Machine):
    column_list = [Machine.id, Machine.name, Machine.status, "room", "property"]
    form_columns = [Machine.name, Machine.status, "property", "room"]
    column_labels = {Machine.room: "Room", Machine.property: "Property"}
    name = "Machine"
    name_plural = "Machines"
    icon = "fa-solid fa-robot"

class WorkOrderAdmin(ModelView, model=WorkOrder):
    column_list = [WorkOrder.id, WorkOrder.task, WorkOrder.status, WorkOrder.priority, "machine", "room"]
    column_labels = {WorkOrder.machine: "Machine", WorkOrder.room: "Room"}
    name = "Work Order"
    name_plural = "Work Orders"
    icon = "fa-solid fa-list-check"

class WorkOrderFileAdmin(ModelView, model=WorkOrderFile):
    column_list = [WorkOrderFile.id, WorkOrderFile.file_path]