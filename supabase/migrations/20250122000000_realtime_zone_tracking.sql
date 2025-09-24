-- Real-time Zone Access Management Migration
-- This migration adds real-time tracking capabilities for zone access management

-- Create enum for zone entry/exit actions
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_action') THEN
        CREATE TYPE public.zone_action AS ENUM ('entry', 'exit', 'emergency_exit', 'forced_entry');
    END IF;
END $$;

-- Create enum for zone alert types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_alert_type') THEN
        CREATE TYPE public.zone_alert_type AS ENUM ('capacity_exceeded', 'unauthorized_access', 'emergency', 'maintenance');
    END IF;
END $$;

-- Create zone occupancy tracking table for real-time data
CREATE TABLE IF NOT EXISTS public.zone_occupancy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  current_count INTEGER NOT NULL DEFAULT 0,
  max_capacity INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  UNIQUE(zone_id)
);

-- Create zone entry/exit logs for detailed tracking
CREATE TABLE IF NOT EXISTS public.zone_entry_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  visitor_id UUID NOT NULL REFERENCES public.profiles(id),
  visit_request_id UUID REFERENCES public.visit_requests(id),
  action zone_action NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID REFERENCES public.profiles(id),
  device_id TEXT, -- For tracking which scanner/device was used
  location_details JSONB, -- Additional location metadata
  notes TEXT
);

-- Create zone alerts table for real-time notifications
CREATE TABLE IF NOT EXISTS public.zone_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  visitor_id UUID REFERENCES public.profiles(id), -- Optional visitor reference for visitor-specific alerts
  alert_type zone_alert_type NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  metadata JSONB -- Additional alert data
);

-- Create zone access sessions for tracking active visits
CREATE TABLE IF NOT EXISTS public.zone_access_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_access_id UUID NOT NULL REFERENCES public.zone_access(id),
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  visitor_id UUID NOT NULL REFERENCES public.profiles(id),
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id),
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  escort_id UUID REFERENCES public.profiles(id), -- For zones requiring escort
  session_metadata JSONB
);

-- Enable Row Level Security
ALTER TABLE public.zone_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_entry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_access_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for zone occupancy
CREATE POLICY "All authenticated users can view zone occupancy" ON public.zone_occupancy
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Security, reception, and admin can update occupancy" ON public.zone_occupancy
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('security', 'reception', 'admin')
    )
  );

-- Create policies for zone entry logs
CREATE POLICY "Security, reception, and admin can view all entry logs" ON public.zone_entry_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('security', 'reception', 'admin')
    )
  );

CREATE POLICY "Visitors can view their own entry logs" ON public.zone_entry_logs
  FOR SELECT USING (
    visitor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can view entry logs for their visitors" ON public.zone_entry_logs
  FOR SELECT USING (
    visit_request_id IN (
      SELECT id FROM public.visit_requests vr
      WHERE vr.host_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create policies for zone alerts
CREATE POLICY "Security, reception, and admin can manage alerts" ON public.zone_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('security', 'reception', 'admin')
    )
  );

CREATE POLICY "All authenticated users can view active alerts" ON public.zone_alerts
  FOR SELECT TO authenticated USING (is_active = true);

-- Create policies for zone access sessions
CREATE POLICY "Security, reception, and admin can view all sessions" ON public.zone_access_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('security', 'reception', 'admin')
    )
  );

CREATE POLICY "Visitors can view their own sessions" ON public.zone_access_sessions
  FOR SELECT USING (
    visitor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can view sessions for their visitors" ON public.zone_access_sessions
  FOR SELECT USING (
    visit_request_id IN (
      SELECT id FROM public.visit_requests vr
      WHERE vr.host_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to update zone occupancy
CREATE OR REPLACE FUNCTION public.update_zone_occupancy(
  p_zone_id UUID,
  p_action zone_action,
  p_visitor_id UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_occupancy INTEGER;
  max_cap INTEGER;
BEGIN
  -- Get current occupancy and max capacity
  SELECT zo.current_count, z.max_capacity
  INTO current_occupancy, max_cap
  FROM public.zone_occupancy zo
  JOIN public.zones z ON z.id = zo.zone_id
  WHERE zo.zone_id = p_zone_id;
  
  -- If no occupancy record exists, create one
  IF current_occupancy IS NULL THEN
    SELECT max_capacity INTO max_cap FROM public.zones WHERE id = p_zone_id;
    INSERT INTO public.zone_occupancy (zone_id, current_count, max_capacity, updated_by)
    VALUES (p_zone_id, 0, max_cap, p_updated_by);
    current_occupancy := 0;
  END IF;
  
  -- Update occupancy based on action
  IF p_action = 'entry' THEN
    current_occupancy := current_occupancy + 1;
  ELSIF p_action IN ('exit', 'emergency_exit') THEN
    current_occupancy := GREATEST(0, current_occupancy - 1);
  END IF;
  
  -- Update the occupancy record
  UPDATE public.zone_occupancy
  SET 
    current_count = current_occupancy,
    last_updated = now(),
    updated_by = p_updated_by
  WHERE zone_id = p_zone_id;
  
  -- Check for capacity alerts
  IF max_cap IS NOT NULL AND current_occupancy > max_cap THEN
    INSERT INTO public.zone_alerts (zone_id, alert_type, severity, title, message, metadata)
    VALUES (
      p_zone_id,
      'capacity_exceeded',
      3,
      'Zone Capacity Exceeded',
      'Zone occupancy (' || current_occupancy || ') exceeds maximum capacity (' || max_cap || ')',
      jsonb_build_object('current_count', current_occupancy, 'max_capacity', max_cap, 'visitor_id', p_visitor_id)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to log zone entry/exit
CREATE OR REPLACE FUNCTION public.log_zone_access(
  p_zone_id UUID,
  p_visitor_id UUID,
  p_visit_request_id UUID,
  p_action zone_action,
  p_scanned_by UUID DEFAULT NULL,
  p_device_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  session_id UUID;
BEGIN
  -- Insert entry log
  INSERT INTO public.zone_entry_logs (
    zone_id, visitor_id, visit_request_id, action, scanned_by, device_id, notes
  )
  VALUES (
    p_zone_id, p_visitor_id, p_visit_request_id, p_action, p_scanned_by, p_device_id, p_notes
  )
  RETURNING id INTO log_id;
  
  -- Update zone occupancy
  PERFORM public.update_zone_occupancy(p_zone_id, p_action, p_visitor_id, p_scanned_by);
  
  -- Handle session management
  IF p_action = 'entry' THEN
    -- Create or update access session
    INSERT INTO public.zone_access_sessions (
      zone_access_id, zone_id, visitor_id, visit_request_id, entered_at
    )
    SELECT 
      za.id, p_zone_id, p_visitor_id, p_visit_request_id, now()
    FROM public.zone_access za
    WHERE za.zone_id = p_zone_id AND za.visit_request_id = p_visit_request_id
    LIMIT 1
    RETURNING id INTO session_id;
    
  ELSIF p_action IN ('exit', 'emergency_exit') THEN
    -- Close active session
    UPDATE public.zone_access_sessions
    SET 
      exited_at = now(),
      is_active = false
    WHERE 
      zone_id = p_zone_id 
      AND visitor_id = p_visitor_id 
      AND visit_request_id = p_visit_request_id
      AND is_active = true;
  END IF;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get real-time zone statistics
CREATE OR REPLACE FUNCTION public.get_zone_statistics()
RETURNS TABLE (
  total_zones INTEGER,
  active_zones INTEGER,
  restricted_zones INTEGER,
  current_visitors INTEGER,
  zones_at_capacity INTEGER,
  active_alerts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.zones) as total_zones,
    (SELECT COUNT(*)::INTEGER FROM public.zones WHERE is_active = true) as active_zones,
    (SELECT COUNT(*)::INTEGER FROM public.zones WHERE zone_type IN ('restricted', 'server_room')) as restricted_zones,
    (SELECT COALESCE(SUM(current_count), 0)::INTEGER FROM public.zone_occupancy) as current_visitors,
    (SELECT COUNT(*)::INTEGER FROM public.zone_occupancy zo 
     JOIN public.zones z ON z.id = zo.zone_id 
     WHERE zo.current_count >= z.max_capacity AND z.max_capacity IS NOT NULL) as zones_at_capacity,
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts WHERE is_active = true) as active_alerts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to resolve zone alert
CREATE OR REPLACE FUNCTION public.resolve_zone_alert(
  p_alert_id UUID,
  p_resolved_by UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.zone_alerts
  SET 
    is_active = false,
    resolved_at = now(),
    resolved_by = p_resolved_by
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get alert statistics
CREATE OR REPLACE FUNCTION public.get_alert_statistics()
RETURNS TABLE (
  total_alerts INTEGER,
  active_alerts INTEGER,
  critical_alerts INTEGER,
  high_alerts INTEGER,
  medium_alerts INTEGER,
  low_alerts INTEGER,
  resolved_today INTEGER,
  avg_resolution_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts) as total_alerts,
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts WHERE is_active = true) as active_alerts,
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts WHERE is_active = true AND severity = 4) as critical_alerts,
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts WHERE is_active = true AND severity = 3) as high_alerts,
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts WHERE is_active = true AND severity = 2) as medium_alerts,
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts WHERE is_active = true AND severity = 1) as low_alerts,
    (SELECT COUNT(*)::INTEGER FROM public.zone_alerts 
     WHERE resolved_at IS NOT NULL 
     AND DATE(resolved_at) = CURRENT_DATE) as resolved_today,
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 0)::NUMERIC(10,2)
     FROM public.zone_alerts 
     WHERE resolved_at IS NOT NULL) as avg_resolution_time_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Initialize zone occupancy for existing zones
INSERT INTO public.zone_occupancy (zone_id, current_count, max_capacity)
SELECT 
  id,
  0, -- Start with 0 occupancy
  max_capacity
FROM public.zones
ON CONFLICT (zone_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_zone_entry_logs_zone_timestamp ON public.zone_entry_logs(zone_id, timestamp DESC);
CREATE INDEX idx_zone_entry_logs_visitor ON public.zone_entry_logs(visitor_id, timestamp DESC);
CREATE INDEX idx_zone_access_sessions_active ON public.zone_access_sessions(zone_id, is_active) WHERE is_active = true;
CREATE INDEX idx_zone_alerts_active ON public.zone_alerts(zone_id, is_active) WHERE is_active = true;
CREATE INDEX idx_zone_occupancy_zone ON public.zone_occupancy(zone_id);

-- Enable real-time for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.zone_occupancy;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zone_entry_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zone_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zone_access_sessions;

-- Note: Triggers and sample data removed to avoid conflicts with existing schema