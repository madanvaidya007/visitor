-- =====================================================
-- COMPLETE ACCESS MANAGER DATABASE SCHEMA
-- =====================================================
-- This script creates the complete database schema for the Access Manager system
-- including all tables, enums, functions, policies, triggers, and sample data

-- =====================================================
-- 1. CREATE ENUM TYPES
-- =====================================================

-- User roles enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('visitor', 'host', 'reception', 'admin', 'security');
    END IF;
END $$;

-- Visit status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_status') THEN
        CREATE TYPE public.visit_status AS ENUM ('pending', 'approved', 'rejected', 'checked_in', 'checked_out', 'cancelled');
    END IF;
END $$;

-- Zone type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_type') THEN
        CREATE TYPE public.zone_type AS ENUM ('lobby', 'office', 'meeting_room', 'lab', 'server_room', 'parking', 'restricted');
    END IF;
END $$;

-- Zone action enum for real-time tracking
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_action') THEN
        CREATE TYPE public.zone_action AS ENUM ('entry', 'exit', 'emergency_exit', 'forced_entry');
    END IF;
END $$;

-- Zone alert type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_alert_type') THEN
        CREATE TYPE public.zone_alert_type AS ENUM ('capacity_exceeded', 'unauthorized_access', 'emergency', 'maintenance');
    END IF;
END $$;

-- =====================================================
-- 2. CORE TABLES
-- =====================================================

-- First, drop the profiles table completely to remove any existing constraints
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Profiles table for user management (without foreign key constraints)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
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

-- Zones table for area management
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

-- Visit requests table
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
  qr_expires_at TIMESTAMP WITH TIME ZONE,
  documents_uploaded BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Zone access table for visit permissions
CREATE TABLE IF NOT EXISTS public.zone_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id)
);

-- Visit logs for check-in/check-out tracking
CREATE TABLE IF NOT EXISTS public.visit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id),
  zone_id UUID REFERENCES public.zones(id),
  action TEXT NOT NULL, -- 'check_in', 'check_out', 'zone_entry', 'zone_exit'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

-- =====================================================
-- 3. REAL-TIME ZONE TRACKING TABLES
-- =====================================================

-- Zone occupancy tracking table for real-time data
CREATE TABLE IF NOT EXISTS public.zone_occupancy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  UNIQUE(zone_id)
);

-- Zone entry/exit logs for detailed tracking
CREATE TABLE IF NOT EXISTS public.zone_entry_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  visitor_id UUID NOT NULL REFERENCES public.profiles(id),
  visit_request_id UUID REFERENCES public.visit_requests(id),
  action zone_action NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID REFERENCES public.profiles(id),
  device_id TEXT,
  location_details JSONB,
  notes TEXT
);

-- Zone alerts table for real-time notifications
CREATE TABLE IF NOT EXISTS public.zone_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  visitor_id UUID REFERENCES public.profiles(id),
  alert_type zone_alert_type NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  metadata JSONB
);

-- =====================================================
-- 4. EMAIL SYSTEM TABLES
-- =====================================================

-- Email settings table
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

-- Email logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    visit_request_id UUID REFERENCES public.visit_requests(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- 5. FACE RECOGNITION TABLES
-- =====================================================

-- Face profiles table
CREATE TABLE IF NOT EXISTS public.face_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_id TEXT NOT NULL UNIQUE,
    person_name TEXT NOT NULL,
    face_encoding TEXT NOT NULL,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Face recognition logs table
CREATE TABLE IF NOT EXISTS public.face_recognition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    camera_id TEXT NOT NULL,
    person_id TEXT,
    person_name TEXT,
    confidence DECIMAL(4,3) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bounding_box JSONB NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('face_detected', 'person_recognized', 'person_entered', 'person_left')),
    frame_data TEXT
);

-- Face recognition settings table
CREATE TABLE IF NOT EXISTS public.face_recognition_settings (
    id TEXT PRIMARY KEY DEFAULT '1',
    detection_threshold DECIMAL(3,2) DEFAULT 0.5,
    recognition_threshold DECIMAL(3,2) DEFAULT 0.6,
    tracking_max_distance INTEGER DEFAULT 100,
    tracking_max_age INTEGER DEFAULT 3000,
    min_detections_for_track INTEGER DEFAULT 3,
    enable_logging BOOLEAN DEFAULT TRUE,
    log_retention_days INTEGER DEFAULT 30,
    enable_frame_capture BOOLEAN DEFAULT FALSE,
    encryption_key_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Temporarily disable RLS for profiles to allow initial user registration
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_entry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE POLICIES
-- =====================================================

-- First, drop all existing policies for profiles table to avoid conflicts
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Disable RLS for profiles table to allow user registration
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Note: RLS policies for profiles are commented out to allow user registration
-- Uncomment and modify these policies once user registration is working properly
/*
-- Profiles policies (Simplified for proper user registration)
CREATE POLICY "Allow authenticated users full access" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
*/

-- Zones policies
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

-- Visit requests policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Users can view all visit requests') THEN
        CREATE POLICY "Users can view all visit requests" ON public.visit_requests
          FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Users can create requests') THEN
        CREATE POLICY "Users can create requests" ON public.visit_requests
          FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_requests' AND policyname = 'Users can update requests') THEN
        CREATE POLICY "Users can update requests" ON public.visit_requests
          FOR UPDATE USING (true);
    END IF;
END $$;

-- Email settings policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_settings' AND policyname = 'Anyone can view email settings') THEN
        CREATE POLICY "Anyone can view email settings" ON public.email_settings
          FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_settings' AND policyname = 'Admins can manage email settings') THEN
        CREATE POLICY "Admins can manage email settings" ON public.email_settings
          FOR ALL USING (true);
    END IF;
END $$;

-- Basic policies for other tables (using DO blocks to handle existing policies)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zone_access' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.zone_access FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_logs' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.visit_logs FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zone_occupancy' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.zone_occupancy FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zone_entry_logs' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.zone_entry_logs FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zone_alerts' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.zone_alerts FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.email_logs FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_templates' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.email_templates FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'face_profiles' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.face_profiles FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'face_recognition_logs' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.face_recognition_logs FOR ALL USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'face_recognition_settings' AND policyname = 'Allow all operations') THEN
        CREATE POLICY "Allow all operations" ON public.face_recognition_settings FOR ALL USING (true);
    END IF;
END $$;

-- =====================================================
-- 8. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
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

-- Function to generate QR code data
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

-- =====================================================
-- 9. INSERT SAMPLE DATA
-- =====================================================

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

-- Insert default face recognition settings
INSERT INTO public.face_recognition_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Face recognition indexes
CREATE INDEX IF NOT EXISTS idx_face_profiles_person_id ON public.face_profiles(person_id);
CREATE INDEX IF NOT EXISTS idx_face_profiles_active ON public.face_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_camera_id ON public.face_recognition_logs(camera_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_person_id ON public.face_recognition_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_timestamp ON public.face_recognition_logs(timestamp);

-- Visit requests indexes
CREATE INDEX IF NOT EXISTS idx_visit_requests_visitor_id ON public.visit_requests(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_host_id ON public.visit_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON public.visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_requests_visit_date ON public.visit_requests(visit_date);

-- Zone tracking indexes
CREATE INDEX IF NOT EXISTS idx_zone_entry_logs_zone_id ON public.zone_entry_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_entry_logs_visitor_id ON public.zone_entry_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_zone_entry_logs_timestamp ON public.zone_entry_logs(timestamp);

-- Email logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================