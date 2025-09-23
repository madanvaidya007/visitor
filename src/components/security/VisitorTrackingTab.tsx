import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Search, MapPin, Clock, User, Building, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO, isAfter } from 'date-fns';

interface VisitorLocation {
  id: string;
  visitor_name: string;
  company: string;
  check_in_time: string;
  current_zone: string;
  zone_id: string;
  host_name: string;
  purpose: string;
  expected_duration: string;
  status: 'checked_in' | 'overdue' | 'normal';
  visit_duration: string;
  last_activity: string;
}

interface ZoneActivity {
  zone_id: string;
  zone_name: string;
  visitor_count: number;
  last_entry: string;
}

export function VisitorTrackingTab() {
  const [visitors, setVisitors] = useState<VisitorLocation[]>([]);
  const [zoneActivity, setZoneActivity] = useState<ZoneActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    fetchActiveVisitors();
    fetchZoneActivity();
    
    // Set up real-time subscriptions
    const visitRequestsSubscription = supabase
      .channel('visit_requests_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'visit_requests' },
        () => {
          fetchActiveVisitors();
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    const zoneAccessSubscription = supabase
      .channel('zone_access_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'zone_access_sessions' },
        () => {
          fetchActiveVisitors();
          fetchZoneActivity();
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      visitRequestsSubscription.unsubscribe();
      zoneAccessSubscription.unsubscribe();
    };
  }, []);

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
          visitor:visitor_id(full_name, company),
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

      // Transform data to match our interface with real zone tracking
      const visitorData: VisitorLocation[] = (data || []).map(visit => {
        const now = new Date();
        const endTime = new Date(`${new Date().toDateString()} ${visit.end_time}`);
        const checkInTime = new Date(visit.created_at);
        const isOverdue = now > endTime;
        
        // Get current zone from active session
        const activeSession = visit.zone_access_sessions?.[0];
        const currentZone = activeSession?.zone?.name || 'Lobby';
        const zoneId = activeSession?.zone_id || '';
        
        // Calculate visit duration
        const visitDuration = formatDistanceToNow(checkInTime, { addSuffix: false });
        const lastActivity = activeSession?.entered_at 
          ? formatDistanceToNow(parseISO(activeSession.entered_at), { addSuffix: true })
          : 'No recent activity';

        return {
          id: visit.id,
          visitor_name: (visit.visitor as any)?.full_name || 'Unknown',
          company: (visit.visitor as any)?.company || 'Unknown',
          check_in_time: visit.start_time,
          current_zone: currentZone,
          zone_id: zoneId,
          host_name: (visit.host as any)?.full_name || 'Unknown',
          purpose: visit.purpose,
          expected_duration: `${visit.start_time} - ${visit.end_time}`,
          status: isOverdue ? 'overdue' : 'normal',
          visit_duration: visitDuration,
          last_activity: lastActivity
        };
      });

      setVisitors(visitorData);
    } catch (error: any) {
      toast({
        title: 'Error fetching visitor data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchZoneActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('zone_access_sessions')
        .select(`
          zone_id,
          entered_at,
          zone:zone_id(name)
        `)
        .is('exited_at', null)
        .order('entered_at', { ascending: false });

      if (error) throw error;

      // Group by zone and count visitors
      const zoneMap = new Map<string, ZoneActivity>();
      
      (data || []).forEach(session => {
        const zoneId = session.zone_id;
        const zoneName = (session.zone as any)?.name || 'Unknown Zone';
        
        if (zoneMap.has(zoneId)) {
          const existing = zoneMap.get(zoneId)!;
          existing.visitor_count += 1;
          // Keep the most recent entry time
          if (session.entered_at > existing.last_entry) {
            existing.last_entry = session.entered_at;
          }
        } else {
          zoneMap.set(zoneId, {
            zone_id: zoneId,
            zone_name: zoneName,
            visitor_count: 1,
            last_entry: session.entered_at
          });
        }
      });

      setZoneActivity(Array.from(zoneMap.values()));
    } catch (error: any) {
      console.error('Error fetching zone activity:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'destructive';
      case 'checked_in': return 'default';
      default: return 'secondary';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredVisitors = visitors.filter(visitor =>
    visitor.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visitor.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visitor.current_zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visitor.host_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overdueVisitors = visitors.filter(v => v.status === 'overdue');
  const activeZones = new Set(visitors.map(v => v.current_zone)).size;

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchActiveVisitors(), fetchZoneActivity()]);
    setLastUpdate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Alert */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          Real-time tracking active • Last updated: {formatDistanceToNow(lastUpdate, { addSuffix: true })}
        </AlertDescription>
      </Alert>

      {/* Zone Activity Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Activity Overview</CardTitle>
          <CardDescription>Current visitor distribution across zones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneActivity.map((zone) => (
              <div key={zone.zone_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{zone.zone_name}</h4>
                  <Badge variant="secondary">
                    {zone.visitor_count} visitor{zone.visitor_count !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last entry: {formatDistanceToNow(parseISO(zone.last_entry), { addSuffix: true })}
                </div>
                <Progress 
                  value={Math.min((zone.visitor_count / 10) * 100, 100)} 
                  className="mt-2 h-2"
                />
              </div>
            ))}
          </div>
          {zoneActivity.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No active zones with visitors
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitors.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently in building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Visitors</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueVisitors.length}</div>
            <p className="text-xs text-muted-foreground">
              Exceeded visit time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zones in Use</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeZones}</div>
            <p className="text-xs text-muted-foreground">
              Active zones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Search and List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Visitor Tracking</CardTitle>
              <CardDescription>Real-time location and status of all checked-in visitors</CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search visitors by name, company, zone, or host..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              aria-label="Search visitors by name, company, zone, or host"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading visitor data...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisitors.map((visitor) => (
                <Card key={visitor.id} className={`transition-all ${
                  visitor.status === 'overdue' ? 'border-destructive/50 bg-destructive/5' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(visitor.visitor_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{visitor.visitor_name}</h4>
                            <Badge variant={getStatusColor(visitor.status)}>
                              {visitor.status === 'overdue' ? 'OVERDUE' : 'ACTIVE'}
                            </Badge>
                            {visitor.status === 'overdue' && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Building className="h-3 w-3" />
                              <span>{visitor.company}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>Host: {visitor.host_name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span className="font-medium">Zone: {visitor.current_zone}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Duration: {visitor.visit_duration}</span>
                            </div>
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <strong>Purpose:</strong> {visitor.purpose}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Last Activity:</strong> {visitor.last_activity}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Button size="sm" variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          Track
                        </Button>
                        {visitor.status === 'overdue' && (
                          <Button size="sm" variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Alert
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && filteredVisitors.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No visitors match your search criteria' : 'No active visitors found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}