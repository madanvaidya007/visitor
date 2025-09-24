-- Check if foreign key constraints exist
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
    AND (
        tc.table_name IN ('visit_requests', 'zone_entry_logs', 'profiles')
        OR ccu.table_name IN ('visit_requests', 'zone_entry_logs', 'profiles')
    )
ORDER BY tc.table_name, tc.constraint_name;

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'visit_requests', 'zone_entry_logs', 'zone_occupancy', 'zone_alerts')
ORDER BY table_name;

-- Check profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check zone_entry_logs table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'zone_entry_logs'
ORDER BY ordinal_position;