-- =====================================================
-- MISSING TABLES RESTORATION SCRIPT
-- =====================================================
-- Execute this in Supabase SQL Editor to restore missing tables

-- Create additional enum types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_action') THEN
        CREATE TYPE public.zone_action AS ENUM ('entry', 'exit', 'emergency_exit', 'forced_entry');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_alert_type') THEN
        CREATE TYPE public.zone_alert_type AS ENUM ('capacity_exceeded', 'unauthorized_access', 'emergency', 'maintenance');
    END IF;
END $$;

-- Email Settings Table
CREATE TABLE IF NOT EXISTS public.email_settings (
    id TEXT PRIMARY KEY DEFAULT '1',
    api_key TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT 'Visitor Management System',
    reply_to TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email Logs Table for tracking sent emails
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
    
    -- Optional foreign key relationships
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    visit_request_id UUID REFERENCES public.visit_requests(id) ON DELETE SET NULL,
    
    -- Metadata for additional context
    metadata JSONB DEFAULT '{}'::jsonb
);

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

-- Zone access sessions for tracking active visits
CREATE TABLE IF NOT EXISTS public.zone_access_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_access_id UUID NOT NULL REFERENCES public.zone_access(id),
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  visitor_id UUID NOT NULL REFERENCES public.profiles(id),
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id),
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  escort_id UUID REFERENCES public.profiles(id),
  session_metadata JSONB
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

-- Enable Row Level Security
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_entry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_logs ENABLE ROW LEVEL SECURITY;

-- Create basic policies for all tables (Admin access)
CREATE POLICY "Admin can manage email settings" ON public.email_settings FOR ALL USING (true);
CREATE POLICY "Admin can view all email logs" ON public.email_logs FOR SELECT USING (true);
CREATE POLICY "All authenticated users can view zone occupancy" ON public.zone_occupancy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Security can update occupancy" ON public.zone_occupancy FOR ALL USING (true);
CREATE POLICY "Security can view entry logs" ON public.zone_entry_logs FOR SELECT USING (true);
CREATE POLICY "Security can insert entry logs" ON public.zone_entry_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Security can view zone alerts" ON public.zone_alerts FOR SELECT USING (true);
CREATE POLICY "Security can manage zone alerts" ON public.zone_alerts FOR ALL USING (true);
CREATE POLICY "Security can view access sessions" ON public.zone_access_sessions FOR SELECT USING (true);
CREATE POLICY "Security can manage access sessions" ON public.zone_access_sessions FOR ALL USING (true);
CREATE POLICY "Security can view face recognition logs" ON public.face_recognition_logs FOR SELECT USING (true);
CREATE POLICY "System can insert face recognition logs" ON public.face_recognition_logs FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_zone_occupancy_zone_id ON public.zone_occupancy(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_entry_logs_zone_id ON public.zone_entry_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_entry_logs_visitor_id ON public.zone_entry_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_zone_alerts_zone_id ON public.zone_alerts(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_alerts_active ON public.zone_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_zone_access_sessions_zone_id ON public.zone_access_sessions(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_access_sessions_visitor_id ON public.zone_access_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_camera_id ON public.face_recognition_logs(camera_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_timestamp ON public.face_recognition_logs(timestamp);

-- Insert default email settings
INSERT INTO public.email_settings (id, api_key, from_email, from_name, is_enabled)
SELECT '1', 'your-api-key-here', 'noreply@company.com', 'Visitor Management System', false
WHERE NOT EXISTS (SELECT 1 FROM public.email_settings WHERE id = '1');

-- Initialize zone occupancy for existing zones
INSERT INTO public.zone_occupancy (zone_id, current_count, max_capacity)
SELECT z.id, 0, z.max_capacity
FROM public.zones z
WHERE NOT EXISTS (
    SELECT 1 FROM public.zone_occupancy zo WHERE zo.zone_id = z.id
);