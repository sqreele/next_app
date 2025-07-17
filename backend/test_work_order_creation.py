import asyncio
import uuid
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from my_app.database import SessionLocal
from my_app.models import Property, User, UserProfile, WorkOrder, Machine, Room, Topic
from my_app.schemas import WorkOrderCreate, UserCreate, UserProfileCreate
from my_app.crud import create_work_order, create_user
from sqlalchemy import select

async def simulate_image_upload(upload_type="before", file_content=b"fake-image-content", mime_type="image/jpeg", filename="test-image.jpg"):
    try:
        print(f"🔍 Starting {upload_type} upload simulation...")
        async with httpx.AsyncClient() as client:
            files = {"file": (filename, file_content, mime_type)}
            data = {"upload_type": upload_type}
            
            print(f"🔍 Making request to: http://localhost:8000/api/v1/work_orders/upload_image")
            print(f"🔍 Files: {files}")
            print(f"🔍 Data: {data}")
            
            response = await client.post(
                "http://localhost:8000/api/v1/work_orders/upload_image",
                files=files,
                data=data
            )
            print(f"🔍 Upload response status: {response.status_code}")
            print(f"🔍 Upload response text: {response.text}")
            
            if response.status_code == 200:
                response_json = response.json()
                print(f"🔍 Upload response JSON: {response_json}")
                file_path = response_json.get("file_path")
                print(f"🔍 Extracted file_path: {file_path}")
                return file_path
            else:
                print(f"❌ Upload failed with status {response.status_code}")
                raise Exception(f"Upload failed: {response.status_code}")
                
    except Exception as e:
        print(f"⚠️ Upload simulation failed: {e}")
        fallback_path = f"{upload_type}/{uuid.uuid4()}.jpg"
        print(f"🔍 Using fallback path: {fallback_path}")
        return fallback_path

async def simulate_pdf_upload():
    try:
        print(f"🔍 Starting PDF upload simulation...")
        async with httpx.AsyncClient() as client:
            files = {"file": ("test-document.pdf", b"fake-pdf-content", "application/pdf")}
            data = {"upload_type": "document"}
            
            print(f"🔍 Making request to: http://localhost:8000/api/v1/work_orders/upload_image")
            print(f"🔍 Files: {files}")
            print(f"🔍 Data: {data}")
            
            response = await client.post(
                "http://localhost:8000/api/v1/work_orders/upload_image",
                files=files,
                data=data
            )
            print(f"🔍 Upload response status: {response.status_code}")
            print(f"🔍 Upload response text: {response.text}")
            
            if response.status_code == 200:
                response_json = response.json()
                print(f"🔍 Upload response JSON: {response_json}")
                file_path = response_json.get("file_path")
                print(f"🔍 Extracted file_path: {file_path}")
                return file_path
            else:
                print(f"❌ PDF Upload failed with status {response.status_code}")
                raise Exception(f"PDF Upload failed: {response.status_code}")
                
    except Exception as e:
        print(f"⚠️ PDF Upload simulation failed: {e}")
        fallback_path = f"document/{uuid.uuid4()}.pdf"
        print(f"🔍 Using PDF fallback path: {fallback_path}")
        return fallback_path

async def get_or_create_machine(db: AsyncSession, property_id: int):
    """Get or create a test machine"""
    machines_result = await db.execute(select(Machine).where(Machine.property_id == property_id))
    machines = machines_result.scalars().all()
    
    if not machines:
        print("❌ No machines found! Creating test machine...")
        test_machine = Machine(
            name="Test Machine - AC Unit 001",
            status="Operational",
            property_id=property_id
        )
        db.add(test_machine)
        await db.commit()
        await db.refresh(test_machine)
        machines = [test_machine]
    
    return machines[0]

async def get_or_create_room(db: AsyncSession, property_id: int):
    """Get or create a test room"""
    rooms_result = await db.execute(select(Room).where(Room.property_id == property_id))
    rooms = rooms_result.scalars().all()
    
    if not rooms:
        print("❌ No rooms found! Creating test room...")
        test_room = Room(
            name="Test Room 101",
            number="101",
            room_type="Standard Room",
            property_id=property_id,
            is_active=True
        )
        db.add(test_room)
        await db.commit()
        await db.refresh(test_room)
        rooms = [test_room]
    
    return rooms[0]

async def get_or_create_topic(db: AsyncSession):
    """Get or create a test topic"""
    topics_result = await db.execute(select(Topic))
    topics = topics_result.scalars().all()
    
    if not topics:
        print("❌ No topics found! Creating test topic...")
        test_topic = Topic(title="Maintenance Issue")
        db.add(test_topic)
        await db.commit()
        await db.refresh(test_topic)
        topics = [test_topic]
    
    return topics[0]

async def test_work_order_creation():
    async with SessionLocal() as db:
        try:
            print("🔍 Starting work order creation test...")
            
            # Get or create property
            properties_result = await db.execute(select(Property))
            properties = properties_result.scalars().all()
            
            if not properties:
                print("❌ No properties found! Creating test property...")
                test_property = Property(name="Test Property - Main Building")
                db.add(test_property)
                await db.commit()
                await db.refresh(test_property)
                properties = [test_property]
            
            property_obj = properties[0]
            print(f"✅ Using property: {property_obj.name} (ID: {property_obj.id})")
            
            # Get or create user
            users_result = await db.execute(select(User))
            users = users_result.scalars().all()
            
            if not users:
                print("❌ No users found! Creating test user...")
                test_user_data = UserCreate(
                    username="testuser",
                    email="testuser@example.com",
                    password="securepassword123",
                    profile=UserProfileCreate(role="Technician", position="Test Technician")
                )
                test_user = await create_user(db=db, user=test_user_data)
                users = [test_user]
            
            user_obj = users[0]
            print(f"✅ Using user: {user_obj.username} (ID: {user_obj.id})")
            
            # Get or create machine
            machine_obj = await get_or_create_machine(db, property_obj.id)
            print(f"✅ Using machine: {machine_obj.name} (ID: {machine_obj.id})")
            
            # Get or create room
            room_obj = await get_or_create_room(db, property_obj.id)
            print(f"✅ Using room: {room_obj.name} (ID: {room_obj.id})")
            
            # Get or create topic
            topic_obj = await get_or_create_topic(db)
            print(f"✅ Using topic: {topic_obj.title} (ID: {topic_obj.id})")
            
            # Upload all files
            print("\n📸 === IMAGE UPLOAD PHASE ===")
            
            # Test multiple before images
            print("\n🔄 Testing BEFORE images upload:")
            before_image_path_1 = await simulate_image_upload("before", b"fake-before-image-1", "image/jpeg", "before-test-1.jpg")
            before_image_path_2 = await simulate_image_upload("before", b"fake-before-image-2", "image/jpeg", "before-test-2.jpg")
            print(f"📸 Before image 1: '{before_image_path_1}'")
            print(f"📸 Before image 2: '{before_image_path_2}'")
            
            # Test multiple after images
            print("\n🔄 Testing AFTER images upload:")
            after_image_path_1 = await simulate_image_upload("after", b"fake-after-image-1", "image/jpeg", "after-test-1.jpg")
            after_image_path_2 = await simulate_image_upload("after", b"fake-after-image-2", "image/jpeg", "after-test-2.jpg")
            print(f"📸 After image 1: '{after_image_path_1}'")
            print(f"📸 After image 2: '{after_image_path_2}'")
            
            # Test PDF upload
            print("\n🔄 Testing PDF upload:")
            pdf_file_path = await simulate_pdf_upload()
            print(f"📸 PDF file path: '{pdf_file_path}'")
            
            # Prepare image arrays
            before_images = [before_image_path_1, before_image_path_2]
            after_images = [after_image_path_1, after_image_path_2]
            
            print(f"\n📸 === UPLOAD SUMMARY ===")
            print(f"📸 Before images: {before_images}")
            print(f"📸 After images:  {after_images}")
            print(f"📸 PDF file:     '{pdf_file_path}'")
            
            # Create work order data with ALL required fields
            print("\n📝 === WORK ORDER CREATION PHASE ===")
            print(f"🔍 Creating WorkOrderCreate with all file paths...")
            
            test_data = WorkOrderCreate(
                task="Complete Maintenance Check - AC Unit Inspection",
                description="Comprehensive inspection and maintenance of AC Unit 001 in Room 101. This includes checking filters, cleaning coils, testing thermostat, and verifying proper operation. Multiple before and after images documented.",
                property_id=property_obj.id,
                machine_id=machine_obj.id,  # ✅ ADDED: Machine ID
                room_id=room_obj.id,        # ✅ ADDED: Room ID
                topic_id=topic_obj.id,      # ✅ ADDED: Topic ID
                assigned_to_id=user_obj.id,
                status="Pending",
                priority="Medium", 
                due_date="2025-12-31",
                type="pm",  # Required field
                
                # Single image paths (for backward compatibility)
                before_image_path=before_image_path_1,
                after_image_path=after_image_path_1,
                
                # Image arrays (new feature)
                before_images=before_images,  # ✅ ADDED: Before images array
                after_images=after_images,    # ✅ ADDED: After images array
                
                # PDF file
                pdf_file_path=pdf_file_path,
            )
            
            print(f"📝 WorkOrderCreate object created successfully!")
            print(f"📝 task: '{test_data.task}'")
            print(f"📝 description: '{test_data.description}'")
            print(f"📝 property_id: {test_data.property_id}")
            print(f"📝 machine_id: {test_data.machine_id}")
            print(f"📝 room_id: {test_data.room_id}")
            print(f"📝 topic_id: {test_data.topic_id}")
            print(f"📝 assigned_to_id: {test_data.assigned_to_id}")
            print(f"📝 status: '{test_data.status}'")
            print(f"📝 priority: '{test_data.priority}'")
            print(f"📝 due_date: '{test_data.due_date}'")
            print(f"📝 type: '{test_data.type}'")
            print(f"📝 before_image_path: '{test_data.before_image_path}'")
            print(f"📝 after_image_path: '{test_data.after_image_path}'")
            print(f"📝 before_images: {test_data.before_images}")
            print(f"📝 after_images: {test_data.after_images}")
            print(f"📝 pdf_file_path: '{test_data.pdf_file_path}'")
            
            # Validate the model
            print(f"\n📝 Full model dump: {test_data.model_dump()}")
            
            # Save to database
            print("\n💾 === DATABASE SAVE PHASE ===")
            result = await create_work_order(db=db, work_order=test_data)
            
            print(f"\n✅ Work order created successfully!")
            print(f"   - ID: {result.id}")
            print(f"   - Task: {result.task}")
            print(f"   - Description: {result.description}")
            print(f"   - Property ID: {result.property_id}")
            print(f"   - Machine ID: {result.machine_id}")
            print(f"   - Room ID: {result.room_id}")
            print(f"   - Topic ID: {result.topic_id}")
            print(f"   - Assigned To ID: {result.assigned_to_id}")
            print(f"   - Status: {result.status}")
            print(f"   - Priority: {result.priority}")
            print(f"   - Due Date: {result.due_date}")
            print(f"   - Type: {result.type}")
            print(f"   - Before Image Path: '{result.before_image_path}'")
            print(f"   - After Image Path: '{result.after_image_path}'")
            print(f"   - Before Images: {result.before_images}")
            print(f"   - After Images: {result.after_images}")
            print(f"   - PDF File Path: '{result.pdf_file_path}'")
            
            # Double-check from database
            fresh_result = await db.get(WorkOrder, result.id)
            print(f"\n🔍 Fresh from DB verification:")
            print(f"   - ID: {fresh_result.id}")
            print(f"   - Task: '{fresh_result.task}'")
            print(f"   - Type: '{fresh_result.type}'")
            print(f"   - Property ID: {fresh_result.property_id}")
            print(f"   - Machine ID: {fresh_result.machine_id}")
            print(f"   - Room ID: {fresh_result.room_id}")
            print(f"   - Topic ID: {fresh_result.topic_id}")
            print(f"   - Before Images Count: {len(fresh_result.before_images) if fresh_result.before_images else 0}")
            print(f"   - After Images Count: {len(fresh_result.after_images) if fresh_result.after_images else 0}")
            print(f"   - Has PDF: {'Yes' if fresh_result.pdf_file_path else 'No'}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_work_order_creation())
