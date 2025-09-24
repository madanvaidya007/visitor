-- Fix missing foreign key constraints
-- The application expects specific constraint names for relationships

-- First, check if the constraints already exist and drop them if they do
DO $$ 
BEGIN
    -- Drop existing constraints if they exist (to avoid conflicts)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'visit_requests_visitor_id_fkey' 
               AND table_name = 'visit_requests') THEN
        ALTER TABLE public.visit_requests DROP CONSTRAINT visit_requests_visitor_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'visit_requests_host_id_fkey' 
               AND table_name = 'visit_requests') THEN
        ALTER TABLE public.visit_requests DROP CONSTRAINT visit_requests_host_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'zone_entry_logs_visitor_id_fkey' 
               AND table_name = 'zone_entry_logs') THEN
        ALTER TABLE public.zone_entry_logs DROP CONSTRAINT zone_entry_logs_visitor_id_fkey;
    END IF;
END $$;

-- Add the foreign key constraints with the exact names the application expects
ALTER TABLE public.visit_requests 
ADD CONSTRAINT visit_requests_visitor_id_fkey 
FOREIGN KEY (visitor_id) REFERENCES public.profiles(id);

ALTER TABLE public.visit_requests 
ADD CONSTRAINT visit_requests_host_id_fkey 
FOREIGN KEY (host_id) REFERENCES public.profiles(id);

ALTER TABLE public.zone_entry_logs 
ADD CONSTRAINT zone_entry_logs_visitor_id_fkey 
FOREIGN KEY (visitor_id) REFERENCES public.profiles(id);

-- Verify the constraints were created
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.constraint_name IN (
        'visit_requests_visitor_id_fkey',
        'visit_requests_host_id_fkey', 
        'zone_entry_logs_visitor_id_fkey'
    )
ORDER BY tc.table_name, tc.constraint_name;