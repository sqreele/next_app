"""
Enhanced database configuration for PM System with async/sync support
"""
import os
import logging
from typing import AsyncGenerator
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import StaticPool
import asyncio

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the declarative base here to avoid circular imports
Base = declarative_base()

# Database Configuration from environment
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'pmdb')
DB_TEST_NAME = os.getenv('DB_TEST_NAME', 'pmdb_test')

# Environment settings
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
DEBUG = ENVIRONMENT == 'development'

# Construct database URLs
SQLALCHEMY_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
SQLALCHEMY_SYNC_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
SQLALCHEMY_TEST_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_TEST_NAME}"

# Connection pool settings
POOL_SIZE = int(os.getenv('DB_POOL_SIZE', '20'))
MAX_OVERFLOW = int(os.getenv('DB_MAX_OVERFLOW', '30'))
POOL_TIMEOUT = int(os.getenv('DB_POOL_TIMEOUT', '30'))
POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', '3600'))

# Async engine for FastAPI with optimized settings
async_engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=DEBUG,  # SQL logging in development only
    future=True,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_timeout=POOL_TIMEOUT,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=POOL_RECYCLE,  # Recreate connections every hour
    connect_args={
        "server_settings": {
            "application_name": "PM_System_Async",
            "jit": "off",  # Disable JIT for faster connection
        },
        "command_timeout": 60,
    }
)

# Sync engine for SQLAdmin and migrations
sync_engine = create_engine(
    SQLALCHEMY_SYNC_DATABASE_URL,
    echo=DEBUG,
    future=True,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_timeout=POOL_TIMEOUT,
    pool_pre_ping=True,
    pool_recycle=POOL_RECYCLE,
    connect_args={
        "application_name": "PM_System_Sync",
    }
)

# Test engine for testing
test_engine = create_async_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    echo=False,
    future=True,
    poolclass=StaticPool,
    connect_args={
        "server_settings": {
            "application_name": "PM_System_Test",
        }
    }
)

# Session factories
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# Sync session for SQLAdmin
SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# Test session factory
TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# Dependency for getting async database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function that yields async database sessions.
    Automatically handles session cleanup and error rollback.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

# Sync database session dependency for SQLAdmin
def get_sync_db():
    """Dependency function for sync database sessions"""
    db = SyncSessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Sync database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Test database dependency
async def get_test_db() -> AsyncGenerator[AsyncSession, None]:
    """Test database session dependency"""
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Test database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

# Database management functions
async def create_tables():
    """Create all database tables"""
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created successfully!")
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")
        raise

async def drop_tables():
    """Drop all database tables (use with caution!)"""
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("✅ Database tables dropped successfully!")
    except Exception as e:
        logger.error(f"❌ Error dropping tables: {e}")
        raise

def create_tables_sync():
    """Create tables using sync engine (for SQLAdmin)"""
    try:
        Base.metadata.create_all(bind=sync_engine)
        logger.info("✅ Sync database tables created successfully!")
    except Exception as e:
        logger.error(f"❌ Error creating sync tables: {e}")
        raise

async def create_test_tables():
    """Create test database tables"""
    try:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Test database tables created successfully!")
    except Exception as e:
        logger.error(f"❌ Error creating test tables: {e}")
        raise

async def drop_test_tables():
    """Drop test database tables"""
    try:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("✅ Test database tables dropped successfully!")
    except Exception as e:
        logger.error(f"❌ Error dropping test tables: {e}")
        raise

async def check_database_connection():
    """Check if database connection is working"""
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✅ Async database connection successful!")
        return True
    except Exception as e:
        logger.error(f"❌ Async database connection failed: {e}")
        return False

def check_sync_database_connection():
    """Check if sync database connection is working"""
    try:
        with sync_engine.begin() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Sync database connection successful!")
        return True
    except Exception as e:
        logger.error(f"❌ Sync database connection failed: {e}")
        return False

async def create_additional_indexes():
    """Create additional performance indexes"""
    # Regular indexes that can be created within transactions
    regular_indexes = [
        # Partial indexes for active records only
        "CREATE INDEX IF NOT EXISTS idx_active_machines ON machines (id, name) WHERE is_active = true;",
        "CREATE INDEX IF NOT EXISTS idx_active_pm_schedules ON pm_schedules (next_due, machine_id) WHERE is_active = true;",
        "CREATE INDEX IF NOT EXISTS idx_active_users ON users (id, username, role) WHERE is_active = true;",
        
        # Composite indexes for common query patterns
        "CREATE INDEX IF NOT EXISTS idx_overdue_pm ON pm_schedules (next_due, machine_id, user_id) WHERE is_active = true;",
        "CREATE INDEX IF NOT EXISTS idx_open_critical_issues ON issues (priority, machine_id, assigned_to_id) WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') AND priority = 'CRITICAL';",
        "CREATE INDEX IF NOT EXISTS idx_today_completed_pm ON pm_executions (completed_at, pm_schedule_id) WHERE status = 'COMPLETED';",
        
        # Dashboard performance indexes
        "CREATE INDEX IF NOT EXISTS idx_dashboard_overdue ON pm_schedules (next_due, is_active) WHERE is_active = true;",
        "CREATE INDEX IF NOT EXISTS idx_dashboard_issues ON issues (status, priority) WHERE status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS');",
        
        # File management indexes
        "CREATE INDEX IF NOT EXISTS idx_files_by_execution ON pm_files (pm_execution_id, image_type, uploaded_at) WHERE pm_execution_id IS NOT NULL;",
        "CREATE INDEX IF NOT EXISTS idx_files_by_issue ON pm_files (issue_id, file_type, uploaded_at) WHERE issue_id IS NOT NULL;",
        "CREATE INDEX IF NOT EXISTS idx_files_by_inspection ON pm_files (inspection_id, image_type, uploaded_at) WHERE inspection_id IS NOT NULL;",
    ]
    
    # Full-text search indexes that may benefit from concurrent creation
    concurrent_indexes = [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_machine_name_search ON machines USING gin(to_tsvector('english', name || ' ' || COALESCE(model, '') || ' ' || COALESCE(description, '')));",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_title_search ON issues USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_procedure_search ON procedures USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));",
    ]
    
    # Create regular indexes first within a transaction
    async with async_engine.begin() as conn:
        for index_sql in regular_indexes:
            index_name = 'unknown'
            try:
                if 'idx_' in index_sql:
                    index_name = index_sql.split('idx_')[1].split(' ')[0]
                
                await conn.execute(text(index_sql))
                logger.info(f"✅ Created regular index: {index_name}")
                
            except Exception as e:
                error_str = str(e).lower()
                if "already exists" in error_str:
                    logger.info(f"ℹ️  Index {index_name} already exists, skipping")
                else:
                    logger.warning(f"⚠️  Index creation warning for {index_name}: {e}")
    
    # Create concurrent indexes outside of transactions using autocommit
    for index_sql in concurrent_indexes:
        index_name = 'unknown'
        try:
            if 'idx_' in index_sql:
                index_name = index_sql.split('idx_')[1].split(' ')[0]
            
            # Use connection with autocommit for CONCURRENT operations
            async with async_engine.connect() as conn:
                # Set autocommit mode
                conn_with_options = await conn.execution_options(autocommit=True)
                await conn_with_options.execute(text(index_sql))
                logger.info(f"✅ Created concurrent index: {index_name}")
                
        except Exception as e:
            error_str = str(e).lower()
            if "already exists" in error_str:
                logger.info(f"ℹ️  Concurrent index {index_name} already exists, skipping")
            else:
                logger.warning(f"⚠️  Concurrent index creation warning for {index_name}: {e}")
                # If concurrent creation fails, try without CONCURRENTLY as fallback
                try:
                    fallback_sql = index_sql.replace("CONCURRENTLY ", "")
                    async with async_engine.begin() as conn:
                        await conn.execute(text(fallback_sql))
                        logger.info(f"✅ Created index (fallback): {index_name}")
                except Exception as fallback_e:
                    if "already exists" not in str(fallback_e).lower():
                        logger.warning(f"⚠️  Fallback index creation failed for {index_name}: {fallback_e}")

async def init_database():
    """Initialize database with tables and indexes"""
    try:
        # Check async connection
        if not await check_database_connection():
            raise Exception("Async database connection failed")
        
        # Check sync connection
        if not check_sync_database_connection():
            raise Exception("Sync database connection failed")
        
        # Create tables (async)
        await create_tables()
        
        # Create tables (sync) for SQLAdmin
        create_tables_sync()
        
        # Create additional indexes
        await create_additional_indexes()
        
        logger.info("🎉 Database initialization completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

# Health check function
async def health_check() -> dict:
    """Database health check for monitoring"""
    try:
        async with AsyncSessionLocal() as session:
            # Test basic query
            result = await session.execute(text("SELECT 1 as health"))
            health_result = result.scalar()
            
            # Test connection pool
            pool_status = {
                "size": async_engine.pool.size(),
                "checked_in": async_engine.pool.checkedin(),
                "checked_out": async_engine.pool.checkedout(),
                "overflow": async_engine.pool.overflow(),
                "invalid": async_engine.pool.invalidated(),
            }
            
            if health_result == 1:
                return {
                    "status": "healthy",
                    "database": "connected",
                    "environment": ENVIRONMENT,
                    "pool": pool_status,
                    "url": f"postgresql://{DB_HOST}:{DB_PORT}/{DB_NAME}"
                }
            else:
                return {
                    "status": "unhealthy",
                    "database": "query_failed",
                    "environment": ENVIRONMENT,
                    "pool": pool_status
                }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "connection_failed",
            "error": str(e),
            "environment": ENVIRONMENT
        }

# Connection event handlers for PostgreSQL optimization
@event.listens_for(sync_engine, "connect")
def set_postgresql_pragma(dbapi_connection, connection_record):
    """Set PostgreSQL connection parameters for better performance"""
    with dbapi_connection.cursor() as cursor:
        # Set timezone
        cursor.execute("SET timezone = 'UTC'")
        # Optimize for faster queries
        cursor.execute("SET statement_timeout = '30s'")
        cursor.execute("SET lock_timeout = '10s'")
        cursor.execute("SET idle_in_transaction_session_timeout = '5min'")

# Database monitoring functions
async def get_database_stats():
    """Get database statistics for monitoring"""
    try:
        async with AsyncSessionLocal() as session:
            # Table sizes query
            table_sizes_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
                    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
                    pg_total_relation_size(tablename::regclass) as total_bytes
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(tablename::regclass) DESC;
            """)
            
            result = await session.execute(table_sizes_query)
            table_sizes = [dict(row._mapping) for row in result]
            
            # Index usage query
            index_usage_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC
                LIMIT 20;
            """)
            
            result = await session.execute(index_usage_query)
            index_usage = [dict(row._mapping) for row in result]
            
            return {
                "table_sizes": table_sizes,
                "index_usage": index_usage,
                "timestamp": asyncio.get_event_loop().time()
            }
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        return {"error": str(e)}

# Cleanup function
async def close_db_connections():
    """Close all database connections"""
    try:
        await async_engine.dispose()
        sync_engine.dispose()
        if ENVIRONMENT == "test":
            await test_engine.dispose()
        logger.info("✅ Database connections closed successfully!")
    except Exception as e:
        logger.error(f"❌ Error closing database connections: {e}")

# Run database initialization if script is called directly
if __name__ == "__main__":
    async def main():
        await init_database()
    
    asyncio.run(main())
