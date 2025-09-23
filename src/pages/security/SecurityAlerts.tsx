import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  RefreshCw,
  Bell,
  AlertCircle,
  Info,
  Zap,
  Users,
  MapPin,
  Calendar,
  MoreHorizontal,
  ExternalLink,
  MessageSquare,
  UserCheck,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  Download
} from 'lucide-react';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface SecurityAlert {
  id: string;
  alert_type: 'capacity_exceeded' | 'unauthorized_access' | 'emergency' | 'maintenance';
  severity: number; // 1=low, 2=medium, 3=high, 4=critical
  title: string;
  message: string;
  zone_id?: string;
  zone_name?: string;
  visitor_id?: string;
  visitor_name?: string;
  is_active: boolean;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolver_name?: string;
  metadata?: any;
}

interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
  resolved_today: number;
  avg_resolution_time_hours: number;
}

export default function SecurityAlerts() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    alerts: realtimeAlerts,
    loading: realtimeLoading,
    resolveAlert,
    refetch: refetchRealtimeData
  } = useRealtimeZones();

  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    total_alerts: 0,
    active_alerts: 0,
    critical_alerts: 0,
    high_alerts: 0,
    medium_alerts: 0,
    low_alerts: 0,
    resolved_today: 0,
    avg_resolution_time_hours: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchAlertStats();
  }, []);

  // Merge realtime alerts with fetched alerts
  useEffect(() => {
    if (realtimeAlerts && realtimeAlerts.length > 0) {
      setAlerts(prevAlerts => {
        const realtimeAlertIds = realtimeAlerts.map(alert => alert.id);
        const filteredPrevAlerts = prevAlerts.filter(alert => !realtimeAlertIds.includes(alert.id));
        return [...realtimeAlerts, ...filteredPrevAlerts];
      });
    }
  }, [realtimeAlerts]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zone_alerts')
        .select(`
          *,
          zones:zone_id (name),
          profiles:resolved_by (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedAlerts = data?.map(alert => ({
        ...alert,
        zone_name: alert.zones?.name,
        resolver_name: alert.profiles?.full_name
      })) || [];

      setAlerts(formattedAlerts);
    } catch (error: any) {
      toast({
        title: 'Error fetching alerts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertStats = async () => {
    try {
      // Try to call the get_alert_statistics function
      const { data, error } = await supabase.rpc('get_alert_statistics');
      
      if (error) {
        // If the function doesn't exist, fall back to manual calculation
        console.warn('get_alert_statistics function not found, using fallback calculation');
        
        // Fetch alerts manually and calculate stats
        const { data: alertsData, error: alertsError } = await supabase
          .from('zone_alerts')
          .select('*');
          
        if (alertsError) throw alertsError;
        
        const alerts = alertsData || [];
        const activeAlerts = alerts.filter(alert => alert.is_active);
        const resolvedToday = alerts.filter(alert => 
          alert.resolved_at && 
          new Date(alert.resolved_at).toDateString() === new Date().toDateString()
        );
        
        // Calculate average resolution time
        const resolvedAlerts = alerts.filter(alert => alert.resolved_at);
        const avgResolutionHours = resolvedAlerts.length > 0 
          ? resolvedAlerts.reduce((sum, alert) => {
              const created = new Date(alert.created_at);
              const resolved = new Date(alert.resolved_at);
              return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
            }, 0) / resolvedAlerts.length
          : 0;
        
        const fallbackStats = {
          total_alerts: alerts.length,
          active_alerts: activeAlerts.length,
          critical_alerts: activeAlerts.filter(alert => alert.severity === 4).length,
          high_alerts: activeAlerts.filter(alert => alert.severity === 3).length,
          medium_alerts: activeAlerts.filter(alert => alert.severity === 2).length,
          low_alerts: activeAlerts.filter(alert => alert.severity === 1).length,
          resolved_today: resolvedToday.length,
          avg_resolution_time_hours: avgResolutionHours
        };
        
        setAlertStats(fallbackStats);
        return;
      }
      
      if (data && data.length > 0) {
        setAlertStats(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching alert statistics:', error);
      // Set default stats to prevent UI errors
      setAlertStats({
        total_alerts: 0,
        active_alerts: 0,
        critical_alerts: 0,
        high_alerts: 0,
        medium_alerts: 0,
        low_alerts: 0,
        resolved_today: 0,
        avg_resolution_time_hours: 0
      });
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchAlerts(),
      fetchAlertStats(),
      refetchRealtimeData()
    ]);
    setLoading(false);
  };

  const handleResolveAlert = async (alertId: string, notes?: string) => {
    if (!profile) return;
    
    setSubmitting(true);
    try {
      await resolveAlert(alertId, profile.id, notes);
      
      // Update local state
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { 
                ...alert, 
                is_active: false,
                resolved_at: new Date().toISOString(),
                resolved_by: profile.id,
                resolver_name: profile.full_name,
                metadata: { ...alert.metadata, notes: notes }
              }
            : alert
        )
      );

      await fetchAlertStats();
      
      toast({
        title: 'Alert resolved',
        description: 'The alert has been successfully resolved'
      });
      
      setShowAlertDialog(false);
      setSelectedAlert(null);
      setResolutionNotes('');
    } catch (error: any) {
      toast({
        title: 'Error resolving alert',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('zone_alerts')
        .update({ 
          metadata: { acknowledged: true, acknowledged_by: profile.id, acknowledged_at: new Date().toISOString() }
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, metadata: { ...alert.metadata, acknowledged: true } }
            : alert
        )
      );

      toast({
        title: 'Alert acknowledged',
        description: 'The alert has been acknowledged'
      });
    } catch (error: any) {
      toast({
        title: 'Error acknowledging alert',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-500 text-white';
    if (severity >= 3) return 'bg-orange-500 text-white';
    if (severity >= 2) return 'bg-yellow-500 text-black';
    return 'bg-blue-500 text-white';
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 4) return 'Critical';
    if (severity >= 3) return 'High';
    if (severity >= 2) return 'Medium';
    return 'Low';
  };

  const getStatusColor = (isActive: boolean, metadata?: any) => {
    if (!isActive) return 'bg-green-500 text-white';
    if (metadata?.acknowledged) return 'bg-yellow-500 text-black';
    return 'bg-red-500 text-white';
  };

  const getStatusText = (isActive: boolean, metadata?: any) => {
    if (!isActive) return 'Resolved';
    if (metadata?.acknowledged) return 'Acknowledged';
    return 'Active';
  };
  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'capacity_exceeded': return Users;
      case 'unauthorized_access': return Lock;
      case 'emergency': return AlertTriangle;
      case 'maintenance': return Info;
      default: return Bell;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.zone_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || alert.severity.toString() === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && alert.is_active) ||
      (selectedStatus === 'resolved' && !alert.is_active) ||
      (selectedStatus === 'acknowledged' && alert.metadata?.acknowledged && alert.is_active);
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeAlerts = filteredAlerts.filter(alert => alert.is_active && !alert.metadata?.acknowledged);
  const acknowledgedAlerts = filteredAlerts.filter(alert => alert.is_active && alert.metadata?.acknowledged);
  const resolvedAlerts = filteredAlerts.filter(alert => !alert.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Alerts</h1>
          <p className="text-muted-foreground">Monitor and manage security alerts in real-time</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{alertStats.total_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-red-600">{alertStats.active_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-orange-600">{alertStats.critical_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{alertStats.resolved_today}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold text-purple-600">
                  {alertStats.avg_resolution_time_hours > 0 
                    ? `${alertStats.avg_resolution_time_hours.toFixed(1)}h` 
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="4">Critical</SelectItem>
                <SelectItem value="3">High</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="1">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Alerts ({filteredAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="text-red-600">
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" className="text-yellow-600">
            Acknowledged ({acknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="text-green-600">
            Resolved ({resolvedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <AlertsTable 
            alerts={filteredAlerts}
            onViewAlert={(alert) => {
              setSelectedAlert(alert);
              setShowAlertDialog(true);
            }}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onResolveAlert={(alertId) => handleResolveAlert(alertId)}
            getSeverityColor={getSeverityColor}
            getSeverityText={getSeverityText}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            getAlertIcon={getAlertIcon}
          />
        </TabsContent>

        <TabsContent value="active">
          <AlertsTable 
            alerts={activeAlerts}
            onViewAlert={(alert) => {
              setSelectedAlert(alert);
              setShowAlertDialog(true);
            }}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onResolveAlert={(alertId) => handleResolveAlert(alertId)}
            getSeverityColor={getSeverityColor}
            getSeverityText={getSeverityText}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            getAlertIcon={getAlertIcon}
          />
        </TabsContent>

        <TabsContent value="acknowledged">
          <AlertsTable 
            alerts={acknowledgedAlerts}
            onViewAlert={(alert) => {
              setSelectedAlert(alert);
              setShowAlertDialog(true);
            }}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onResolveAlert={(alertId) => handleResolveAlert(alertId)}
            getSeverityColor={getSeverityColor}
            getSeverityText={getSeverityText}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            getAlertIcon={getAlertIcon}
          />
        </TabsContent>

        <TabsContent value="resolved">
          <AlertsTable 
            alerts={resolvedAlerts}
            onViewAlert={(alert) => {
              setSelectedAlert(alert);
              setShowAlertDialog(true);
            }}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onResolveAlert={(alertId) => handleResolveAlert(alertId)}
            getSeverityColor={getSeverityColor}
            getSeverityText={getSeverityText}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            getAlertIcon={getAlertIcon}
          />
        </TabsContent>
      </Tabs>

      {/* Alert Details Dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedAlert && (
                <>
                  {(() => {
                    const IconComponent = getAlertIcon(selectedAlert.alert_type);
                    return <IconComponent className="h-5 w-5" />;
                  })()}
                  <span>{selectedAlert.title}</span>
                  <Badge className={getSeverityColor(selectedAlert.severity)}>
                    {getSeverityText(selectedAlert.severity)}
                  </Badge>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Alert details and resolution options
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedAlert.is_active, selectedAlert.metadata)}>
                    {getStatusText(selectedAlert.is_active, selectedAlert.metadata)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">{format(parseISO(selectedAlert.created_at), 'PPpp')}</p>
                </div>
                {selectedAlert.zone_name && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Zone</p>
                    <p className="text-sm">{selectedAlert.zone_name}</p>
                  </div>
                )}
                {selectedAlert.visitor_name && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Visitor</p>
                    <p className="text-sm">{selectedAlert.visitor_name}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm bg-muted p-3 rounded-md">{selectedAlert.message}</p>
              </div>

              {selectedAlert.metadata?.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Resolution Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedAlert.metadata.notes}</p>
                </div>
              )}

              {selectedAlert.resolved_at && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resolved At</p>
                    <p className="text-sm">{format(parseISO(selectedAlert.resolved_at), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resolved By</p>
                    <p className="text-sm">{selectedAlert.resolver_name || 'Unknown'}</p>
                  </div>
                </div>
              )}

              {selectedAlert.is_active && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resolution Notes</label>
                    <Textarea
                      placeholder="Add notes about the resolution..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    {!selectedAlert.metadata?.acknowledged && (
                      <Button
                        variant="outline"
                        onClick={() => handleAcknowledgeAlert(selectedAlert.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      onClick={() => handleResolveAlert(selectedAlert.id, resolutionNotes)}
                      disabled={submitting}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {submitting ? 'Resolving...' : 'Resolve Alert'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AlertsTableProps {
  alerts: SecurityAlert[];
  onViewAlert: (alert: SecurityAlert) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  getSeverityColor: (severity: number) => string;
  getStatusColor: (status: string) => string;
  getAlertIcon: (alertType: string) => any;
}

function AlertsTable({ 
  alerts, 
  onViewAlert, 
  onAcknowledgeAlert, 
  onResolveAlert,
  getSeverityColor,
  getStatusColor,
  getAlertIcon
}: AlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No alerts found</h3>
          <p className="text-sm text-muted-foreground">
            No security alerts match your current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => {
                const IconComponent = getAlertIcon(alert.alert_type);
                return (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex items-start space-x-3">
                        <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {getSeverityText(alert.severity)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(alert.is_active ? 'active' : 'resolved')}>
                        {alert.is_active ? 'ACTIVE' : 'RESOLVED'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {alert.zone_name ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{alert.zone_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDistanceToNow(parseISO(alert.created_at), { addSuffix: true })}</p>
                        <p className="text-muted-foreground">
                          {format(parseISO(alert.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewAlert(alert)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {alert.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAcknowledgeAlert(alert.id)}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onResolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}