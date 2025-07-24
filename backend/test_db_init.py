#!/usr/bin/env python3
"""
Test script to verify database initialization works correctly
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the my_app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'my_app'))

from database import init_database, check_database_connection
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_database_initialization():
    """Test database initialization including concurrent indexes"""
    try:
        logger.info("🧪 Testing database initialization...")
        
        # Test basic connection first
        logger.info("📡 Testing database connection...")
        if not await check_database_connection():
            logger.error("❌ Database connection failed")
            return False
        logger.info("✅ Database connection successful")
        
        # Test full initialization
        logger.info("🏗️  Testing database initialization...")
        await init_database()
        logger.info("✅ Database initialization completed successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database initialization test failed: {e}")
        return False

async def main():
    """Main test function"""
    logger.info("🚀 Starting database initialization test...")
    
    success = await test_database_initialization()
    
    if success:
        logger.info("🎉 All tests passed!")
        sys.exit(0)
    else:
        logger.error("💥 Tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())