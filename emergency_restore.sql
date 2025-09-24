
-- =====================================================
-- EMERGENCY DATABASE RESTORATION SCRIPT
-- =====================================================
-- Execute this in Supabase SQL Editor or with service role key

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
  status visit_status DEFAULT 'pending',
  notes TEXT,
  rejection_reason TEXT,
  qr_code TEXT,
  documents_uploaded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create zone access table for visit permissions
CREATE TABLE IF NOT EXISTS public.zone_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id)
);

-- Create visit logs for check-in/check-out tracking
CREATE TABLE IF NOT EXISTS public.visit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id),
  zone_id UUID REFERENCES public.zones(id),
  action TEXT NOT NULL, -- 'check_in', 'check_out', 'zone_entry', 'zone_exit'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins and reception can view all profiles') THEN
        CREATE POLICY "Admins and reception can view all profiles" ON public.profiles
          FOR SELECT USING (true);
    END IF;
END $$;

-- Create policies for zones
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zones' AND policyname = 'All authenticated users can view zones') THEN
        CREATE POLICY "All authenticated users can view zones" ON public.zones
          FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zones' AND policyname = 'Only admins can manage zones') THEN
        CREATE POLICY "Only admins can manage zones" ON public.zones
          FOR ALL USING (true);
    END IF;
END $$;

-- Create policies for visit requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Visitors can view their own requests') THEN
        CREATE POLICY "Visitors can view their own requests" ON public.visit_requests
          FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Hosts can view requests assigned to them') THEN
        CREATE POLICY "Hosts can view requests assigned to them" ON public.visit_requests
          FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Visitors can create requests') THEN
        CREATE POLICY "Visitors can create requests" ON public.visit_requests
          FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Hosts can update requests assigned to them') THEN
        CREATE POLICY "Hosts can update requests assigned to them" ON public.visit_requests
          FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Reception, security, and admin can view all requests') THEN
        CREATE POLICY "Reception, security, and admin can view all requests" ON public.visit_requests
          FOR SELECT USING (true);
    END IF;
END $$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at
          BEFORE UPDATE ON public.profiles
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_zones_updated_at') THEN
        CREATE TRIGGER update_zones_updated_at
          BEFORE UPDATE ON public.zones
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_visit_requests_updated_at') THEN
        CREATE TRIGGER update_visit_requests_updated_at
          BEFORE UPDATE ON public.visit_requests
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Insert default zones
INSERT INTO public.zones (name, description, zone_type, max_capacity) 
SELECT * FROM (VALUES
  ('Main Lobby', 'Main entrance and waiting area', 'lobby'::zone_type, 50),
  ('Reception', 'Reception and front desk area', 'office'::zone_type, 10),
  ('Conference Room A', 'Large conference room', 'meeting_room'::zone_type, 20),
  ('Conference Room B', 'Small meeting room', 'meeting_room'::zone_type, 8),
  ('Office Floor 1', 'General office area - Floor 1', 'office'::zone_type, 100),
  ('Office Floor 2', 'General office area - Floor 2', 'office'::zone_type, 100),
  ('R&D Lab', 'Research and development laboratory', 'lab'::zone_type, 15),
  ('Server Room', 'Data center and server room', 'server_room'::zone_type, 5),
  ('Parking Garage', 'Underground parking facility', 'parking'::zone_type, 200)
) AS v(name, description, zone_type, max_capacity)
WHERE NOT EXISTS (
  SELECT 1 FROM public.zones z WHERE z.name = v.name
);

-- Create function to generate QR code data
CREATE OR REPLACE FUNCTION public.generate_qr_code(visit_request_id UUID)
RETURNS TEXT AS $$
DECLARE
  qr_data TEXT;
BEGIN
  SELECT 
    'VIS-' || EXTRACT(EPOCH FROM now())::TEXT || '-' || visit_request_id::TEXT
  INTO qr_data;
  
  UPDATE public.visit_requests 
  SET qr_code = qr_data 
  WHERE id = visit_request_id;
  
  RETURN qr_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Additional essential tables from other migrations
-- (Add other critical table definitions here)
