# ==============================================================================
# File: backend/my_app/database.py (Updated with sync engine for SQLAdmin)
# Description: Configures both async and sync database connections.
# ==============================================================================
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine

# Load environment variables
load_dotenv()

# Define the declarative base here to avoid circular imports
Base = declarative_base()

DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
DB_HOST = os.getenv('DB_HOST', 'db')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'fullstack_db')

SQLALCHEMY_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
SQLALCHEMY_SYNC_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Async engine for FastAPI
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=True,
    future=True
)

# Sync engine for SQLAdmin
sync_engine = create_engine(
    SQLALCHEMY_SYNC_DATABASE_URL,
    echo=True
)

# Use AsyncSession for the sessionmaker
SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)
