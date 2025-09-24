import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  SecurityZone, 
  ZoneEntryPoint, 
  ZoneGuard, 
  ZoneAccessLog, 
  VisitorZoneRequest, 
  ZoneSecurityAlert,
  ZoneOccupancy,
  ZoneStatistics 
} from '@/types/zoneTypes';
import { zoneSecurityService } from '@/services/zoneSecurityService';

interface RealtimeZoneData {
  zones: SecurityZone[];
  entryPoints: ZoneEntryPoint[];
  guards: ZoneGuard[];
  accessLogs: ZoneAccessLog[];
  visitorRequests: VisitorZoneRequest[];
  securityAlerts: ZoneSecurityAlert[];
  occupancy: ZoneOccupancy[];
  statistics: ZoneStatistics | null;
}

interface UseRealtimeZoneDataOptions {
  zoneId?: string;
  guardId?: string;
  enableLogs?: boolean;
  enableAlerts?: boolean;
  enableOccupancy?: boolean;
  enableStatistics?: boolean;
}

export function useRealtimeZoneData(options: UseRealtimeZoneDataOptions = {}) {
  const {
    zoneId,
    guardId,
    enableLogs = true,
    enableAlerts = true,
    enableOccupancy = true,
    enableStatistics = true
  } = options;

  const [data, setData] = useState<RealtimeZoneData>({
    zones: [],
    entryPoints: [],
    guards: [],
    accessLogs: [],
    visitorRequests: [],
    securityAlerts: [],
    occupancy: [],
    statistics: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        zones,
        entryPoints,
        guards,
        accessLogs,
        visitorRequests,
        securityAlerts,
        occupancyData,
        statistics
      ] = await Promise.all([
        zoneSecurityService.getZones(),
        zoneSecurityService.getEntryPoints(zoneId),
        zoneSecurityService.getGuards(zoneId),
        enableLogs ? zoneSecurityService.getAccessLogs({ zone_id: zoneId, limit: 50 }) : [],
        zoneSecurityService.getVisitorZoneRequests({ zone_id: zoneId }),
        enableAlerts ? zoneSecurityService.getSecurityAlerts({ zone_id: zoneId, limit: 20 }) : [],
        enableOccupancy ? (zoneId ? zoneSecurityService.getZoneOccupancy(zoneId) : []) : [],
        enableStatistics ? zoneSecurityService.getZoneStatistics(zoneId) : null
      ]);

      // Handle occupancy data - ensure it's always an array
      let occupancy: ZoneOccupancy[] = [];
      if (enableOccupancy) {
        if (zoneId && occupancyData) {
          occupancy = [occupancyData as ZoneOccupancy];
        } else if (!zoneId) {
          // Get occupancy for all zones
          const occupancyPromises = zones.map(zone => 
            zoneSecurityService.getZoneOccupancy(zone.id).catch(() => null)
          );
          const occupancyResults = await Promise.all(occupancyPromises);
          occupancy = occupancyResults.filter(Boolean) as ZoneOccupancy[];
        }
      }

      setData({
        zones,
        entryPoints,
        guards,
        accessLogs,
        visitorRequests,
        securityAlerts,
        occupancy,
        statistics
      });
    } catch (err) {
      console.error('Error fetching initial zone data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch zone data');
    } finally {
      setLoading(false);
    }
  }, [zoneId, guardId, enableLogs, enableAlerts, enableOccupancy, enableStatistics]);

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    const newChannels: RealtimeChannel[] = [];

    // Security Zones subscription
    const zonesChannel = supabase
      .channel('zones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zones',
          ...(zoneId && { filter: `id=eq.${zoneId}` })
        },
        (payload) => {
          console.log('Zones change:', payload);
          
          setData(prev => {
            const newZones = [...prev.zones];
            
            if (payload.eventType === 'INSERT') {
              newZones.push(payload.new as SecurityZone);
            } else if (payload.eventType === 'UPDATE') {
              const index = newZones.findIndex(z => z.id === payload.new.id);
              if (index !== -1) {
                newZones[index] = payload.new as SecurityZone;
              }
            } else if (payload.eventType === 'DELETE') {
              const index = newZones.findIndex(z => z.id === payload.old.id);
              if (index !== -1) {
                newZones.splice(index, 1);
              }
            }
            
            return { ...prev, zones: newZones };
          });
        }
      )
      .subscribe();

    newChannels.push(zonesChannel);

    // Zone Entry Points subscription
    const entryPointsChannel = supabase
      .channel('zone_entry_points_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_entry_points',
          ...(zoneId && { filter: `zone_id=eq.${zoneId}` })
        },
        (payload) => {
          console.log('Entry points change:', payload);
          
          setData(prev => {
            const newEntryPoints = [...prev.entryPoints];
            
            if (payload.eventType === 'INSERT') {
              newEntryPoints.push(payload.new as ZoneEntryPoint);
            } else if (payload.eventType === 'UPDATE') {
              const index = newEntryPoints.findIndex(ep => ep.id === payload.new.id);
              if (index !== -1) {
                newEntryPoints[index] = payload.new as ZoneEntryPoint;
              }
            } else if (payload.eventType === 'DELETE') {
              const index = newEntryPoints.findIndex(ep => ep.id === payload.old.id);
              if (index !== -1) {
                newEntryPoints.splice(index, 1);
              }
            }
            
            return { ...prev, entryPoints: newEntryPoints };
          });
        }
      )
      .subscribe();

    newChannels.push(entryPointsChannel);

    // Zone Guards subscription
    const guardsChannel = supabase
      .channel('zone_guards_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_guards',
          ...(zoneId && { filter: `zone_id=eq.${zoneId}` })
        },
        (payload) => {
          console.log('Guards change:', payload);
          
          setData(prev => {
            const newGuards = [...prev.guards];
            
            if (payload.eventType === 'INSERT') {
              newGuards.push(payload.new as ZoneGuard);
            } else if (payload.eventType === 'UPDATE') {
              const index = newGuards.findIndex(g => g.id === payload.new.id);
              if (index !== -1) {
                newGuards[index] = payload.new as ZoneGuard;
              }
            } else if (payload.eventType === 'DELETE') {
              const index = newGuards.findIndex(g => g.id === payload.old.id);
              if (index !== -1) {
                newGuards.splice(index, 1);
              }
            }
            
            return { ...prev, guards: newGuards };
          });
        }
      )
      .subscribe();

    newChannels.push(guardsChannel);

    // Zone Access Logs subscription (if enabled)
    if (enableLogs) {
      const accessLogsChannel = supabase
        .channel('zone_access_logs_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'zone_access_logs',
            ...(zoneId && { filter: `zone_id=eq.${zoneId}` })
          },
          (payload) => {
            console.log('Access log change:', payload);
            
            setData(prev => {
              const newAccessLogs = [payload.new as ZoneAccessLog, ...prev.accessLogs];
              // Keep only the latest 50 logs
              return { 
                ...prev, 
                accessLogs: newAccessLogs.slice(0, 50) 
              };
            });
          }
        )
        .subscribe();

      newChannels.push(accessLogsChannel);
    }

    // Visitor Zone Requests subscription
    const visitorRequestsChannel = supabase
      .channel('visitor_zone_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visitor_zone_requests',
          ...(zoneId && { filter: `zone_id=eq.${zoneId}` })
        },
        (payload) => {
          console.log('Visitor requests change:', payload);
          
          setData(prev => {
            const newVisitorRequests = [...prev.visitorRequests];
            
            if (payload.eventType === 'INSERT') {
              newVisitorRequests.push(payload.new as VisitorZoneRequest);
            } else if (payload.eventType === 'UPDATE') {
              const index = newVisitorRequests.findIndex(vr => vr.id === payload.new.id);
              if (index !== -1) {
                newVisitorRequests[index] = payload.new as VisitorZoneRequest;
              }
            } else if (payload.eventType === 'DELETE') {
              const index = newVisitorRequests.findIndex(vr => vr.id === payload.old.id);
              if (index !== -1) {
                newVisitorRequests.splice(index, 1);
              }
            }
            
            return { ...prev, visitorRequests: newVisitorRequests };
          });
        }
      )
      .subscribe();

    newChannels.push(visitorRequestsChannel);

    // Security Alerts subscription (if enabled)
    if (enableAlerts) {
      const securityAlertsChannel = supabase
        .channel('zone_alerts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'zone_alerts',
            ...(zoneId && { filter: `zone_id=eq.${zoneId}` })
          },
          (payload) => {
            console.log('Security alert change:', payload);
            
            setData(prev => {
              const newSecurityAlerts = [payload.new as ZoneSecurityAlert, ...prev.securityAlerts];
              // Keep only the latest 20 alerts
              return { 
                ...prev, 
                securityAlerts: newSecurityAlerts.slice(0, 20) 
              };
            });
          }
        )
        .subscribe();

      newChannels.push(securityAlertsChannel);
    }

    setChannels(newChannels);
  }, [zoneId, enableLogs, enableAlerts]);

  // Cleanup subscriptions
  const cleanupSubscriptions = useCallback(() => {
    channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    setChannels([]);
  }, [channels]);

  // Refresh specific data types
  const refreshData = useCallback(async (dataType?: keyof RealtimeZoneData) => {
    try {
      if (!dataType) {
        await fetchInitialData();
        return;
      }

      switch (dataType) {
        case 'zones':
          const zones = await zoneSecurityService.getZones();
          setData(prev => ({ ...prev, zones }));
          break;
        case 'entryPoints':
          const entryPoints = await zoneSecurityService.getEntryPoints(zoneId);
          setData(prev => ({ ...prev, entryPoints }));
          break;
        case 'guards':
          const guards = await zoneSecurityService.getGuards(zoneId);
          setData(prev => ({ ...prev, guards }));
          break;
        case 'accessLogs':
          if (enableLogs) {
            const accessLogs = await zoneSecurityService.getAccessLogs({ zone_id: zoneId, limit: 50 });
            setData(prev => ({ ...prev, accessLogs }));
          }
          break;
        case 'occupancy':
          if (enableOccupancy) {
            if (zoneId) {
              const occupancy = await zoneSecurityService.getZoneOccupancy(zoneId);
              setData(prev => ({ ...prev, occupancy: [occupancy] }));
            } else {
              // If no specific zone, get occupancy for all zones
              const zones = await zoneSecurityService.getZones();
              const occupancyPromises = zones.map(zone => 
                zoneSecurityService.getZoneOccupancy(zone.id).catch(() => null)
              );
              const occupancyResults = await Promise.all(occupancyPromises);
              const occupancy = occupancyResults.filter(Boolean) as ZoneOccupancy[];
              setData(prev => ({ ...prev, occupancy }));
            }
          }
          break;
        case 'statistics':
          if (enableStatistics) {
            const statistics = await zoneSecurityService.getZoneStatistics(zoneId);
            setData(prev => ({ ...prev, statistics }));
          }
          break;
      }
    } catch (err) {
      console.error(`Error refreshing ${dataType}:`, err);
      setError(err instanceof Error ? err.message : `Failed to refresh ${dataType}`);
    }
  }, [zoneId, enableLogs, enableOccupancy, enableStatistics, fetchInitialData]);

  // Initialize data and subscriptions
  useEffect(() => {
    fetchInitialData();
    setupRealtimeSubscriptions();

    return () => {
      cleanupSubscriptions();
    };
  }, [fetchInitialData, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // Periodic refresh for occupancy and statistics
  useEffect(() => {
    if (!enableOccupancy && !enableStatistics) return;

    const interval = setInterval(() => {
      if (enableOccupancy) {
        refreshData('occupancy');
      }
      if (enableStatistics) {
        refreshData('statistics');
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [enableOccupancy, enableStatistics, refreshData]);

  return {
    data,
    loading,
    error,
    refreshData,
    isConnected: channels.length > 0
  };
}