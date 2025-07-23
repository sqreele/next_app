# backend/create_admin.py

import asyncio
from sqlalchemy.orm import Session
from my_app.database import sync_engine
from my_app.models import User, UserRole

def create_admin_user():
    with Session(sync_engine) as db:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            admin = User(
                username="admin",
                email="admin@example.com",
                first_name="Admin",
                last_name="User",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created - Username: admin, Password: admin123")
        else:
            print("✅ Admin user already exists")

if __name__ == "__main__":
    create_admin_user()
