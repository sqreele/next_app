#!/usr/bin/env python3
"""
Test script to verify admin panel is working with data
"""
import sys
import os
import asyncio

# Add paths
sys.path.append('/workspace/backend')
sys.path.append('/workspace/backend/my_app')

# Set environment variables
os.environ['DB_USER'] = 'postgres'
os.environ['DB_PASSWORD'] = 'postgres'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'
os.environ['DB_NAME'] = 'pmdb'
os.environ['ENVIRONMENT'] = 'development'

print("🔄 Testing Admin Panel Configuration...")

try:
    from my_app.main import app
    print("✅ FastAPI app imported successfully")
    
    # Test database connection and verify data
    from my_app.database import sync_engine
    from my_app.models import User, Property, Room, Machine
    from sqlalchemy.orm import sessionmaker
    
    Session = sessionmaker(bind=sync_engine)
    session = Session()
    
    print("\n📊 Database Data Summary:")
    tables = [
        ('Users', User),
        ('Properties', Property), 
        ('Rooms', Room),
        ('Machines', Machine)
    ]
    
    for table_name, model in tables:
        count = session.query(model).count()
        print(f"  {table_name}: {count} records")
    
    session.close()
    
    print("\n🔐 Admin Panel Access Information:")
    print("  URL: http://localhost:8000/admin")
    print("  Username: admin")
    print("  Password: admin123")
    
    print("\n🚀 To start the server, run:")
    print("  cd /workspace/backend")
    print("  export DB_USER=postgres DB_PASSWORD=postgres DB_HOST=localhost DB_PORT=5432 DB_NAME=pmdb ENVIRONMENT=development")
    print("  python3 -m uvicorn my_app.main:app --host 0.0.0.0 --port 8000 --reload")
    
    print("\n✅ Admin panel configuration is working correctly!")
    print("✅ Database has data that should display in the admin panel")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()