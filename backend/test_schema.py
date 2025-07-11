import json
from my_app.schemas import WorkOrderCreate

# Test the schema with your frontend data
test_data = {
    "task": "Test Work Order",
    "description": "Test description",
    "status": "Pending",
    "priority": "Medium",
    "due_date": "2025-12-31",
    "property_id": 1,
    "before_images": ["before/7101159b-2531-4bbe-b895-d28bca705591.jpg"],
    "after_images": [],
    "assigned_to_id": 1  # Example user ID
}

try:
    work_order = WorkOrderCreate(**test_data)
    print("✅ Schema validation passed!")
    print(f"📋 Parsed data: {work_order.model_dump()}")
except Exception as e:
    print(f"❌ Schema validation failed: {e}")