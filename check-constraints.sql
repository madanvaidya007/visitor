-- Check if the required foreign key constraints exist
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
    AND tc.constraint_name IN (
        'visit_requests_visitor_id_fkey',
        'visit_requests_host_id_fkey', 
        'zone_entry_logs_visitor_id_fkey',
        'zone_access_sessions_visitor_id_fkey'
    )
ORDER BY tc.table_name, tc.constraint_name;

-- Also check what constraints actually exist on these tables
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM 
    information_schema.table_constraints AS tc 
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('visit_requests', 'zone_entry_logs', 'zone_access_sessions')
ORDER BY tc.table_name, tc.constraint_name;