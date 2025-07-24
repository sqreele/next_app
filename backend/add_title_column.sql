-- Add title column to work_orders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE work_orders ADD COLUMN title VARCHAR(100);
        CREATE INDEX ix_work_orders_title ON work_orders (title);
        RAISE NOTICE 'Added title column to work_orders table';
    ELSE
        RAISE NOTICE 'Title column already exists in work_orders table';
    END IF;
END $$;

-- Add estimated_duration column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'estimated_duration'
    ) THEN
        ALTER TABLE work_orders ADD COLUMN estimated_duration INTEGER;
        CREATE INDEX ix_work_orders_estimated_duration ON work_orders (estimated_duration);
        RAISE NOTICE 'Added estimated_duration column to work_orders table';
    ELSE
        RAISE NOTICE 'Estimated_duration column already exists in work_orders table';
    END IF;
END $$;

-- Add other enhanced fields if they don't exist
DO $$
BEGIN
    -- safety_requirements
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'safety_requirements'
    ) THEN
        ALTER TABLE work_orders ADD COLUMN safety_requirements TEXT;
        RAISE NOTICE 'Added safety_requirements column to work_orders table';
    END IF;
    
    -- required_tools
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'required_tools'
    ) THEN
        ALTER TABLE work_orders ADD COLUMN required_tools TEXT;
        RAISE NOTICE 'Added required_tools column to work_orders table';
    END IF;
    
    -- required_parts
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'required_parts'
    ) THEN
        ALTER TABLE work_orders ADD COLUMN required_parts TEXT;
        RAISE NOTICE 'Added required_parts column to work_orders table';
    END IF;
    
    -- special_instructions
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'special_instructions'
    ) THEN
        ALTER TABLE work_orders ADD COLUMN special_instructions TEXT;
        RAISE NOTICE 'Added special_instructions column to work_orders table';
    END IF;
    
    -- cost_estimate
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'cost_estimate'
    ) THEN
        ALTER TABLE work_orders ADD COLUMN cost_estimate FLOAT;
        RAISE NOTICE 'Added cost_estimate column to work_orders table';
    END IF;
END $$;

-- Make machine_id and priority nullable if they aren't already
DO $$
BEGIN
    -- Check if machine_id is nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'machine_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE work_orders ALTER COLUMN machine_id DROP NOT NULL;
        RAISE NOTICE 'Made machine_id column nullable in work_orders table';
    END IF;
    
    -- Check if priority is nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_orders' 
        AND column_name = 'priority'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE work_orders ALTER COLUMN priority DROP NOT NULL;
        RAISE NOTICE 'Made priority column nullable in work_orders table';
    END IF;
END $$;