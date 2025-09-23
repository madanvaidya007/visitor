import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, 
  Users, 
  Shield, 
  Key, 
  Building, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  UserCheck, 
  Clock, 
  Activity, 
  Settings,
  RefreshCw,
  Lock,
  Unlock,
  UserPlus,
  Calendar,
  BarChart3,
  Zap,
  AlertCircle,
  Info,
  Loader2,
  Bell,
  XCircle,
  TrendingUp,
  Wifi,
  WifiOff,
  UserX,
  Building2,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeZoneData } from '@/hooks/useRealtimeZoneData';

interface Zone {
  id: string;
  name: string;
  description?: string;
  zone_type: 'lobby' | 'office' | 'meeting_room' | 'lab' | 'server_room' | 'parking' | 'restricted';
  max_capacity?: number;
  requires_escort: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_occupancy?: number;
}

interface ZoneAccess {
  id: string;
  visit_request_id: string;
  zone_id: string;
  granted_at: string;
  granted_by: string;
  zone: Zone;
  visit_request: {
    id: string;
    visitor: {
      id: string;
      full_name: string;
      email: string;
      company?: string;
      photo_url?: string;
    };
    purpose: string;
    visit_date: string;
    start_time: string;
    end_time: string;
    status: string;
  };
}

interface Visitor {
  id: string;
  full_name: string;
  email: string;
  company?: string;
  photo_url?: string;
}

interface VisitRequest {
  id: string;
  visitor: Visitor;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface ZoneAccessForm {
  visit_request_id: string;
  zone_ids: string[];
  notes: string;
}

export default function ZoneAccess() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Real-time zone data hook
  const realtimeData = useRealtimeZoneData({
    enableZones: true,
    enableOccupancy: true,
    enableLogs: true,
    enableAlerts: true,
    enableStatistics: true
  });
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneAccesses, setZoneAccesses] = useState<ZoneAccess[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZoneType, setSelectedZoneType] = useState<string>('all');
  const [selectedVisitRequest, setSelectedVisitRequest] = useState<VisitRequest | null>(null);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  
  const [accessForm, setAccessForm] = useState<ZoneAccessForm>({
    visit_request_id: '',
    zone_ids: [],
    notes: ''
  });

  // Use real-time statistics instead of local state
  const stats = {
    total_zones: realtimeData.statistics?.total_zones || 0,
    active_zones: realtimeData.statistics?.active_zones || 0,
    restricted_zones: realtimeData.statistics?.restricted_zones || 0,
    current_visitors: realtimeData.statistics?.current_visitors || 0
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchZones(),
        fetchZoneAccesses(),
        fetchVisitRequests()
      ]);
    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    // Use real-time zones data if available, otherwise fetch from database
    if (realtimeData.zones && realtimeData.zones.length > 0) {
      const zonesWithOccupancy = realtimeData.zones.map(zone => {
        const occupancy = realtimeData.occupancy.find(occ => occ.zone_id === zone.id);
        return {
          ...zone,
          current_occupancy: occupancy?.current_count || 0
        };
      });
      setZones(zonesWithOccupancy);
      return;
    }

    // Fallback to database fetch
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Merge zones with real-time occupancy data
    const zonesWithOccupancy = (data || []).map(zone => {
      const occupancy = realtimeData.occupancy.find(occ => occ.zone_id === zone.id);
      return {
        ...zone,
        current_occupancy: occupancy?.current_count || 0
      };
    });
    
    setZones(zonesWithOccupancy);
  };

  const fetchZoneAccesses = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('zone_access')
      .select(`
        *,
        zone:zones(*),
        visit_request:visit_requests(
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(
            id,
            full_name,
            email,
            company,
            photo_url
          )
        )
      `)
      .eq('granted_by', profile.id)
      .order('granted_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    setZoneAccesses(data || []);
  };

  const fetchVisitRequests = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('visit_requests')
      .select(`
        *,
        visitor:profiles!visit_requests_visitor_id_fkey(
          id,
          full_name,
          email,
          company,
          photo_url
        )
      `)
      .eq('host_id', profile.id)
      .eq('status', 'approved')
      .gte('visit_date', format(new Date(), 'yyyy-MM-dd'))
      .order('visit_date', { ascending: true });

    if (error) throw error;
    setVisitRequests(data || []);
  };

  const grantZoneAccess = async () => {
    if (!profile || !selectedVisitRequest || accessForm.zone_ids.length === 0) return;

    setSubmitting(true);
    try {
      const accessRecords = accessForm.zone_ids.map(zoneId => ({
        visit_request_id: selectedVisitRequest.id,
        zone_id: zoneId,
        granted_by: profile.id
      }));

      const { error } = await supabase
        .from('zone_access')
        .insert(accessRecords);

      if (error) throw error;

      toast({
        title: 'Zone access granted',
        description: `Access granted to ${accessForm.zone_ids.length} zone(s) for ${selectedVisitRequest.visitor.full_name}`
      });

      // Reset form and close dialog
      setAccessForm({
        visit_request_id: '',
        zone_ids: [],
        notes: ''
      });
      setSelectedVisitRequest(null);
      setShowAccessDialog(false);

      // Refresh data
      await fetchZoneAccesses();
    } catch (error: any) {
      toast({
        title: 'Error granting access',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const revokeZoneAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('zone_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: 'Zone access revoked',
        description: 'Access has been successfully revoked'
      });

      await fetchZoneAccesses();
    } catch (error: any) {
      toast({
        title: 'Error revoking access',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case 'lobby': return <Building className="h-4 w-4" />;
      case 'office': return <Users className="h-4 w-4" />;
      case 'meeting_room': return <Users className="h-4 w-4" />;
      case 'lab': return <Zap className="h-4 w-4" />;
      case 'server_room': return <Shield className="h-4 w-4" />;
      case 'parking': return <MapPin className="h-4 w-4" />;
      case 'restricted': return <Lock className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getZoneTypeColor = (type: string) => {
    switch (type) {
      case 'lobby': return 'bg-blue-100 text-blue-800';
      case 'office': return 'bg-green-100 text-green-800';
      case 'meeting_room': return 'bg-purple-100 text-purple-800';
      case 'lab': return 'bg-orange-100 text-orange-800';
      case 'server_room': return 'bg-red-100 text-red-800';
      case 'parking': return 'bg-gray-100 text-gray-800';
      case 'restricted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOccupancyStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return { color: 'text-red-600', status: 'Critical' };
    if (percentage >= 70) return { color: 'text-yellow-600', status: 'High' };
    if (percentage >= 40) return { color: 'text-blue-600', status: 'Moderate' };
    return { color: 'text-green-600', status: 'Low' };
  };

  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedZoneType === 'all' || zone.zone_type === selectedZoneType;
    return matchesSearch && matchesType;
  });

  const openAccessDialog = (visitRequest: VisitRequest) => {
    setSelectedVisitRequest(visitRequest);
    setAccessForm(prev => ({
      ...prev,
      visit_request_id: visitRequest.id,
      zone_ids: []
    }));
    setShowAccessDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zone Access Management</h1>
          <p className="text-muted-foreground">Manage facility zones and visitor access permissions</p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Real-time Alerts Banner */}
      {alerts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {alerts.length} active alert{alerts.length > 1 ? 's' : ''} require attention
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAlertDialog(true)}
            >
              <Bell className="h-3 w-3 mr-1" />
              View Alerts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview with Real-time Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Zones</p>
                <p className="text-2xl font-bold">{stats.total_zones}</p>
              </div>
              <div className="flex flex-col items-center">
                <Building className="h-8 w-8 text-blue-500" />
                {!realtimeLoading && <Wifi className="h-3 w-3 text-green-500 mt-1" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Zones</p>
                <p className="text-2xl font-bold">{stats.active_zones}</p>
              </div>
              <div className="flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                {!realtimeLoading && <Wifi className="h-3 w-3 text-green-500 mt-1" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Restricted Zones</p>
                <p className="text-2xl font-bold">{stats.restricted_zones}</p>
              </div>
              <div className="flex flex-col items-center">
                <Shield className="h-8 w-8 text-red-500" />
                {!realtimeLoading && <Wifi className="h-3 w-3 text-green-500 mt-1" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Visitors</p>
                <p className="text-2xl font-bold">{stats.current_visitors}</p>
                {statistics.zones_at_capacity > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    {statistics.zones_at_capacity} zone{statistics.zones_at_capacity > 1 ? 's' : ''} at capacity
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center">
                <Users className="h-8 w-8 text-purple-500" />
                {!realtimeLoading && <Wifi className="h-3 w-3 text-green-500 mt-1" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="zones" className="space-y-6">
        <TabsList>
          <TabsTrigger value="zones">Zone Overview</TabsTrigger>
          <TabsTrigger value="access">Access Management</TabsTrigger>
          <TabsTrigger value="permissions">Active Permissions</TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Real-time Monitoring
          </TabsTrigger>
        </TabsList>

        {/* Zone Overview Tab */}
        <TabsContent value="zones" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search zones by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedZoneType} onValueChange={setSelectedZoneType}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lobby">Lobby</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="meeting_room">Meeting Room</SelectItem>
                    <SelectItem value="lab">Laboratory</SelectItem>
                    <SelectItem value="server_room">Server Room</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => {
              const occupancyStatus = zone.max_capacity ? 
                getOccupancyStatus(zone.current_occupancy || 0, zone.max_capacity) : 
                { color: 'text-gray-600', status: 'N/A' };

              return (
                <Card key={zone.id} className={`relative ${!zone.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getZoneTypeIcon(zone.zone_type)}
                        <CardTitle className="text-lg">{zone.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={getZoneTypeColor(zone.zone_type)}>
                        {zone.zone_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    {zone.description && (
                      <CardDescription>{zone.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Occupancy */}
                    {zone.max_capacity && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Occupancy</span>
                          <span className={occupancyStatus.color}>
                            {zone.current_occupancy}/{zone.max_capacity} ({occupancyStatus.status})
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              occupancyStatus.status === 'Critical' ? 'bg-red-500' :
                              occupancyStatus.status === 'High' ? 'bg-yellow-500' :
                              occupancyStatus.status === 'Moderate' ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min((zone.current_occupancy || 0) / zone.max_capacity * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Zone Properties */}
                    <div className="flex items-center justify-between text-sm">
                      <span>Requires Escort</span>
                      <Badge variant={zone.requires_escort ? 'destructive' : 'secondary'}>
                        {zone.requires_escort ? 'Yes' : 'No'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>Status</span>
                      <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Analytics
                      </Button>
                    </div>
                  </CardContent>

                  {/* Status Indicator */}
                  {!zone.is_active && (
                    <div className="absolute top-2 right-2">
                      <div className="h-3 w-3 bg-gray-400 rounded-full" />
                    </div>
                  )}
                  {zone.requires_escort && (
                    <div className="absolute top-2 left-2">
                      <Shield className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Access Management Tab */}
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grant Zone Access</CardTitle>
              <CardDescription>Assign zone access permissions to approved visitors</CardDescription>
            </CardHeader>
            <CardContent>
              {visitRequests.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Approved Visits</h3>
                  <p className="text-muted-foreground">There are no approved visit requests that need zone access assignment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visitRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.visitor.photo_url || ''} alt={request.visitor.full_name} />
                            <AvatarFallback>
                              {request.visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{request.visitor.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{request.visitor.email}</p>
                            {request.visitor.company && (
                              <p className="text-sm text-muted-foreground">{request.visitor.company}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{request.purpose}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(request.visit_date), 'MMM dd, yyyy')}</span>
                            <Clock className="h-3 w-3" />
                            <span>{request.start_time} - {request.end_time}</span>
                          </div>
                        </div>
                        <Button onClick={() => openAccessDialog(request)}>
                          <Key className="h-4 w-4 mr-2" />
                          Grant Access
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Zone Permissions</CardTitle>
              <CardDescription>Currently granted zone access permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {zoneAccesses.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Permissions</h3>
                  <p className="text-muted-foreground">No zone access permissions have been granted yet.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitor</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>Visit Details</TableHead>
                        <TableHead>Granted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zoneAccesses.map((access) => (
                        <TableRow key={access.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={access.visit_request.visitor.photo_url || ''} alt={access.visit_request.visitor.full_name} />
                                <AvatarFallback className="text-xs">
                                  {access.visit_request.visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{access.visit_request.visitor.full_name}</p>
                                <p className="text-xs text-muted-foreground">{access.visit_request.visitor.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getZoneTypeIcon(access.zone.zone_type)}
                              <div>
                                <p className="font-medium text-sm">{access.zone.name}</p>
                                <Badge variant="secondary" className={`text-xs ${getZoneTypeColor(access.zone.zone_type)}`}>
                                  {access.zone.zone_type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{access.visit_request.purpose}</p>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(access.visit_request.visit_date), 'MMM dd')}</span>
                                <Clock className="h-3 w-3" />
                                <span>{access.visit_request.start_time}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(access.granted_at), 'MMM dd, HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => revokeZoneAccess(access.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          {/* Live Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Zone Activity
                  {!realtimeLoading && <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />}
                </CardTitle>
                <CardDescription>Real-time zone entry and exit logs</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {entryLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {entryLogs.slice(0, 20).map((log) => (
                        <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className={`p-2 rounded-full ${
                            log.action === 'entry' ? 'bg-green-100 text-green-600' : 
                            log.action === 'exit' ? 'bg-blue-100 text-blue-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {log.action === 'entry' ? <UserCheck className="h-4 w-4" /> : 
                             log.action === 'exit' ? <UserX className="h-4 w-4" /> :
                             <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{log.visitor.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.action === 'entry' ? 'Entered' : 
                               log.action === 'exit' ? 'Exited' : 'Alert in'} {log.zone.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), 'HH:mm:ss')}
                            </p>
                          </div>
                          {log.notes && (
                            <div className="text-xs text-muted-foreground max-w-32 truncate">
                              {log.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Zone Occupancy Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Zone Occupancy Status
                </CardTitle>
                <CardDescription>Current occupancy levels across all zones</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {zoneOccupancy.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No occupancy data available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {zoneOccupancy.map((occupancy) => {
                        const zone = zones.find(z => z.id === occupancy.zone_id);
                        if (!zone) return null;
                        
                        const occupancyPercentage = occupancy.max_capacity 
                          ? (occupancy.current_count / occupancy.max_capacity) * 100 
                          : 0;
                        
                        return (
                          <div key={occupancy.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getZoneTypeIcon(zone.zone_type)}
                                <span className="font-medium text-sm">{zone.name}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {occupancy.current_count}/{occupancy.max_capacity || '∞'}
                              </div>
                            </div>
                            {occupancy.max_capacity && (
                              <Progress 
                                value={occupancyPercentage} 
                                className={`h-2 ${
                                  occupancyPercentage >= 100 ? 'bg-red-100' :
                                  occupancyPercentage >= 80 ? 'bg-orange-100' :
                                  'bg-green-100'
                                }`}
                              />
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Last updated: {format(new Date(occupancy.last_updated), 'HH:mm:ss')}</span>
                              {occupancyPercentage >= 100 && (
                                <Badge variant="destructive" className="text-xs">At Capacity</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Active Zone Sessions
              </CardTitle>
              <CardDescription>Visitors currently inside zones</CardDescription>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active sessions</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitor</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>Entered At</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={session.visitor.photo_url || ''} alt={session.visitor.full_name} />
                                <AvatarFallback className="text-xs">
                                  {session.visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{session.visitor.full_name}</p>
                                <p className="text-xs text-muted-foreground">{session.visitor.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getZoneTypeIcon(session.zone.zone_type)}
                              <span className="font-medium">{session.zone.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(session.entered_at), 'MMM dd, HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {Math.floor((Date.now() - new Date(session.entered_at).getTime()) / (1000 * 60))} min
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => logZoneAccess(
                                session.zone_id,
                                session.visitor_id,
                                session.visit_request_id,
                                'exit',
                                profile?.id,
                                undefined,
                                'Manual exit logged by host'
                              )}
                            >
                              <UserX className="h-3 w-3 mr-1" />
                              Log Exit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts Dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Active Zone Alerts</DialogTitle>
            <DialogDescription>
              {alerts.length} active alert{alerts.length > 1 ? 's' : ''} requiring attention
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-4 ${
                  alert.severity >= 3 ? 'border-red-200 bg-red-50' :
                  alert.severity >= 2 ? 'border-orange-200 bg-orange-50' :
                  'border-yellow-200 bg-yellow-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        alert.severity >= 3 ? 'bg-red-100 text-red-600' :
                        alert.severity >= 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Zone: {alert.zone.name}</span>
                          <span>Type: {alert.alert_type.replace('_', ' ')}</span>
                          <span>Created: {format(new Date(alert.created_at), 'MMM dd, HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id, profile?.id || '')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grant Zone Access</DialogTitle>
            <DialogDescription>
              Select zones to grant access to {selectedVisitRequest?.visitor.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVisitRequest && (
            <div className="space-y-6">
              {/* Visitor Info */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedVisitRequest.visitor.photo_url || ''} alt={selectedVisitRequest.visitor.full_name} />
                    <AvatarFallback>
                      {selectedVisitRequest.visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{selectedVisitRequest.visitor.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedVisitRequest.visitor.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedVisitRequest.purpose}</p>
                  </div>
                </div>
              </div>

              {/* Zone Selection */}
              <div className="space-y-4">
                <Label>Select Zones to Grant Access</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {zones.filter(z => z.is_active).map((zone) => (
                    <div
                      key={zone.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        accessForm.zone_ids.includes(zone.id) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setAccessForm(prev => ({
                          ...prev,
                          zone_ids: prev.zone_ids.includes(zone.id)
                            ? prev.zone_ids.filter(id => id !== zone.id)
                            : [...prev.zone_ids, zone.id]
                        }));
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getZoneTypeIcon(zone.zone_type)}
                          <div>
                            <p className="font-medium text-sm">{zone.name}</p>
                            <Badge variant="secondary" className={`text-xs ${getZoneTypeColor(zone.zone_type)}`}>
                              {zone.zone_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        {zone.requires_escort && (
                          <Shield className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="access_notes">Additional Notes</Label>
                <Textarea
                  id="access_notes"
                  placeholder="Any special instructions or conditions..."
                  value={accessForm.notes}
                  onChange={(e) => setAccessForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAccessDialog(false);
                    setSelectedVisitRequest(null);
                    setAccessForm({ visit_request_id: '', zone_ids: [], notes: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={grantZoneAccess}
                  disabled={submitting || accessForm.zone_ids.length === 0}
                  className="flex-1"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Grant Access ({accessForm.zone_ids.length} zones)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}