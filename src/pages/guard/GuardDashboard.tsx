import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  QrCode, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Eye,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeZoneData } from '@/hooks/useRealtimeZoneData';
import { usePermissions } from '@/hooks/usePermissions.tsx';
import { useToast } from '@/hooks/use-toast';
import { zoneSecurityService } from '@/services/zoneSecurityService';
import { GuardQRScanner } from '@/components/ZoneSecurity/GuardQRScanner';
import { 
  SecurityZone, 
  ZoneGuard, 
  ZoneAccessLog, 
  ZoneOccupancy, 
  ZoneSecurityAlert,
  ZoneStatistics 
} from '@/types/zoneTypes';

export default function GuardDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [assignedZones, setAssignedZones] = useState<SecurityZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<SecurityZone | null>(null);
  const [activeTab, setActiveTab] = useState('scanner');
  const [guardInfo, setGuardInfo] = useState<ZoneGuard | null>(null);

  // Use permissions hook with guard info
  const permissions = usePermissions(guardInfo);

  // Use real-time zone data hook
  const { 
    data: realtimeData, 
    loading, 
    error: realtimeError, 
    refreshData,
    isConnected 
  } = useRealtimeZoneData({
    guardId: profile?.id,
    enableLogs: true,
    enableAlerts: true,
    enableOccupancy: true,
    enableStatistics: true
  });

  useEffect(() => {
    if (profile && realtimeData.zones.length > 0) {
      fetchGuardAssignments();
    }
  }, [profile, realtimeData.zones]);

  const fetchGuardAssignments = async () => {
    if (!profile?.id) return;
    
    try {
      // Fetch guard's assigned zones
      const fetchedGuardInfo = await zoneSecurityService.getGuardById(profile.id);
      setGuardInfo(fetchedGuardInfo);
      
      if (fetchedGuardInfo?.assignedZones) {
        const assignedZonesList = realtimeData.zones.filter(zone => 
          fetchedGuardInfo.assignedZones.includes(zone.id)
        );
        setAssignedZones(assignedZonesList);
        
        if (assignedZonesList.length > 0 && !selectedZone) {
          setSelectedZone(assignedZonesList[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching guard assignments:', error);
      toast({
        title: 'Error loading dashboard',
        description: 'Failed to load guard dashboard data',
        variant: 'destructive'
      });
    }
  };

  const handleZoneSelect = (zone: SecurityZone) => {
    setSelectedZone(zone);
    setActiveTab('scanner');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'checked_in':
        return <Badge className="bg-blue-100 text-blue-800">Checked In</Badge>;
      case 'denied':
        return <Badge className="bg-red-100 text-red-800">Denied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAlertSeverity = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading guard dashboard...</p>
        </div>
      </div>
    );
  }

  if (assignedZones.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">No Zones Assigned</h2>
        <p className="text-muted-foreground">
          You haven't been assigned to any security zones yet. Contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guard Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${permissions.isOnDuty ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm font-medium ${permissions.isOnDuty ? 'text-green-600' : 'text-red-600'}`}>
            {permissions.isOnDuty ? 'On Duty' : 'Off Duty'}
          </span>
        </div>
      </div>

      {/* Off Duty Warning */}
      {!permissions.isOnDuty && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">You are currently off duty</p>
                <p className="text-sm text-yellow-700">Contact your supervisor to change your duty status to access zones.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {realtimeData.statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Today's Check-ins</p>
                  <p className="text-2xl font-bold">{realtimeData.statistics.todays_checkins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Visitors</p>
                  <p className="text-2xl font-bold">{realtimeData.statistics.active_visitors}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  <p className="text-2xl font-bold">{realtimeData.alerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Average</p>
                  <p className="text-2xl font-bold">{realtimeData.statistics.weekly_average}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Zone Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Assigned Zones
          </CardTitle>
          <CardDescription>
            Select a zone to manage access and scan QR codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedZones.map((zone) => (
              <Card 
                key={zone.id}
                className={`cursor-pointer transition-colors ${
                  selectedZone?.id === zone.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleZoneSelect(zone)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{zone.name}</h3>
                    <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                      {zone.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Security Level: {zone.security_level}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      {selectedZone && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger 
              value="scanner" 
              disabled={!permissions.canScanQR(selectedZone.id)}
            >
              QR Scanner
            </TabsTrigger>
            <TabsTrigger 
              value="occupancy"
              disabled={!permissions.canAccessZone(selectedZone.id)}
            >
              Occupancy
            </TabsTrigger>
            <TabsTrigger 
              value="logs"
              disabled={!permissions.canViewAccessLogs(selectedZone.id)}
            >
              Access Logs
            </TabsTrigger>
            <TabsTrigger 
              value="alerts"
              disabled={!permissions.canAccessZone(selectedZone.id)}
            >
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-4">
            {permissions.canScanQR(selectedZone.id) ? (
              <GuardQRScanner 
                zoneId={selectedZone.id}
                entryPointId={selectedZone.entry_points?.[0]?.id}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                  <p className="text-gray-600">You don't have QR scanning permissions for this zone.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="occupancy" className="space-y-4">
            {permissions.canAccessZone(selectedZone.id) ? (
              <Card>
                <CardHeader>
                  <CardTitle>Zone Occupancy</CardTitle>
                  <CardDescription>
                    Current visitor count and capacity for {selectedZone.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {realtimeData.occupancy.find(o => o.zone_id === selectedZone.id) ? (
                    <div className="space-y-4">
                      {realtimeData.occupancy
                        .filter(o => o.zone_id === selectedZone.id)
                        .map((occ) => (
                          <div key={occ.zone_id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Current Occupancy</span>
                              <Badge variant={occ.current_count > (occ.max_capacity * 0.8) ? 'destructive' : 'default'}>
                                {occ.current_count} / {occ.max_capacity}
                              </Badge>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((occ.current_count / occ.max_capacity) * 100, 100)}%` 
                                }}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              Last updated: {new Date(occ.last_updated).toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No occupancy data available</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                  <p className="text-muted-foreground">
                    You don't have permission to view occupancy data for this zone.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            {permissions.canViewAccessLogs(selectedZone.id) ? (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Access Logs</CardTitle>
                  <CardDescription>
                    Recent visitor check-ins and access attempts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {realtimeData.logs.length > 0 ? (
                      realtimeData.logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {log.access_granted ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">{log.visitor_name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.purpose}
                            </div>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(log.access_granted ? 'approved' : 'denied')}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No recent access logs</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                  <p className="text-muted-foreground">
                    You don't have permission to view access logs for this zone.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {permissions.canViewAccessLogs(selectedZone.id) ? (
              <Card>
                <CardHeader>
                  <CardTitle>Security Alerts</CardTitle>
                  <CardDescription>
                    Active security alerts and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {realtimeData.alerts.length > 0 ? (
                      realtimeData.alerts.map((alert) => (
                        <Alert key={alert.id}>
                          <AlertTriangle className="h-4 w-4" />
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <h4 className="font-medium">{alert.alert_type}</h4>
                              <AlertDescription>{alert.message}</AlertDescription>
                            </div>
                            <div className="text-right">
                              {getAlertSeverity(alert.severity)}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(alert.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </Alert>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No active alerts</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                  <p className="text-muted-foreground">
                    You don't have permission to view alerts for this zone.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}