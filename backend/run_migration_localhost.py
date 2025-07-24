#!/usr/bin/env python3
"""
Script to run database migrations using localhost connection
"""
import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment variables to use localhost
os.environ['DB_NAME'] = 'fullstack_db'
os.environ['DB_USER'] = 'postgres'
os.environ['DB_PASSWORD'] = 'postgres'
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_PORT'] = '5432'

# Try different hosts if localhost doesn't work
hosts_to_try = ['localhost', '127.0.0.1', 'db']

def try_connection_with_host(host):
    """Try to connect to database with given host"""
    os.environ['DB_HOST'] = host
    try:
        from alembic.config import Config
        from alembic import command
        
        # Get the directory containing this script
        script_dir = Path(__file__).parent
        alembic_ini_path = script_dir / "alembic.ini"
        
        print(f"Trying connection to host: {host}")
        print(f"Using alembic.ini at: {alembic_ini_path}")
        
        # Create alembic configuration
        alembic_cfg = Config(str(alembic_ini_path))
        
        # Override the database URL in the config
        db_url = f"postgresql://postgres:postgres@{host}:5432/fullstack_db"
        alembic_cfg.set_main_option('sqlalchemy.url', db_url)
        
        # Check current migration
        print("Current migration status:")
        command.current(alembic_cfg)
        
        # Run migrations
        print("\nRunning migrations...")
        command.upgrade(alembic_cfg, "head")
        
        print(f"Migration completed successfully using host: {host}!")
        return True
        
    except Exception as e:
        print(f"Failed to connect to host {host}: {e}")
        return False

# Try each host until one works
success = False
for host in hosts_to_try:
    if try_connection_with_host(host):
        success = True
        break

if not success:
    print("Failed to connect to database with any host. Please ensure PostgreSQL is running and accessible.")
    print("\nAlternatively, you can run the SQL script manually:")
    print("psql -h localhost -U postgres -d fullstack_db -f add_title_column.sql")
    sys.exit(1)