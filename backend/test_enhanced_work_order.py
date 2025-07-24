#!/usr/bin/env python3
"""
Test script for enhanced work order creation with detailed fields
"""

import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from my_app.database import get_db_session
from my_app.models import WorkOrder, User, Machine, Room, Property, Topic, Procedure
from my_app.crud import create_work_order
from my_app.schemas import WorkOrderCreate

async def test_enhanced_work_order_creation():
    """Test creating work orders with enhanced fields"""
    
    async with get_db_session() as db:
        print("Testing Enhanced Work Order Creation...")
        
        # Test data for different work order types
        test_work_orders = [
            {
                "type": "pm",
                "title": "Monthly HVAC Maintenance",
                "description": "Comprehensive monthly maintenance of HVAC system including filter replacement, coil cleaning, and performance check",
                "machine_id": 1,  # Assuming machine exists
                "procedure_id": 1,  # Assuming procedure exists
                "priority": "Medium",
                "frequency": "Monthly",
                "estimated_duration": 120,  # 2 hours
                "safety_requirements": "PPE required: safety glasses, gloves, hard hat. LOTO procedures must be followed.",
                "required_tools": "Multimeter, screwdriver set, cleaning supplies, new filters",
                "required_parts": "HEPA filters (2), cleaning solution, lubricant",
                "special_instructions": "Check refrigerant levels and document readings. Report any unusual noises or vibrations.",
                "cost_estimate": 150.00,
                "room_id": 1,
                "assigned_to_id": 1,
                "topic_ids": [1, 2]  # Multiple topics
            },
            {
                "type": "issue",
                "title": "Equipment Malfunction - Pump Not Starting",
                "description": "Main circulation pump not starting. No response from control panel. Urgent repair needed to maintain system operation.",
                "machine_id": 2,
                "priority": "Critical",
                "estimated_duration": 60,
                "safety_requirements": "Electrical work - qualified electrician required. Lock out electrical panel.",
                "required_tools": "Electrical multimeter, wire strippers, electrical tape",
                "required_parts": "Potential starter relay, fuses",
                "special_instructions": "Check electrical connections first. If motor is burned out, may need replacement.",
                "cost_estimate": 300.00,
                "room_id": 1,
                "assigned_to_id": 1
            },
            {
                "type": "workorder",
                "title": "Install New Security Cameras",
                "description": "Install 4 new security cameras in the warehouse area as part of the security upgrade project",
                "estimated_duration": 240,  # 4 hours
                "safety_requirements": "Working at height - safety harness required. Electrical work - qualified electrician needed.",
                "required_tools": "Drill, cable puller, ladder, crimping tools",
                "required_parts": "4x IP cameras, 200ft Cat6 cable, mounting brackets, screws",
                "special_instructions": "Coordinate with security team for camera positioning. Test all cameras before completion.",
                "cost_estimate": 800.00,
                "room_id": 2,
                "assigned_to_id": 2
            }
        ]
        
        created_work_orders = []
        
        for i, wo_data in enumerate(test_work_orders):
            try:
                print(f"\n--- Creating Work Order {i+1}: {wo_data['title']} ---")
                
                # Create work order schema
                work_order_create = WorkOrderCreate(**wo_data)
                
                # Create work order
                work_order = await create_work_order(db, work_order=work_order_create)
                created_work_orders.append(work_order)
                
                print(f"✅ Successfully created work order ID: {work_order.id}")
                print(f"   Type: {work_order.type}")
                print(f"   Title: {work_order.title}")
                print(f"   Priority: {work_order.priority}")
                print(f"   Estimated Duration: {work_order.estimated_duration} minutes")
                print(f"   Cost Estimate: ${work_order.cost_estimate}")
                
                if work_order.safety_requirements:
                    print(f"   Safety Requirements: {work_order.safety_requirements[:50]}...")
                
                if work_order.required_tools:
                    print(f"   Required Tools: {work_order.required_tools[:50]}...")
                    
                if hasattr(work_order, 'topics') and work_order.topics:
                    print(f"   Topics: {[topic.title for topic in work_order.topics]}")
                
            except Exception as e:
                print(f"❌ Failed to create work order {i+1}: {str(e)}")
                import traceback
                traceback.print_exc()
        
        print(f"\n🎉 Test completed! Created {len(created_work_orders)} work orders successfully.")
        
        # Test querying with new fields
        if created_work_orders:
            print("\n--- Testing Enhanced Field Queries ---")
            
            # Query by estimated duration
            long_duration_orders = []
            for wo in created_work_orders:
                if wo.estimated_duration and wo.estimated_duration > 60:
                    long_duration_orders.append(wo)
            
            print(f"Work orders with duration > 60 minutes: {len(long_duration_orders)}")
            
            # Query by cost estimate
            expensive_orders = []
            for wo in created_work_orders:
                if wo.cost_estimate and wo.cost_estimate > 200:
                    expensive_orders.append(wo)
            
            print(f"Work orders with cost > $200: {len(expensive_orders)}")
            
            # Display summary
            print("\n--- Work Order Summary ---")
            for wo in created_work_orders:
                print(f"ID {wo.id}: {wo.title} - {wo.type.upper()} - ${wo.cost_estimate or 0:.2f}")

if __name__ == "__main__":
    asyncio.run(test_enhanced_work_order_creation())