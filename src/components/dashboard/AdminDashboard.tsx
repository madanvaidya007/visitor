import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  MapPin, 
  BarChart3, 
  Settings,
  AlertTriangle,
  Building,
  Clock,
  UserCheck,
  Calendar,
  FileText,
  Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { ZoneManagementTab } from '@/components/admin/ZoneManagementTab';
import { ReportsTab } from '@/components/admin/ReportsTab';
import { SystemSettingsTab } from '@/components/admin/SystemSettingsTab';

interface SystemStats {
  total_users: number;
  total_zones: number;
  total_visits_today: number;
  active_visitors: number;
  pending_requests: number;
}

export function AdminDashboard() {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    total_users: 0,
    total_zones: 0,
    total_visits_today: 0,
    active_visitors: 0,
    pending_requests: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemStats();
    fetchRecentActivity();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get zone count
      const { count: zoneCount } = await supabase
        .from('zones')
        .select('*', { count: 'exact', head: true });

      // Get today's visits
      const { count: todayVisits } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('visit_date', today);

      // Get active visitors
      const { count: activeVisitors } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'checked_in');

      // Get pending requests
      const { count: pendingRequests } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setSystemStats({
        total_users: userCount || 0,
        total_zones: zoneCount || 0,
        total_visits_today: todayVisits || 0,
        active_visitors: activeVisitors || 0,
        pending_requests: pendingRequests || 0
      });
    } catch (error: any) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`
          id,
          action,
          timestamp,
          visit_request:visit_request_id(
            purpose,
            visitor:visitor_id(full_name)
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivity(data || []);
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-white/90">Manage system settings and user permissions</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.total_zones}</div>
            <p className="text-xs text-muted-foreground">
              Configured zones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.total_visits_today}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{systemStats.active_visitors}</div>
            <p className="text-xs text-muted-foreground">
              Currently in building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-pending" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pending">{systemStats.pending_requests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="zones">
            <MapPin className="mr-2 h-4 w-4" />
            Zones
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagementTab onUserUpdate={fetchSystemStats} />
        </TabsContent>

        <TabsContent value="zones">
          <ZoneManagementTab onZoneUpdate={fetchSystemStats} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system activities and visitor actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent rounded-full">
                    {activity.action === 'check_in' ? (
                      <UserCheck className="h-4 w-4 text-success" />
                    ) : activity.action === 'check_out' ? (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {activity.visit_request?.visitor?.full_name || 'Unknown Visitor'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action.replace('_', ' ').toUpperCase()} - {activity.visit_request?.purpose}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}