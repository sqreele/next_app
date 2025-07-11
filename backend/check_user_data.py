import asyncio
from my_app.database import SessionLocal
from my_app.models import User, UserProfile, Property
from sqlalchemy import select
from sqlalchemy.orm import selectinload  # Missing import

async def setup_test_data():
    async with SessionLocal() as db:
        print("🔄 Setting up test data...")
        
        # Get or create a property
        prop_result = await db.execute(select(Property).limit(1))
        property = prop_result.scalars().first()
        
        if not property:
            property = Property(name="Test Property")
            db.add(property)
            await db.commit()
            await db.refresh(property)
            print(f"✅ Created property: {property.name}")
        else:
            print(f"✅ Using existing property: {property.name}")
        
        # Get first user with profile
        user_result = await db.execute(
            select(User)
            .options(
                selectinload(User.profile).selectinload(UserProfile.properties)
            )
            .limit(1)
        )
        user = user_result.scalars().first()
        
        if not user:
            print("❌ No user found")
            return
        
        print(f"✅ Found user: {user.username}")
        print(f"✅ User profile: {user.profile}")
        
        # Assign property to user if not already assigned
        if user.profile and property not in user.profile.properties:
            user.profile.properties.append(property)
            await db.commit()
            print(f"✅ Assigned property '{property.name}' to user '{user.username}'")
        else:
            print(f"✅ Property already assigned to user")
        
        # Verify the assignment
        await db.refresh(user.profile)
        print(f"✅ User properties: {[p.name for p in user.profile.properties]}")
        
        # Test the /auth/me endpoint data
        if user.profile and user.profile.properties:
            property_id = user.profile.properties[0].id
            print(f"✅ User's property_id: {property_id}")
        else:
            print("❌ No properties assigned to user")

if __name__ == "__main__":
    asyncio.run(setup_test_data())