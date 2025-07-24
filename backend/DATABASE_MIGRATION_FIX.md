# Database Migration Fix for Missing `title` Column

## Problem Description

The application is failing with the following error:
```
psycopg2.errors.UndefinedColumn: column work_orders.title does not exist
```

This error occurs because the SQLAlchemy model defines a `title` column in the `WorkOrder` model, but this column doesn't exist in the actual database table. The migration that adds this column exists but hasn't been applied to the database.

## Root Cause

The migration file `2a3b4c5d6e7f_add_enhanced_work_order_fields.py` exists and includes the `title` column addition, but it hasn't been applied to the database. This creates a mismatch between the model definition and the actual database schema.

## Solutions

### Solution 1: Run Migration via Docker (Recommended)

If you're using Docker, run the migration from within the backend container:

```bash
# Enter the backend container
docker exec -it <backend_container_name> bash

# Run the migration
cd /app
alembic upgrade head
```

### Solution 2: Run Migration via Docker Compose

```bash
# From the project root directory
docker-compose exec backend alembic upgrade head
```

### Solution 3: Manual SQL Script

If you can't run Alembic migrations, execute the SQL script directly on the database:

```bash
# Connect to PostgreSQL and run the SQL script
docker exec -it <postgres_container_name> psql -U postgres -d fullstack_db -f /path/to/add_title_column.sql
```

Or copy the SQL script to the container first:
```bash
docker cp add_title_column.sql <postgres_container_name>:/tmp/
docker exec -it <postgres_container_name> psql -U postgres -d fullstack_db -f /tmp/add_title_column.sql
```

### Solution 4: Direct Database Connection

If you have direct access to the PostgreSQL database:

```bash
psql -h <database_host> -U postgres -d fullstack_db -f add_title_column.sql
```

## Files Created

1. **`add_title_column.sql`** - SQL script that safely adds all missing columns
2. **`run_migration_localhost.py`** - Python script to run migrations (for local development)
3. **`DATABASE_MIGRATION_FIX.md`** - This documentation

## What the Migration Adds

The migration adds the following columns to the `work_orders` table:

- `title` VARCHAR(100) - Job title
- `estimated_duration` INTEGER - Duration in minutes  
- `safety_requirements` TEXT - Safety requirements and PPE
- `required_tools` TEXT - Required tools and equipment
- `required_parts` TEXT - Required parts and materials
- `special_instructions` TEXT - Special instructions and notes
- `cost_estimate` FLOAT - Estimated cost

It also makes the following columns nullable:
- `machine_id` - For general work orders not tied to specific machines
- `priority` - For general work orders without priority

## Verification

After running the migration, verify it worked by checking the database schema:

```sql
-- Check if the title column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'work_orders' 
AND column_name = 'title';

-- Check all columns in work_orders table
\d work_orders
```

## Prevention

To prevent this issue in the future:

1. Always run migrations after pulling code changes
2. Use `alembic current` to check migration status
3. Use `alembic history` to see available migrations
4. Set up automated migration checks in your deployment process

## Quick Fix Command

For Docker environments, the quickest fix is usually:

```bash
docker-compose exec backend alembic upgrade head
```

This will apply all pending migrations to bring the database schema up to date with the model definitions.