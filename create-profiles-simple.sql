-- Create enum types if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('visitor', 'host', 'reception', 'admin', 'security');
    END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  id_proof_url TEXT,
  photo_url TEXT,
  role user_role NOT NULL DEFAULT 'visitor',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email settings table
CREATE TABLE IF NOT EXISTS public.email_settings (
    id TEXT PRIMARY KEY DEFAULT '1',
    api_key TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT 'Visitor Management System',
    reply_to TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default email settings
INSERT INTO public.email_settings (
    id,
    api_key,
    from_email,
    from_name,
    is_enabled
) VALUES (
    '1',
    'dummy-key',
    'coreproject007@gmail.com',
    'Access Manager System',
    true
) ON CONFLICT (id) DO UPDATE SET
    is_enabled = true,
    from_email = 'coreproject007@gmail.com',
    from_name = 'Access Manager System';

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view email settings" ON public.email_settings
    FOR SELECT USING (true);