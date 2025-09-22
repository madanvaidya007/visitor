import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ZoneOccupancy {
  id: string;
  zone_id: string;
  current_count: number;
  max_capacity: number | null;
  last_updated: string;
  updated_by: string | null;
}

export interface ZoneEntryLog {
  id: string;
  zone_id: string;
  visitor_id: string;
  visit_request_id: string | null;
  action: 'entry' | 'exit' | 'emergency_exit' | 'forced_entry';
  timestamp: string;
  scanned_by: string | null;
  device_id: string | null;
  location_details: any;
  notes: string | null;
  visitor: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
  };
  zone: {
    id: string;
    name: string;
    zone_type: string;
  };
}

export interface ZoneAlert {
  id: string;
  zone_id: string;
  alert_type: 'capacity_exceeded' | 'unauthorized_access' | 'emergency' | 'maintenance';
  severity: number;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: any;
  zone: {
    id: string;
    name: string;
    zone_type: string;
  };
}

export interface ZoneAccessSession {
  id: string;
  zone_access_id: string;
  zone_id: string;
  visitor_id: string;
  visit_request_id: string;
  entered_at: string;
  exited_at: string | null;
  is_active: boolean;
  escort_id: string | null;
  session_metadata: any;
  visitor: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
  };
  zone: {
    id: string;
    name: string;
    zone_type: string;
  };
}

export interface ZoneStatistics {
  total_zones: number;
  active_zones: number;
  restricted_zones: number;
  current_visitors: number;
  zones_at_capacity: number;
  active_alerts: number;
}

export function useRealtimeZones() {
  const [zoneOccupancy, setZoneOccupancy] = useState<ZoneOccupancy[]>([]);
  const [entryLogs, setEntryLogs] = useState<ZoneEntryLog[]>([]);
  const [alerts, setAlerts] = useState<ZoneAlert[]>([]);
  const [activeSessions, setActiveSessions] = useState<ZoneAccessSession[]>([]);
  const [statistics, setStatistics] = useState<ZoneStatistics>({
    total_zones: 0,
    active_zones: 0,
    restricted_zones: 0,
    current_visitors: 0,
    zones_at_capacity: 0,
    active_alerts: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch zone occupancy
      const { data: occupancyData, error: occupancyError } = await supabase
        .from('zone_occupancy')
        .select('*')
        .order('last_updated', { ascending: false });

      if (occupancyError) throw occupancyError;
      setZoneOccupancy(occupancyData || []);

      // Fetch recent entry logs
      const { data: logsData, error: logsError } = await supabase
        .from('zone_entry_logs')
        .select(`
          *,
          visitor:profiles!zone_entry_logs_visitor_id_fkey(
            id,
            full_name,
            email,
            photo_url
          ),
          zone:zones(
            id,
            name,
            zone_type
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setEntryLogs(logsData || []);

      // Fetch active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('zone_alerts')
        .select(`
          *,
          zone:zones(
            id,
            name,
            zone_type
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Fetch active sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('zone_access_sessions')
        .select(`
          *,
          visitor:profiles!zone_access_sessions_visitor_id_fkey(
            id,
            full_name,
            email,
            photo_url
          ),
          zone:zones(
            id,
            name,
            zone_type
          )
        `)
        .eq('is_active', true)
        .order('entered_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setActiveSessions(sessionsData || []);

      // Fetch statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_zone_statistics');

      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStatistics(statsData[0]);
      }

    } catch (error: any) {
      console.error('Error fetching real-time zone data:', error);
      toast({
        title: 'Error loading real-time data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchInitialData();

    // Subscribe to zone occupancy changes
    const occupancySubscription = supabase
      .channel('zone_occupancy_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_occupancy'
        },
        (payload) => {
          console.log('Zone occupancy change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setZoneOccupancy(prev => [payload.new as ZoneOccupancy, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setZoneOccupancy(prev => 
              prev.map(item => 
                item.id === payload.new.id ? payload.new as ZoneOccupancy : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setZoneOccupancy(prev => 
              prev.filter(item => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Subscribe to entry logs
    const logsSubscription = supabase
      .channel('zone_entry_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zone_entry_logs'
        },
        async (payload) => {
          console.log('New zone entry log:', payload);
          
          // Fetch the complete log with relations
          const { data: newLog, error } = await supabase
            .from('zone_entry_logs')
            .select(`
              *,
              visitor:profiles!zone_entry_logs_visitor_id_fkey(
                id,
                full_name,
                email,
                photo_url
              ),
              zone:zones(
                id,
                name,
                zone_type
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && newLog) {
            setEntryLogs(prev => [newLog, ...prev.slice(0, 49)]);
            
            // Show toast notification for entries/exits
            toast({
              title: `Zone ${payload.new.action === 'entry' ? 'Entry' : 'Exit'}`,
              description: `${newLog.visitor.full_name} ${payload.new.action === 'entry' ? 'entered' : 'exited'} ${newLog.zone.name}`,
              duration: 3000
            });
          }
        }
      )
      .subscribe();

    // Subscribe to alerts
    const alertsSubscription = supabase
      .channel('zone_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_alerts'
        },
        async (payload) => {
          console.log('Zone alert change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the complete alert with relations
            const { data: newAlert, error } = await supabase
              .from('zone_alerts')
              .select(`
                *,
                zone:zones(
                  id,
                  name,
                  zone_type
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && newAlert) {
              setAlerts(prev => [newAlert, ...prev]);
              
              // Show toast notification for new alerts
              if (newAlert.is_active) {
                toast({
                  title: newAlert.title,
                  description: newAlert.message,
                  variant: newAlert.severity >= 3 ? 'destructive' : 'default',
                  duration: 5000
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev => 
              prev.map(item => 
                item.id === payload.new.id ? { ...item, ...payload.new } : item
              ).filter(item => item.is_active) // Remove resolved alerts
            );
          }
        }
      )
      .subscribe();

    // Subscribe to active sessions
    const sessionsSubscription = supabase
      .channel('zone_access_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_access_sessions'
        },
        async (payload) => {
          console.log('Zone session change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the complete session with relations
            const { data: newSession, error } = await supabase
              .from('zone_access_sessions')
              .select(`
                *,
                visitor:profiles!zone_access_sessions_visitor_id_fkey(
                  id,
                  full_name,
                  email,
                  photo_url
                ),
                zone:zones(
                  id,
                  name,
                  zone_type
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && newSession && newSession.is_active) {
              setActiveSessions(prev => [newSession, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setActiveSessions(prev => 
              prev.map(item => 
                item.id === payload.new.id ? { ...item, ...payload.new } : item
              ).filter(item => item.is_active) // Remove inactive sessions
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      occupancySubscription.unsubscribe();
      logsSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
      sessionsSubscription.unsubscribe();
    };
  }, [fetchInitialData, toast]);

  // Function to log zone access
  const logZoneAccess = useCallback(async (
    zoneId: string,
    visitorId: string,
    visitRequestId: string,
    action: 'entry' | 'exit' | 'emergency_exit' | 'forced_entry',
    scannedBy?: string,
    deviceId?: string,
    notes?: string
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('log_zone_access', {
          p_zone_id: zoneId,
          p_visitor_id: visitorId,
          p_visit_request_id: visitRequestId,
          p_action: action,
          p_scanned_by: scannedBy || null,
          p_device_id: deviceId || null,
          p_notes: notes || null
        });

      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Error logging zone access:', error);
      toast({
        title: 'Error logging zone access',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast]);

  // Function to resolve alert
  const resolveAlert = useCallback(async (alertId: string, resolvedBy: string) => {
    try {
      const { error } = await supabase
        .rpc('resolve_zone_alert', {
          p_alert_id: alertId,
          p_resolved_by: resolvedBy
        });

      if (error) throw error;
      
      toast({
        title: 'Alert resolved',
        description: 'The alert has been successfully resolved'
      });
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Error resolving alert',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast]);

  // Function to get zone occupancy by zone ID
  const getZoneOccupancy = useCallback((zoneId: string) => {
    return zoneOccupancy.find(occ => occ.zone_id === zoneId);
  }, [zoneOccupancy]);

  // Function to get active sessions for a zone
  const getZoneActiveSessions = useCallback((zoneId: string) => {
    return activeSessions.filter(session => session.zone_id === zoneId);
  }, [activeSessions]);

  // Function to refresh statistics
  const refreshStatistics = useCallback(async () => {
    try {
      const { data: statsData, error } = await supabase
        .rpc('get_zone_statistics');

      if (error) throw error;
      if (statsData && statsData.length > 0) {
        setStatistics(statsData[0]);
      }
    } catch (error: any) {
      console.error('Error refreshing statistics:', error);
    }
  }, []);

  return {
    // Data
    zoneOccupancy,
    entryLogs,
    alerts,
    activeSessions,
    statistics,
    loading,
    
    // Functions
    logZoneAccess,
    resolveAlert,
    getZoneOccupancy,
    getZoneActiveSessions,
    refreshStatistics,
    refetch: fetchInitialData
  };
}