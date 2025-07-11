# test_hardcoded.py
import asyncio
from my_app.database import SessionLocal
from my_app.schemas import WorkOrderCreate
from my_app.crud import create_work_order

async def test_hardcoded():
    async with SessionLocal() as db:
        # Test with hardcoded path
        test_data = WorkOrderCreate(
            task="Hardcoded Test",
            property_id=1,
            before_image_path="before/hardcoded-test.jpg",  # Hardcoded string
            after_image_path="after/hardcoded-test.jpg"    # Hardcoded string
        )
        
        print(f"📝 BEFORE CRUD:")
        print(f"   - before_image_path: '{test_data.before_image_path}'")
        print(f"   - Type: {type(test_data.before_image_path)}")
        print(f"   - Model dump: {test_data.model_dump()}")
        
        result = await create_work_order(db=db, work_order=test_data)
        
        print(f"📝 AFTER CRUD:")
        print(f"   - before_image_path: '{result.before_image_path}'")
        print(f"   - Type: {type(result.before_image_path)}")

if __name__ == "__main__":
    asyncio.run(test_hardcoded())