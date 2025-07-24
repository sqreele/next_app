#!/usr/bin/env python3
"""
Debug admin panel - minimal version to test if admin works
"""
import logging
from sqladmin import ModelView
from markupsafe import Markup
from models import User, Property, Room, Machine

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class SimpleUserAdmin(ModelView, model=User):
    """Simplified User admin view for debugging."""
    column_list = [User.id, User.username, User.first_name, User.last_name, User.email]
    form_columns = [User.username, User.first_name, User.last_name, User.email, User.role]
    column_searchable_list = [User.username, User.email, User.first_name, User.last_name]
    column_sortable_list = [User.id, User.username, User.first_name, User.last_name]
    
    name = "User (Simple)"
    name_plural = "Users (Simple)"
    icon = "fa-solid fa-users"

class SimplePropertyAdmin(ModelView, model=Property):
    """Simplified Property admin view for debugging."""
    column_list = [Property.id, Property.name, Property.address, Property.is_active]
    form_columns = [Property.name, Property.address, Property.is_active]
    column_searchable_list = [Property.name, Property.address]
    column_sortable_list = [Property.id, Property.name, Property.is_active]
    
    column_formatters = {
        'is_active': lambda m, a: (
            Markup('<span class="badge badge-success">Active</span>') 
            if getattr(m, 'is_active', False) 
            else Markup('<span class="badge badge-secondary">Inactive</span>')
        )
    }
    
    name = "Property (Simple)"
    name_plural = "Properties (Simple)"
    icon = "fa-solid fa-building"

class SimpleRoomAdmin(ModelView, model=Room):
    """Simplified Room admin view for debugging."""
    column_list = [Room.id, Room.name, Room.room_number, Room.property_id]
    form_columns = [Room.property_id, Room.name, Room.room_number, Room.is_active]
    column_searchable_list = [Room.name, Room.room_number]
    column_sortable_list = [Room.id, Room.name, Room.room_number]
    
    name = "Room (Simple)"
    name_plural = "Rooms (Simple)"
    icon = "fa-solid fa-door-open"

class SimpleMachineAdmin(ModelView, model=Machine):
    """Simplified Machine admin view for debugging."""
    column_list = [Machine.id, Machine.name, Machine.model, Machine.serial_number, Machine.room_id]
    form_columns = [Machine.room_id, Machine.name, Machine.model, Machine.serial_number, Machine.is_active]
    column_searchable_list = [Machine.name, Machine.model, Machine.serial_number]
    column_sortable_list = [Machine.id, Machine.name, Machine.model]
    
    name = "Machine (Simple)"
    name_plural = "Machines (Simple)"
    icon = "fa-solid fa-cogs"

# Export simple admin views for testing
SIMPLE_ADMIN_VIEWS = [
    SimpleUserAdmin,
    SimplePropertyAdmin,
    SimpleRoomAdmin,
    SimpleMachineAdmin
]