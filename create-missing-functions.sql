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

-- Verify functions were created
SELECT 'Database functions created successfully' as status;

-- Test the functions (optional - you can run these to verify they work)
-- SELECT * FROM public.get_zone_statistics();
-- SELECT * FROM public.get_alert_statistics();