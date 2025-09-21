import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, BarChart3, Users, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportData {
  total_visits: number;
  unique_visitors: number;
  avg_visit_duration: number;
  top_hosts: Array<{ name: string; count: number }>;
  zone_usage: Array<{ zone: string; count: number }>;
}

export function ReportsTab() {
  const [reportData, setReportData] = useState<ReportData>({
    total_visits: 0,
    unique_visitors: 0,
    avg_visit_duration: 0,
    top_hosts: [],
    zone_usage: []
  });
  const [dateRange, setDateRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Get total visits
      const { count: totalVisits } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get unique visitors
      const { data: uniqueVisitorsData } = await supabase
        .from('visit_requests')
        .select('visitor_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const uniqueVisitors = new Set(uniqueVisitorsData?.map(v => v.visitor_id)).size;

      // Get top hosts
      const { data: hostData } = await supabase
        .from('visit_requests')
        .select(`
          host_id,
          host:host_id(full_name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const hostCounts = hostData?.reduce((acc: any, visit: any) => {
        const hostName = visit.host?.full_name || 'Unknown';
        acc[hostName] = (acc[hostName] || 0) + 1;
        return acc;
      }, {});

      const topHosts = Object.entries(hostCounts || {})
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setReportData({
        total_visits: totalVisits || 0,
        unique_visitors: uniqueVisitors,
        avg_visit_duration: 2.5, // Placeholder - would need actual calculation
        top_hosts: topHosts,
        zone_usage: [] // Placeholder - would need zone access data
      });
    } catch (error: any) {
      toast({
        title: 'Error fetching report data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    // Create CSV content
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Visits', reportData.total_visits],
      ['Unique Visitors', reportData.unique_visitors],
      ['Average Visit Duration (hours)', reportData.avg_visit_duration],
      [''],
      ['Top Hosts', 'Visit Count'],
      ...reportData.top_hosts.map(host => [host.name, host.count])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitor-report-${dateRange}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Report exported',
      description: 'Report has been downloaded as CSV file.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visitor Reports</CardTitle>
              <CardDescription>Analytics and insights on visitor activity</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportReport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.total_visits}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.unique_visitors}</div>
            <p className="text-xs text-muted-foreground">
              Individual visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.avg_visit_duration}h</div>
            <p className="text-xs text-muted-foreground">
              Average visit time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Zones in use
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Hosts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Hosts</CardTitle>
          <CardDescription>Hosts with most visitor requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportData.top_hosts.map((host, index) => (
              <div key={host.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{host.name}</span>
                </div>
                <Badge>{host.count} visits</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}