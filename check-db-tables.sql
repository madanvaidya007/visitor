-- Check what tables exist in the public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as profiles_exists;

-- Check if email_settings table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_settings'
) as email_settings_exists;

-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;