-- Check if email_settings table exists and has data
SELECT * FROM public.email_settings;

-- If no data exists, insert default settings
INSERT INTO public.email_settings (
    id,
    api_key,
    from_email,
    from_name,
    is_enabled
) VALUES (
    '1',
    'dummy-key', -- This won't be used since we're using SMTP directly
    'coreproject007@gmail.com',
    'Access Manager System',
    true
) ON CONFLICT (id) DO UPDATE SET
    is_enabled = true,
    from_email = 'coreproject007@gmail.com',
    from_name = 'Access Manager System';