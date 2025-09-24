-- Check if all required tables exist
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public'
    AND table_name IN (
        'zone_entry_logs',
        'zone_occupancy', 
        'zone_alerts',
        'zone_access_sessions',
        'profiles',
        'zones',
        'visit_requests'
    )
ORDER BY table_name;

-- Check the structure of zone_entry_logs table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public'
    AND table_name = 'zone_entry_logs'
ORDER BY ordinal_position;

-- Check the structure of zone_access_sessions table  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public'
    AND table_name = 'zone_access_sessions'
ORDER BY ordinal_position;