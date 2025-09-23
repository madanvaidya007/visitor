-- Add missing get_alert_statistics function
-- This migration adds the alert statistics function that was missing from the schema

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

-- Add visitor_id column to zone_alerts if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'zone_alerts' 
        AND column_name = 'visitor_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.zone_alerts 
        ADD COLUMN visitor_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;