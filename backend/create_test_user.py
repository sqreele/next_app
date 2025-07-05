#!/usr/bin/env python3
"""
Script to create a test user with a known password for authentication testing
"""
import asyncio
import sys
import os

from my_app.database import SessionLocal
from my_app.models import User
from my_app.security import get_password_hash

async def create_test_user():
    """Create a test user with known credentials"""
    async with SessionLocal() as db:
        # Check if user already exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == "testuser_auth"))
        existing_user = result.scalars().first()
        
        if existing_user:
            print("Test user 'testuser_auth' already exists!")
            return
        
        # Create new test user
        test_user = User(
            username="testuser_auth",
            email="testauth@example.com",
            hashed_password=get_password_hash("testpass123"),
            is_active=True
        )
        
        db.add(test_user)
        await db.commit()
        await db.refresh(test_user)
        
        print("✅ Test user created successfully!")
        print("Username: testuser_auth")
        print("Password: testpass123")
        print("Email: testauth@example.com")

if __name__ == "__main__":
    asyncio.run(create_test_user()) 