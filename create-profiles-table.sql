-- Create enum types for the access management system
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('visitor', 'host', 'reception', 'admin', 'security');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_status') THEN
        CREATE TYPE public.visit_status AS ENUM ('pending', 'approved', 'rejected', 'checked_in', 'checked_out', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_type') THEN
        CREATE TYPE public.zone_type AS ENUM ('lobby', 'office', 'meeting_room', 'lab', 'server_room', 'parking', 'restricted');
    END IF;
END $$;

-- Create profiles table for user management
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

-- Create zones table for area management
CREATE TABLE IF NOT EXISTS public.zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  zone_type zone_type NOT NULL,
  max_capacity INTEGER,
  requires_escort BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create visit requests table
CREATE TABLE IF NOT EXISTS public.visit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES public.profiles(id),
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  purpose TEXT NOT NULL,
  visit_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status visit_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  rejection_reason TEXT,
  qr_code TEXT,
  qr_expires_at TIMESTAMP WITH TIME ZONE,
  documents_uploaded BOOLEAN DEFAULT false,
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

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for visit_requests table
CREATE POLICY "Users can view their own visit requests" ON public.visit_requests
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE id = visitor_id
        ) OR 
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE id = host_id
        )
    );

CREATE POLICY "Visitors can create visit requests" ON public.visit_requests
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE id = visitor_id
        )
    );

CREATE POLICY "Hosts can update visit requests" ON public.visit_requests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE id = host_id
        )
    );

-- Create policies for zones table
CREATE POLICY "Anyone can view zones" ON public.zones
    FOR SELECT USING (true);

-- Create policies for email_settings table
CREATE POLICY "Admins can manage email settings" ON public.email_settings
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE role = 'admin'
        )
    );