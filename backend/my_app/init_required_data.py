# backend/init_required_data.py
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from my_app.database import SessionLocal
from my_app.models import Property, User, UserProfile
from my_app.security import get_password_hash

async def init_required_data():
    async with SessionLocal() as db:
        try:
            print("🔄 Initializing required data...")
            
            # Create properties if they don't exist
            from sqlalchemy import select
            
            for prop_id, prop_name in [(1, "MaintenancePro Thailand"), (2, "MaintenancePro China")]:
                existing_prop = await db.get(Property, prop_id)
                if not existing_prop:
                    prop = Property(id=prop_id, name=prop_name)
                    db.add(prop)
                    print(f"✅ Created property: {prop_name}")
                else:
                    print(f"✅ Property exists: {prop_name}")
            
            # Create a test user if none exists
            result = await db.execute(select(User).limit(1))
            existing_user = result.scalars().first()
            
            if not existing_user:
                test_user = User(
                    username="testuser",
                    email="test@example.com",
                    hashed_password=get_password_hash("testpass"),
                    is_active=True
                )
                db.add(test_user)
                await db.flush()
                
                # Create profile
                profile = UserProfile(
                    user_id=test_user.id,
                    role="Technician",
                    position="Test Technician"
                )
                db.add(profile)
                print(f"✅ Created test user: testuser")
            else:
                print(f"✅ Users exist")
            
            await db.commit()
            print("✅ Database initialization complete!")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error initializing data: {e}")

if __name__ == "__main__":
    asyncio.run(init_required_data())