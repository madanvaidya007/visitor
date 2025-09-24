-- Check current zone_alerts table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'zone_alerts'
ORDER BY ordinal_position;

-- Check existing foreign key constraints on zone_alerts
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name = 'zone_alerts'
ORDER BY tc.constraint_name;

-- Add missing foreign key constraints with correct names if they don't exist
DO $$ 
BEGIN
    -- Add zone_alerts_zone_id_fkey constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'zone_alerts_zone_id_fkey' 
        AND table_name = 'zone_alerts' 
        AND table_schema = 'public'
    ) THEN
        -- Drop any existing constraint on zone_id column first
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'zone_alerts' 
            AND tc.table_schema = 'public'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'zone_id'
        ) THEN
            EXECUTE (
                SELECT 'ALTER TABLE public.zone_alerts DROP CONSTRAINT ' || tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'zone_alerts' 
                AND tc.table_schema = 'public'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'zone_id'
                LIMIT 1
            );
        END IF;
        
        ALTER TABLE public.zone_alerts 
        ADD CONSTRAINT zone_alerts_zone_id_fkey 
        FOREIGN KEY (zone_id) REFERENCES public.zones(id);
    END IF;

    -- Add zone_alerts_resolved_by_fkey constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'zone_alerts_resolved_by_fkey' 
        AND table_name = 'zone_alerts' 
        AND table_schema = 'public'
    ) THEN
        -- Drop any existing constraint on resolved_by column first
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'zone_alerts' 
            AND tc.table_schema = 'public'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'resolved_by'
        ) THEN
            EXECUTE (
                SELECT 'ALTER TABLE public.zone_alerts DROP CONSTRAINT ' || tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'zone_alerts' 
                AND tc.table_schema = 'public'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'resolved_by'
                LIMIT 1
            );
        END IF;
        
        ALTER TABLE public.zone_alerts 
        ADD CONSTRAINT zone_alerts_resolved_by_fkey 
        FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);
    END IF;
END $$;

-- Verify the constraints were created
SELECT 'zone_alerts foreign key constraints fixed' as status;