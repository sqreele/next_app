# backend/create_admin.py

import sys
import os

# Add the correct path
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/my_app')

try:
    # Import with correct paths
    from my_app.database import sync_engine, create_tables_sync
    from my_app.models import User, UserRole
    from sqlalchemy.orm import Session
    
    def create_admin_user():
        """Create a default admin user"""
        try:
            print("🔄 Creating tables...")
            # Ensure tables exist
            create_tables_sync()
            print("✅ Tables created/verified")
            
            print("🔄 Creating admin user...")
            with Session(sync_engine) as db:
                # Check if admin exists
                admin = db.query(User).filter(User.username == "admin").first()
                
                if not admin:
                    admin = User(
                        username="admin",
                        email="admin@pmservice.com",
                        first_name="System",
                        last_name="Administrator",
                        phone="+1234567890",
                        role=UserRole.ADMIN,
                        is_active=True
                    )
                    db.add(admin)
                    db.commit()
                    print("✅ Admin user created successfully!")
                    print("📋 Login Details:")
                    print("   URL: http://localhost:8000/admin")
                    print("   Username: admin")
                    print("   Password: admin123")
                else:
                    print("✅ Admin user already exists")
                    print("📋 Login Details:")
                    print("   URL: http://localhost:8000/admin")
                    print("   Username: admin")
                    print("   Password: admin123")
                    
        except Exception as e:
            print(f"❌ Error creating admin user: {e}")
            import traceback
            traceback.print_exc()

    if __name__ == "__main__":
        print("🚀 Starting admin user creation...")
        create_admin_user()
        print("✅ Admin user creation completed!")

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Available modules:")
    try:
        import my_app
        print("✅ my_app imported successfully")
        print(f"my_app location: {my_app.__file__}")
    except ImportError:
        print("❌ my_app not found")
    
    print(f"Python path: {sys.path}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Directory contents: {os.listdir('/app')}")
    if os.path.exists('/app/my_app'):
        print(f"my_app contents: {os.listdir('/app/my_app')}")
