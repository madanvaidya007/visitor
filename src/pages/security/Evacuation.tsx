import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Megaphone,
  Radio,
  Building,
  ExternalLink,
  Phone,
  Siren,
  Navigation,
  UserCheck,
  UserX,
  Activity,
  Timer,
  Zap,
  Eye,
  Download,
  FileText,
  Bell,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface EvacuationStatus {
  id: string;
  status: 'normal' | 'alert' | 'evacuation' | 'lockdown';
  initiated_at?: string;
  initiated_by?: string;
  estimated_completion?: string;
  total_occupants: number;
  evacuated_count: number;
  remaining_count: number;
  zones_cleared: number;
  total_zones: number;
  emergency_contacts_notified: boolean;
  authorities_notified: boolean;
  notes?: string;
}

interface ZoneEvacuationStatus {
  zone_id: string;
  zone_name: string;
  status: 'pending' | 'in_progress' | 'cleared' | 'blocked';
  occupant_count: number;
  evacuated_count: number;
  last_updated: string;
  assigned_personnel?: string;
  evacuation_route: string;
  estimated_time: number;
}

interface EvacuationPersonnel {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'assigned' | 'responding';
  assigned_zone?: string;
  contact: string;
  location: string;
}

interface VisitorLocation {
  id: string;
  visitor_name: string;
  company: string;
  current_zone: string;
  zone_id: string;
  last_activity: string;
  visit_duration: string;
  evacuation_status: 'pending' | 'in_progress' | 'evacuated' | 'missing';
  host_name: string;
  contact_phone?: string;
}

interface ZoneStatus {
  zone_id: string;
  zone_name: string;
  visitor_count: number;
  evacuation_progress: number;
  status: 'normal' | 'evacuating' | 'cleared';
  last_update: string;
}

interface EvacuationStats {
  total_visitors: number;
  evacuated: number;
  in_progress: number;
  missing: number;
  zones_cleared: number;
  total_zones: number;
}

const Evacuation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [evacuationActive, setEvacuationActive] = useState(false);
  const [visitors, setVisitors] = useState<VisitorLocation[]>([]);
  const [zones, setZones] = useState<ZoneStatus[]>([]);
  const [stats, setStats] = useState<EvacuationStats>({
    total_visitors: 0,
    evacuated: 0,
    in_progress: 0,
    missing: 0,
    zones_cleared: 0,
    total_zones: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [evacuationStatus, setEvacuationStatus] = useState<EvacuationStatus | null>(null);
  const [zoneStatuses, setZoneStatuses] = useState<ZoneEvacuationStatus[]>([]);
  const [personnel, setPersonnel] = useState<EvacuationPersonnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInitiateDialog, setShowInitiateDialog] = useState(false);
  const [evacuationReason, setEvacuationReason] = useState('');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await fetchActiveVisitors();
      await fetchZoneStatuses();
      initializeEvacuationData();
    };
    
    loadData();
    
    // Set up real-time subscriptions for visitor tracking
    const visitRequestsSubscription = supabase
      .channel('evacuation_visit_requests')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'visit_requests' },
        () => {
          loadData();
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    const zoneAccessSubscription = supabase
      .channel('evacuation_zone_access')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'zone_access_sessions' },
        () => {
          loadData();
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
      setLastUpdate(new Date());
    }, 30000);

    return () => {
      visitRequestsSubscription.unsubscribe();
      zoneAccessSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Update evacuation data when visitors or zones change
  useEffect(() => {
    if (visitors.length > 0 || zones.length > 0) {
      initializeEvacuationData();
    }
  }, [visitors, zones, evacuationActive]);

  const fetchActiveVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          id,
          purpose,
          start_time,
          end_time,
          created_at,
          checked_in_at,
          visitor:visitor_id(full_name, company, phone),
          host:host_id(full_name),
          zone_access_sessions!inner(
            zone_id,
            entered_at,
            exited_at,
            zone:zone_id(name)
          )
        `)
        .eq('status', 'checked_in')
        .is('zone_access_sessions.exited_at', null);

      if (error) throw error;

      // Transform data to match our interface
      const visitorData: VisitorLocation[] = (data || []).map(visit => {
        const activeSession = visit.zone_access_sessions?.[0];
        const currentZone = activeSession?.zone?.name || 'Lobby';
        const zoneId = activeSession?.zone_id || '';
        
        const checkInTime = new Date(visit.checked_in_at || visit.created_at);
        const visitDuration = formatDistanceToNow(checkInTime, { addSuffix: false });
        const lastActivity = activeSession?.entered_at 
          ? formatDistanceToNow(parseISO(activeSession.entered_at), { addSuffix: true })
          : 'Unknown';

        return {
          id: visit.id,
          visitor_name: visit.visitor?.full_name || 'Unknown Visitor',
          company: visit.visitor?.company || 'N/A',
          current_zone: currentZone,
          zone_id: zoneId,
          last_activity: lastActivity,
          visit_duration: visitDuration,
          evacuation_status: 'pending' as const,
          host_name: visit.host?.full_name || 'Unknown Host',
          contact_phone: visit.visitor?.phone || visit.host?.phone
        };
      });

      setVisitors(visitorData);
      updateStats(visitorData);
    } catch (error: any) {
      console.error('Error fetching active visitors:', error);
      toast({
        title: 'Error loading visitor data',
        description: 'Failed to fetch current visitor locations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchZoneStatuses = async () => {
    try {
      // Get all zones with current visitor counts
      const { data: zoneData, error: zoneError } = await supabase
        .from('zones')
        .select('id, name');

      if (zoneError) throw zoneError;

      // Get active sessions per zone
      const { data: sessionData, error: sessionError } = await supabase
        .from('zone_access_sessions')
        .select(`
          zone_id,
          entered_at,
          zone:zone_id(name)
        `)
        .is('exited_at', null);

      if (sessionError) throw sessionError;

      // Group sessions by zone
      const zoneMap = new Map<string, { name: string; count: number; lastUpdate: string }>();
      
      // Initialize all zones
      zoneData?.forEach(zone => {
        zoneMap.set(zone.id, {
          name: zone.name,
          count: 0,
          lastUpdate: new Date().toISOString()
        });
      });

      // Count visitors per zone
      sessionData?.forEach(session => {
        const existing = zoneMap.get(session.zone_id);
        if (existing) {
          existing.count += 1;
          if (session.entered_at > existing.lastUpdate) {
            existing.lastUpdate = session.entered_at;
          }
        }
      });

      const zoneStatuses: ZoneStatus[] = Array.from(zoneMap.entries()).map(([zoneId, data]) => {
        const activeVisitors = visitors.filter(v => v.zone_id === zoneId);
        const evacuatedCount = activeVisitors.filter(v => v.evacuation_status === 'evacuated').length;
        const inProgressCount = activeVisitors.filter(v => v.evacuation_status === 'in_progress').length;
        
        return {
          zone_id: zoneId,
          zone_name: data.name,
          visitor_count: data.count,
          evacuation_progress: data.count > 0 ? (evacuatedCount / data.count) * 100 : 0,
          status: evacuationActive 
            ? (evacuatedCount === data.count && data.count > 0 ? 'cleared' : 'evacuating')
            : 'normal' as const,
          last_update: formatDistanceToNow(parseISO(data.lastUpdate), { addSuffix: true })
        };
      });

      setZones(zoneStatuses);
    } catch (error: any) {
      console.error('Error fetching zone statuses:', error);
    }
  };

  const updateStats = (visitorData: VisitorLocation[]) => {
    const totalVisitors = visitorData.length;
    const evacuated = visitorData.filter(v => v.evacuation_status === 'evacuated').length;
    const inProgress = visitorData.filter(v => v.evacuation_status === 'in_progress').length;
    const missing = visitorData.filter(v => v.evacuation_status === 'missing').length;

    setStats({
      total_visitors: totalVisitors,
      evacuated,
      in_progress: inProgress,
      missing,
      zones_cleared: zones.filter(z => z.status === 'cleared').length,
      total_zones: zones.length
    });
  };

  const initializeEvacuationData = () => {
    // Initialize evacuation status based on current data
    const totalOccupants = visitors.length;
    const evacuatedCount = visitors.filter(v => v.evacuation_status === 'evacuated').length;
    const zonesCleared = zones.filter(z => z.status === 'cleared').length;
    
    const initialStatus: EvacuationStatus = {
      id: '1',
      status: evacuationActive ? 'evacuation' : 'normal',
      total_occupants: totalOccupants,
      evacuated_count: evacuatedCount,
      remaining_count: totalOccupants - evacuatedCount,
      zones_cleared: zonesCleared,
      total_zones: zones.length,
      emergency_contacts_notified: false,
      authorities_notified: false
    };

    // Create zone evacuation statuses from current zone data
    const zoneEvacuationStatuses: ZoneEvacuationStatus[] = zones.map(zone => {
      const zoneVisitors = visitors.filter(v => v.zone_id === zone.zone_id);
      const evacuatedInZone = zoneVisitors.filter(v => v.evacuation_status === 'evacuated').length;
      
      return {
        zone_id: zone.zone_id,
        zone_name: zone.zone_name,
        status: zone.status === 'cleared' ? 'cleared' : 
                zone.status === 'evacuating' ? 'in_progress' : 'pending',
        occupant_count: zone.visitor_count,
        evacuated_count: evacuatedInZone,
        last_updated: new Date().toISOString(),
        evacuation_route: `Exit ${String.fromCharCode(65 + Math.floor(Math.random() * 4))} - Emergency Route`,
        estimated_time: Math.max(1, Math.ceil(zone.visitor_count / 10))
      };
    });

    // TODO: Implement actual personnel fetching from database
    // const { data: personnelData, error } = await supabase
    //   .from('emergency_personnel')
    //   .select('*')
    //   .eq('is_active', true);
    
    // if (error) throw error;
    // setPersonnel(personnelData || []);
    
    // For now, start with empty personnel list until database implementation
    const personnel: EvacuationPersonnel[] = [];

    setEvacuationStatus(initialStatus);
    setZoneStatuses(zoneEvacuationStatuses);
    setPersonnel(personnel);
  };

  const initiateEvacuation = async () => {
    try {
      setEvacuationActive(true);
      
      // Update all visitors to in_progress status
      const updatedVisitors = visitors.map(visitor => ({
        ...visitor,
        evacuation_status: 'in_progress' as const
      }));
      setVisitors(updatedVisitors);
      
      // Update zone statuses to evacuating
      const updatedZones = zones.map(zone => ({
        ...zone,
        status: zone.visitor_count > 0 ? 'evacuating' as const : 'cleared' as const
      }));
      setZones(updatedZones);
      
      const updatedStatus: EvacuationStatus = {
        ...evacuationStatus!,
        status: 'evacuation',
        initiated_at: new Date().toISOString(),
        initiated_by: profile?.full_name || 'Unknown',
        estimated_completion: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        notes: evacuationReason
      };

      setEvacuationStatus(updatedStatus);
      setShowInitiateDialog(false);
      setEvacuationReason('');
      
      updateStats(updatedVisitors);
      
      toast({
        title: "Evacuation Initiated",
        description: `Emergency evacuation started for ${stats.total_visitors} visitors across ${stats.total_zones} zones`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error initiating evacuation:', error);
      toast({
        title: "Error",
        description: "Failed to initiate evacuation",
        variant: "destructive"
      });
    }
  };

  const updateVisitorStatus = (visitorId: string, status: VisitorLocation['evacuation_status']) => {
    setVisitors(prev => {
      const updated = prev.map(visitor => 
        visitor.id === visitorId ? { ...visitor, evacuation_status: status } : visitor
      );
      updateStats(updated);
      return updated;
    });
  };

  const refreshData = async () => {
    await fetchActiveVisitors();
    await fetchZoneStatuses();
    initializeEvacuationData();
    setLastUpdate(new Date());
  };

  const updateZoneStatus = async (zoneId: string, newStatus: ZoneEvacuationStatus['status']) => {
    try {
      const updatedZones = zoneStatuses.map(zone => 
        zone.zone_id === zoneId 
          ? { 
              ...zone, 
              status: newStatus, 
              evacuated_count: newStatus === 'cleared' ? zone.occupant_count : zone.evacuated_count,
              last_updated: new Date().toISOString()
            }
          : zone
      );
      
      setZoneStatuses(updatedZones);

      // Update overall evacuation status
      if (evacuationStatus) {
        const clearedZones = updatedZones.filter(z => z.status === 'cleared').length;
        const totalEvacuated = updatedZones.reduce((sum, z) => sum + z.evacuated_count, 0);
        
        setEvacuationStatus({
          ...evacuationStatus,
          zones_cleared: clearedZones,
          evacuated_count: totalEvacuated,
          remaining_count: evacuationStatus.total_occupants - totalEvacuated
        });
      }

      toast({
        title: "Zone Status Updated",
        description: `Zone status has been updated to ${newStatus}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating zone status:', error);
      toast({
        title: "Error",
        description: "Failed to update zone status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'alert': return 'bg-yellow-500';
      case 'evacuation': return 'bg-red-500';
      case 'lockdown': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getZoneStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'cleared': return 'bg-green-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const evacuationProgress = evacuationStatus 
    ? (evacuationStatus.evacuated_count / evacuationStatus.total_occupants) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emergency Evacuation</h1>
          <p className="text-muted-foreground">
            Real-time evacuation management and visitor tracking
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {!evacuationActive ? (
            <Button
              onClick={initiateEvacuation}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading || stats.total_visitors === 0}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Initiate Evacuation
            </Button>
          ) : (
            <Badge variant="destructive" className="px-4 py-2">
              <Radio className="h-4 w-4 mr-2" />
              EVACUATION ACTIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {evacuationStatus?.status !== 'normal' && (
        <Alert className="border-red-500 bg-red-50">
          <Siren className="h-4 w-4" />
          <AlertDescription className="font-medium">
            <div className="flex items-center justify-between">
              <span>
                EMERGENCY EVACUATION IN PROGRESS - Initiated by {evacuationStatus?.initiated_by} at{' '}
                {evacuationStatus?.initiated_at && format(parseISO(evacuationStatus.initiated_at), 'HH:mm:ss')}
              </span>
              <Badge variant="destructive" className="ml-2">
                {evacuationStatus?.status.toUpperCase()}
              </Badge>
            </div>
            {evacuationStatus?.notes && (
              <p className="mt-2 text-sm">Reason: {evacuationStatus.notes}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_visitors}</div>
            <p className="text-xs text-muted-foreground">
              Currently in building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evacuated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.evacuated}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_visitors > 0 ? Math.round((stats.evacuated / stats.total_visitors) * 100) : 0}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
            <p className="text-xs text-muted-foreground">
              Currently evacuating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing/Unaccounted</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Evacuation Progress */}
      {evacuationStatus?.status !== 'normal' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Evacuation Progress
            </CardTitle>
            <CardDescription>
              Overall evacuation completion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(evacuationProgress)}%
                </span>
              </div>
              <Progress value={evacuationProgress} className="h-3" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Remaining: </span>
                  <span className="font-medium">{evacuationStatus?.remaining_count || 0} people</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ETA: </span>
                  <span className="font-medium">
                    {evacuationStatus?.estimated_completion 
                      ? formatDistanceToNow(parseISO(evacuationStatus.estimated_completion))
                      : 'Calculating...'
                    }
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="zones">Zone Status</TabsTrigger>
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Zone Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Zone Status
                </CardTitle>
                <CardDescription>
                  Current occupancy and evacuation progress by zone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : zones.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No zones found
                  </p>
                ) : (
                  zones.map((zone) => (
                    <div key={zone.zone_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            zone.status === 'cleared' ? 'default' :
                            zone.status === 'evacuating' ? 'destructive' : 'secondary'
                          }>
                            {zone.status}
                          </Badge>
                          <span className="font-medium">{zone.zone_name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {zone.visitor_count} visitors
                        </div>
                      </div>
                      <Progress 
                        value={zone.evacuation_progress} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Last update: {zone.last_update}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest visitor movements and status changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visitors.slice(0, 5).map((visitor) => (
                    <div key={visitor.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          visitor.evacuation_status === 'evacuated' ? 'default' :
                          visitor.evacuation_status === 'in_progress' ? 'secondary' :
                          visitor.evacuation_status === 'missing' ? 'destructive' : 'outline'
                        }>
                          {visitor.evacuation_status}
                        </Badge>
                        <div>
                          <p className="font-medium">{visitor.visitor_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {visitor.current_zone} • {visitor.company}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {visitor.last_activity}
                      </div>
                    </div>
                  ))}
                  {visitors.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No active visitors
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="zones">
          <Card>
            <CardHeader>
              <CardTitle>Zone Evacuation Status</CardTitle>
              <CardDescription>
                Real-time status of all zones during evacuation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {zoneStatuses.map((zone) => (
                  <div key={zone.zone_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${getZoneStatusColor(zone.status)}`} />
                        <div>
                          <h4 className="font-medium">{zone.zone_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {zone.occupant_count} occupants • Route: {zone.evacuation_route}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={zone.status === 'cleared' ? 'default' : 'secondary'}>
                          {zone.status.replace('_', ' ')}
                        </Badge>
                        {evacuationStatus?.status !== 'normal' && zone.status !== 'cleared' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateZoneStatus(zone.zone_id, 'in_progress')}
                              disabled={zone.status === 'in_progress'}
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateZoneStatus(zone.zone_id, 'cleared')}
                            >
                              Clear
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Evacuated: </span>
                        <span className="font-medium">
                          {zone.evacuated_count}/{zone.occupant_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ETA: </span>
                        <span className="font-medium">{zone.estimated_time} min</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Updated: </span>
                        <span className="font-medium">
                          {formatDistanceToNow(parseISO(zone.last_updated))} ago
                        </span>
                      </div>
                    </div>

                    {zone.assigned_personnel && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Assigned: </span>
                        <span className="font-medium">{zone.assigned_personnel}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Visitor Tracking
              </CardTitle>
              <CardDescription>
                Real-time visitor locations and evacuation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : visitors.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active visitors in the building</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visitors.map((visitor) => (
                    <div key={visitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant={
                          visitor.evacuation_status === 'evacuated' ? 'default' :
                          visitor.evacuation_status === 'in_progress' ? 'secondary' :
                          visitor.evacuation_status === 'missing' ? 'destructive' : 'outline'
                        }>
                          {visitor.evacuation_status}
                        </Badge>
                        <div>
                          <p className="font-medium">{visitor.visitor_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {visitor.company} • Host: {visitor.host_name}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {visitor.current_zone}
                            </span>
                            <span className="text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {visitor.visit_duration}
                            </span>
                            {visitor.contact_phone && (
                              <span className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {visitor.contact_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground text-right">
                          <p>Last activity:</p>
                          <p>{visitor.last_activity}</p>
                        </div>
                        {evacuationActive && visitor.evacuation_status !== 'evacuated' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateVisitorStatus(visitor.id, 'in_progress')}
                              disabled={visitor.evacuation_status === 'in_progress'}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Evacuating
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateVisitorStatus(visitor.id, 'evacuated')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Evacuated
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateVisitorStatus(visitor.id, 'missing')}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Missing
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Communications</CardTitle>
              <CardDescription>
                Broadcast messages and notifications during evacuation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-16" variant="outline">
                    <Megaphone className="mr-2 h-5 w-5" />
                    Broadcast Announcement
                  </Button>
                  <Button className="h-16" variant="outline">
                    <Bell className="mr-2 h-5 w-5" />
                    Send Alert Notifications
                  </Button>
                  <Button className="h-16" variant="outline">
                    <Phone className="mr-2 h-5 w-5" />
                    Contact Emergency Services
                  </Button>
                  <Button className="h-16" variant="outline">
                    <Radio className="mr-2 h-5 w-5" />
                    Radio Communication
                  </Button>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Recent Communications</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">PA Announcement</span>
                        <span className="text-xs text-muted-foreground">2 min ago</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        "Attention all personnel, please proceed to your designated evacuation routes immediately."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Evacuation Reports</CardTitle>
              <CardDescription>
                Generate and download evacuation reports and documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-16">
                  <FileText className="mr-2 h-5 w-5" />
                  Generate Status Report
                </Button>
                <Button variant="outline" className="h-16">
                  <Download className="mr-2 h-5 w-5" />
                  Export Evacuation Log
                </Button>
                <Button variant="outline" className="h-16">
                  <Users className="mr-2 h-5 w-5" />
                  Occupancy Report
                </Button>
                <Button variant="outline" className="h-16">
                  <Clock className="mr-2 h-5 w-5" />
                  Timeline Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Evacuation;