import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Users, 
  AlertTriangle, 
  Eye, 
  Activity, 
  Clock, 
  Shield, 
  TrendingUp,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface Zone {
  id: string;
  name: string;
  description?: string;
  zone_type: string;
  max_capacity?: number;
  requires_escort: boolean;
  is_active: boolean;
  current_occupancy?: number;
}

interface ZoneMonitoringTabProps {
  zoneOccupancy?: any[];
  onUpdate?: () => void;
}

export function ZoneMonitoringTab({ zoneOccupancy: propZoneOccupancy, onUpdate }: ZoneMonitoringTabProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    zoneOccupancy,
    entryLogs,
    alerts,
    activeSessions,
    statistics,
    loading: realtimeLoading,
    resolveAlert,
    getZoneOccupancy,
    getZoneActiveSessions,
    refreshStatistics,
    refetch: refetchRealtimeData
  } = useRealtimeZones();

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Merge zones with real-time occupancy data
      const zonesWithOccupancy = (data || []).map(zone => {
        const occupancy = getZoneOccupancy(zone.id);
        return {
          ...zone,
          current_occupancy: occupancy?.current_count || 0
        };
      });
      
      setZones(zonesWithOccupancy);
    } catch (error: any) {
      console.error('Error fetching zones:', error);
      toast({
        title: 'Error loading zones',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchZones(),
      refetchRealtimeData(),
      refreshStatistics()
    ]);
    setLoading(false);
    onUpdate?.();
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!profile) return;
    
    try {
      await resolveAlert(alertId, profile.id);
      toast({
        title: 'Alert resolved',
        description: 'The alert has been successfully resolved'
      });
    } catch (error: any) {
      toast({
        title: 'Error resolving alert',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getZoneStatusColor = (current: number, max: number) => {
    if (max === 0) return 'secondary';
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'destructive';
    if (percentage >= 90) return 'default';
    if (percentage >= 70) return 'secondary';
    return 'outline';
  };

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case 'restricted':
      case 'server_room':
        return <Shield className="h-4 w-4" />;
      case 'lab':
        return <Activity className="h-4 w-4" />;
      case 'meeting_room':
        return <Users className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getAlertSeverityColor = (severity: number) => {
    if (severity >= 4) return 'destructive';
    if (severity >= 3) return 'default';
    if (severity >= 2) return 'secondary';
    return 'outline';
  };

  // Use real-time data if available, fallback to props
  const displayZoneOccupancy = zones.map(zone => {
    const occupancy = getZoneOccupancy(zone.id);
    return {
      name: zone.name,
      current_count: occupancy?.current_count || zone.current_occupancy || 0,
      max_capacity: zone.max_capacity || 0,
      zone_type: zone.zone_type,
      id: zone.id
    };
  });

  return (
    <div className="space-y-6">
      {/* Real-time Status Header */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Real-time monitoring active • {statistics.current_visitors} visitors in {zones.filter(z => z.current_occupancy && z.current_occupancy > 0).length} zones
          </span>
          <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={loading || realtimeLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || realtimeLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Zone Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Active Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Zone Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_zones}</div>
                <p className="text-xs text-muted-foreground">
                  {statistics.active_zones} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Visitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.current_visitors}</div>
                <p className="text-xs text-muted-foreground">
                  Across all zones
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Capacity</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.zones_at_capacity}</div>
                <p className="text-xs text-muted-foreground">
                  Zones at max capacity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.active_alerts}</div>
                <p className="text-xs text-muted-foreground">
                  Requiring attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Zone Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Zone Status</CardTitle>
              <CardDescription>Real-time occupancy and status of all zones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayZoneOccupancy.map((zone) => (
                  <Card key={zone.name} className="relative cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getZoneTypeIcon(zone.zone_type)}
                          <CardTitle className="text-base">{zone.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {zone.zone_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Occupancy</span>
                          </div>
                          <span className="text-lg font-bold">
                            {zone.current_count} / {zone.max_capacity || 'No limit'}
                          </span>
                        </div>

                        {zone.max_capacity > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Capacity</span>
                              <span>{Math.round((zone.current_count / zone.max_capacity) * 100)}%</span>
                            </div>
                            <Progress 
                              value={Math.min((zone.current_count / zone.max_capacity) * 100, 100)}
                              className="h-2"
                            />
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <Badge variant={getZoneStatusColor(zone.current_count, zone.max_capacity)}>
                            {zone.max_capacity > 0 ? (
                              zone.current_count >= zone.max_capacity ? 'Full' : 
                              zone.current_count >= zone.max_capacity * 0.9 ? 'Near Full' : 
                              zone.current_count > 0 ? 'Active' : 'Empty'
                            ) : (
                              zone.current_count > 0 ? 'Active' : 'Empty'
                            )}
                          </Badge>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>

                    {/* Alert indicator for high-security zones */}
                    {(zone.zone_type === 'restricted' || zone.zone_type === 'server_room') && zone.current_count > 0 && (
                      <div className="absolute top-2 right-2">
                        <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
                      </div>
                    )}

                    {/* Capacity warning indicator */}
                    {zone.max_capacity > 0 && zone.current_count >= zone.max_capacity && (
                      <div className="absolute top-2 left-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Security Alerts</CardTitle>
              <CardDescription>Real-time alerts requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Active Alerts</h3>
                  <p className="text-muted-foreground">All zones are operating normally</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Card key={alert.id} className="border-l-4 border-l-destructive">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant={getAlertSeverityColor(alert.severity)}>
                                Severity {alert.severity}
                              </Badge>
                              <Badge variant="outline">
                                {alert.zone.name}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(parseISO(alert.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleResolveAlert(alert.id)}
                            className="ml-4"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Resolve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Timeline Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zone Activity Timeline</CardTitle>
              <CardDescription>Real-time entry and exit activities across all zones</CardDescription>
            </CardHeader>
            <CardContent>
              {entryLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Recent Activity</h3>
                  <p className="text-muted-foreground">Zone activities will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entryLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          log.action === 'entry' ? 'bg-green-100 text-green-600' : 
                          log.action === 'exit' ? 'bg-blue-100 text-blue-600' :
                          log.action === 'emergency_exit' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {log.action === 'entry' ? (
                            <MapPin className="h-4 w-4" />
                          ) : log.action === 'emergency_exit' ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{log.visitor.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.action.replace('_', ' ').toUpperCase()} • {log.zone.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          log.action === 'entry' ? 'default' : 
                          log.action === 'emergency_exit' ? 'destructive' : 'secondary'
                        }>
                          {log.action.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(log.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zone Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>Zone Utilization</CardTitle>
                <CardDescription>Current capacity utilization by zone type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    displayZoneOccupancy.reduce((acc, zone) => {
                      const type = zone.zone_type.replace('_', ' ');
                      if (!acc[type]) {
                        acc[type] = { current: 0, max: 0, count: 0 };
                      }
                      acc[type].current += zone.current_count;
                      acc[type].max += zone.max_capacity || 0;
                      acc[type].count += 1;
                      return acc;
                    }, {} as Record<string, { current: number; max: number; count: number }>)
                  ).map(([type, data]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{type}</span>
                        <span>{data.current} / {data.max || 'No limit'} ({data.count} zones)</span>
                      </div>
                      {data.max > 0 && (
                        <Progress value={(data.current / data.max) * 100} className="h-2" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Current visitor sessions by zone</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeSessions.slice(0, 10).map((session) => (
                    <div key={session.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">{session.visitor.full_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{session.zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(session.entered_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activeSessions.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No active sessions</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}