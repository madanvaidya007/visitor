import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedQRScanner } from '../security/EnhancedQRScanner';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Activity, 
  Eye, 
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Zap,
  Scan,
  Radio,
  UserCheck,
  Building,
  QrCode
} from 'lucide-react';
import { CustomLogo } from '@/components/ui/CustomLogo';
import { useRealtimeZoneData } from '@/hooks/useRealtimeZoneData';
import { SecurityZone, ZoneAccessLog, ZoneSecurityAlert } from '@/types/zoneTypes';
import '../../styles/progress-bars.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QRScannerTab } from '@/components/security/QRScannerTab';
import { ZoneMonitoringTab } from '@/components/security/ZoneMonitoringTab';
import { SecurityAlertsTab } from '@/components/security/SecurityAlertsTab';
import { VisitorTrackingTab } from '@/components/security/VisitorTrackingTab';
import { FaceRecognitionDashboard } from '@/components/FaceRecognition/FaceRecognitionDashboard';

interface SecurityStats {
  active_visitors: number;
  zones_occupied: number;
  security_alerts: number;
  recent_activities: number;
}

interface ZoneOccupancy {
  zone_name: string;
  current_count: number;
  max_capacity: number;
  zone_type: string;
}

export function SecurityDashboard() {
  const [securityStats, setSecurityStats] = useState<SecurityStats>({
    active_visitors: 0,
    zones_occupied: 0,
    security_alerts: 0,
    recent_activities: 0
  });
  const [zoneOccupancy, setZoneOccupancy] = useState<ZoneOccupancy[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityStats();
    fetchZoneOccupancy();
    fetchRecentAlerts();
    
    // Set up real-time subscriptions
    const channel = supabase
      .channel('security-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'visit_requests' },
        () => {
          fetchSecurityStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'visit_logs' },
        () => {
          fetchSecurityStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'zone_occupancy' },
        () => {
          fetchZoneOccupancy();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'zone_alerts' },
        () => {
          fetchRecentAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSecurityStats = async () => {
    try {
      // Get active visitors (checked in)
      const { count: activeVisitors } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'checked_in');

      // Get recent activities (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: recentActivities } = await supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneHourAgo);

      setSecurityStats({
        active_visitors: activeVisitors || 0,
        zones_occupied: 0, // Will be calculated from zone occupancy
        security_alerts: 0, // Placeholder for future alerts system
        recent_activities: recentActivities || 0
      });
    } catch (error: any) {
      console.error('Error fetching security stats:', error);
    }
  };

  const fetchZoneOccupancy = async () => {
    try {
      // Fetch real zone occupancy data from the database
      const { data: occupancyData, error } = await supabase
        .from('zone_occupancy')
        .select(`
          current_count,
          max_capacity,
          zone:zones!zone_occupancy_zone_id_fkey(
            name,
            zone_type
          )
        `)
        .order('current_count', { ascending: false });

      if (error) throw error;

      // Transform the data to match the expected format
      const formattedOccupancy = (occupancyData || []).map(item => ({
        zone_name: item.zone?.name || 'Unknown Zone',
        current_count: item.current_count || 0,
        max_capacity: item.max_capacity || 0,
        zone_type: item.zone?.zone_type || 'general'
      }));

      setZoneOccupancy(formattedOccupancy);
      
      // Update zones occupied count
      const occupiedZones = formattedOccupancy.filter(z => z.current_count > 0).length;
      setSecurityStats(prev => ({ ...prev, zones_occupied: occupiedZones }));
    } catch (error: any) {
      console.error('Error fetching zone occupancy:', error);
      // Fallback to empty data on error
      setZoneOccupancy([]);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      // Fetch real security alerts from the zone_alerts table
      const { data: alertsData, error } = await supabase
        .from('zone_alerts')
        .select(`
          id,
          alert_type,
          severity,
          title,
          message,
          is_active,
          created_at,
          metadata,
          zone:zones!zone_alerts_zone_id_fkey(
            name,
            zone_type
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      setRecentAlerts(alertsData || []);
      
      // Update security alerts count
      const activeAlertsCount = (alertsData || []).length;
      setSecurityStats(prev => ({ ...prev, security_alerts: activeAlertsCount }));
    } catch (error: any) {
      console.error('Error fetching recent alerts:', error);
      setRecentAlerts([]);
    }
  };

  const getZoneStatusColor = (current: number, max: number): 'default' | 'destructive' | 'secondary' => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'secondary';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Security Dashboard</h1>
        <p className="text-white/90">Monitor access points and visitor tracking</p>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{securityStats.active_visitors}</div>
            <p className="text-xs text-muted-foreground">
              Currently in building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zones Occupied</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.zones_occupied}</div>
            <p className="text-xs text-muted-foreground">
              Areas with visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{securityStats.security_alerts}</div>
            <p className="text-xs text-muted-foreground">
              Active alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.recent_activities}</div>
            <p className="text-xs text-muted-foreground">
              Last hour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Zone Occupancy Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Occupancy</CardTitle>
          <CardDescription>Real-time occupancy status of all zones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneOccupancy.map((zone) => (
              <div key={zone.zone_name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{zone.zone_name}</h4>
                  <Badge className={`capitalize`}>
                    {zone.zone_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {zone.current_count} / {zone.max_capacity}
                  </span>
                      <Badge variant={getZoneStatusColor(zone.current_count, zone.max_capacity)}>
                        {Math.round((zone.current_count / zone.max_capacity) * 100)}%
                      </Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div 
                  className={`security-dashboard-bar h-2 rounded-full transition-all duration-300 ${
                    getZoneStatusColor(zone.current_count, zone.max_capacity) === 'destructive' 
                      ? 'bg-destructive' 
                      : getZoneStatusColor(zone.current_count, zone.max_capacity) === 'secondary'
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${(zone.current_count / zone.max_capacity) * 100}%` }}
                />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Operations */}
      <Tabs defaultValue="scanner" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scanner">
            <QrCode className="mr-2 h-4 w-4" />
            QR Scanner
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Eye className="mr-2 h-4 w-4" />
            Zone Monitor
          </TabsTrigger>
          <TabsTrigger value="face-recognition">
            <UserCheck className="mr-2 h-4 w-4" />
            Face Recognition
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <Radio className="mr-2 h-4 w-4" />
            Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner">
          <QRScannerTab onScanSuccess={fetchSecurityStats} />
        </TabsContent>

        <TabsContent value="monitoring">
          <ZoneMonitoringTab 
            zoneOccupancy={zoneOccupancy}
            onUpdate={fetchZoneOccupancy}
          />
        </TabsContent>

        <TabsContent value="face-recognition">
          <FaceRecognitionDashboard />
        </TabsContent>

        <TabsContent value="alerts">
          <SecurityAlertsTab alerts={recentAlerts} />
        </TabsContent>

        <TabsContent value="tracking">
          <VisitorTrackingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}