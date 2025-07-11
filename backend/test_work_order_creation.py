# paste.txt (ENHANCED WITH ALL FILE TYPES)
import asyncio
import uuid
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from my_app.database import SessionLocal
from my_app.models import Property, User, UserProfile, WorkOrder
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

async def test_work_order_creation():
    async with SessionLocal() as db:
        try:
            print("🔍 Starting work order creation test...")
            
            # Get or create property
            properties_result = await db.execute(select(Property))
            properties = properties_result.scalars().all()
            
            if not properties:
                print("❌ No properties found! Creating test property...")
                test_property = Property(name="Test Property")
                db.add(test_property)
                await db.commit()
                await db.refresh(test_property)
                properties = [test_property]
            
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
            
            # Upload all files
            print("\n📸 === IMAGE UPLOAD PHASE ===")
            
            # Test before image
            print("\n🔄 Testing BEFORE image upload:")
            before_image_path = await simulate_image_upload("before", b"fake-before-image", "image/jpeg", "before-test.jpg")
            print(f"📸 Before image path: '{before_image_path}'")
            
            # Test after image
            print("\n🔄 Testing AFTER image upload:")
            after_image_path = await simulate_image_upload("after", b"fake-after-image", "image/jpeg", "after-test.jpg")
            print(f"📸 After image path: '{after_image_path}'")
            
            # Test PDF upload
            print("\n🔄 Testing PDF upload:")
            pdf_file_path = await simulate_pdf_upload()
            print(f"📸 PDF file path: '{pdf_file_path}'")
            
            print(f"\n📸 === UPLOAD SUMMARY ===")
            print(f"📸 Before image: '{before_image_path}' (type: {type(before_image_path)})")
            print(f"📸 After image:  '{after_image_path}' (type: {type(after_image_path)})")
            print(f"📸 PDF file:     '{pdf_file_path}' (type: {type(pdf_file_path)})")
            
            # Create work order data
            print("\n📝 === WORK ORDER CREATION PHASE ===")
            print(f"🔍 Creating WorkOrderCreate with all file paths...")
            
            test_data = WorkOrderCreate(
                task="Complete File Test Work Order",
                description="Testing all file types: before image, after image, and PDF",
                property_id=properties[0].id,
                status="Pending",
                priority="Medium", 
                due_date="2025-12-31",
                assigned_to_id=users[0].id,
                before_image_path=before_image_path,
                after_image_path=after_image_path,
                pdf_file_path=pdf_file_path
            )
            
            print(f"📝 WorkOrderCreate object created successfully!")
            print(f"📝 before_image_path: '{test_data.before_image_path}'")
            print(f"📝 after_image_path:  '{test_data.after_image_path}'")
            print(f"📝 pdf_file_path:     '{test_data.pdf_file_path}'")
            print(f"📝 Full model dump: {test_data.model_dump()}")
            
            # Save to database
            print("\n💾 === DATABASE SAVE PHASE ===")
            result = await create_work_order(db=db, work_order=test_data)
            
            print(f"\n✅ Work order created successfully!")
            print(f"   - ID: {result.id}")
            print(f"   - Task: {result.task}")
            print(f"   - Before Image: '{result.before_image_path}'")
            print(f"   - After Image:  '{result.after_image_path}'")
            print(f"   - PDF File:     '{result.pdf_file_path}'")
            
            # Double-check from database
            fresh_result = await db.get(WorkOrder, result.id)
            print(f"\n🔍 Fresh from DB:")
            print(f"   - Before Image: '{fresh_result.before_image_path}'")
            print(f"   - After Image:  '{fresh_result.after_image_path}'")
            print(f"   - PDF File:     '{fresh_result.pdf_file_path}'")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_work_order_creation())