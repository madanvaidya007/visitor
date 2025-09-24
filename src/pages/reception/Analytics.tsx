import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Building, 
  Shield,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  UserCheck,
  UserX,
  Timer,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Filter
} from 'lucide-react';

interface AnalyticsData {
  totalVisitors: number;
  activeVisitors: number;
  completedVisits: number;
  averageVisitDuration: number;
  peakHours: string;
  topCompanies: Array<{ name: string; count: number }>;
  visitorTrends: Array<{ date: string; visitors: number; completed: number }>;
  statusDistribution: Array<{ status: string; count: number; color: string }>;
  hourlyDistribution: Array<{ hour: string; visitors: number }>;
  departmentVisits: Array<{ department: string; visits: number }>;
  securityIncidents: number;
  repeatVisitors: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const STATUS_COLORS = {
  'Pending': '#FFA500',
  'Approved': '#00C49F',
  'In Progress': '#0088FE',
  'Completed': '#82CA9D',
  'Rejected': '#FF8042',
  'Cancelled': '#FF6B6B'
};

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement actual analytics data fetching from database
      // const { data, error } = await supabase.rpc('get_analytics_data', {
      //   start_date: dateRange.from,
      //   end_date: dateRange.to,
      //   period: selectedPeriod
      // });
      
      // if (error) throw error;
      // setAnalyticsData(data);
      
      // For now, show empty analytics until database implementation
      setAnalyticsData({
        totalVisitors: 0,
        activeVisitors: 0,
        completedVisits: 0,
        averageVisitDuration: 0,
        peakHours: 'N/A',
        topCompanies: [],
        visitorTrends: [],
        statusDistribution: [],
        hourlyDistribution: [],
        departmentVisits: [],
        securityIncidents: 0,
        repeatVisitors: 0
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    let from: Date;

    switch (period) {
      case '7d':
        from = subDays(now, 7);
        break;
      case '30d':
        from = subDays(now, 30);
        break;
      case '90d':
        from = subDays(now, 90);
        break;
      case '1y':
        from = subDays(now, 365);
        break;
      default:
        from = subDays(now, 30);
    }

    setDateRange({ from, to: now });
  };

  const exportAnalytics = () => {
    if (!analyticsData) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Visitors', analyticsData.totalVisitors.toString()],
      ['Active Visitors', analyticsData.activeVisitors.toString()],
      ['Completed Visits', analyticsData.completedVisits.toString()],
      ['Average Visit Duration (minutes)', analyticsData.averageVisitDuration.toString()],
      ['Peak Hours', analyticsData.peakHours],
      ['Security Incidents', analyticsData.securityIncidents.toString()],
      ['Repeat Visitors', analyticsData.repeatVisitors.toString()],
      [''],
      ['Top Companies', 'Visit Count'],
      ...analyticsData.topCompanies.map(company => [company.name, company.count.toString()]),
      [''],
      ['Department', 'Visits'],
      ...analyticsData.departmentVisits.map(dept => [dept.department, dept.visits.toString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Analytics data exported to CSV',
    });
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && trendValue !== undefined && (
              <div className={`flex items-center mt-1 text-sm ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : trend === 'down' ? (
                  <TrendingDown className="h-4 w-4 mr-1" />
                ) : null}
                {Math.abs(trendValue).toFixed(1)}% from last period
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 text-${color}-600`} />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Visitor insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Visitors"
              value={analyticsData.totalVisitors.toLocaleString()}
              icon={Users}
              trend="up"
              trendValue={12.5}
              color="blue"
            />
            <MetricCard
              title="Active Visitors"
              value={analyticsData.activeVisitors}
              icon={UserCheck}
              trend="up"
              trendValue={8.3}
              color="green"
            />
            <MetricCard
              title="Completed Visits"
              value={analyticsData.completedVisits.toLocaleString()}
              icon={CheckCircle}
              trend="up"
              trendValue={15.2}
              color="emerald"
            />
            <MetricCard
              title="Avg. Duration"
              value={`${analyticsData.averageVisitDuration}m`}
              icon={Timer}
              trend="down"
              trendValue={3.1}
              color="orange"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visitor Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Visitor Trends
                </CardTitle>
                <CardDescription>Daily visitor activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.visitorTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="visitors" 
                      stackId="1"
                      stroke="#0088FE" 
                      fill="#0088FE" 
                      fillOpacity={0.6}
                      name="Total Visitors"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stackId="2"
                      stroke="#00C49F" 
                      fill="#00C49F" 
                      fillOpacity={0.6}
                      name="Completed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Visit Status Distribution
                </CardTitle>
                <CardDescription>Current status of all visits</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Peak Hours"
              value={analyticsData.peakHours}
              icon={Clock}
              color="purple"
            />
            <MetricCard
              title="Security Incidents"
              value={analyticsData.securityIncidents}
              icon={Shield}
              trend="down"
              trendValue={25.0}
              color="red"
            />
            <MetricCard
              title="Repeat Visitors"
              value={analyticsData.repeatVisitors}
              icon={RefreshCw}
              trend="up"
              trendValue={18.7}
              color="indigo"
            />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Hourly Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Hourly Visitor Distribution
              </CardTitle>
              <CardDescription>Visitor traffic by hour of day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="visitors" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Visits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Department Visit Distribution
              </CardTitle>
              <CardDescription>Visits by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.departmentVisits} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="department" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="visits" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          {/* Top Companies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Top Visiting Companies
              </CardTitle>
              <CardDescription>Companies with most visits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topCompanies.map((company, index) => (
                  <div key={company.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.count} visits</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{company.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Visitor Patterns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Visitor Patterns</CardTitle>
                <CardDescription>Key visitor behavior insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    <span>Repeat Visitors</span>
                  </div>
                  <Badge>{((analyticsData.repeatVisitors / analyticsData.totalVisitors) * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Completion Rate</span>
                  </div>
                  <Badge>{((analyticsData.completedVisits / analyticsData.totalVisitors) * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-orange-600" />
                    <span>Avg. Duration</span>
                  </div>
                  <Badge>{analyticsData.averageVisitDuration} minutes</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visit Statistics</CardTitle>
                <CardDescription>Additional visit metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>Total Unique Visitors</span>
                  </div>
                  <Badge>{(analyticsData.totalVisitors - analyticsData.repeatVisitors).toLocaleString()}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span>Currently Active</span>
                  </div>
                  <Badge variant="outline">{analyticsData.activeVisitors}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-purple-600" />
                    <span>Companies Visited</span>
                  </div>
                  <Badge>{analyticsData.topCompanies.length}+</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Security Incidents"
              value={analyticsData.securityIncidents}
              icon={AlertTriangle}
              trend="down"
              trendValue={25.0}
              color="red"
            />
            <MetricCard
              title="Blacklisted Visitors"
              value="12"
              icon={UserX}
              trend="neutral"
              trendValue={0}
              color="red"
            />
            <MetricCard
              title="Security Score"
              value="98.5%"
              icon={Shield}
              trend="up"
              trendValue={2.1}
              color="green"
            />
          </div>

          {/* Security Incidents Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Security Events
              </CardTitle>
              <CardDescription>Latest security incidents and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-red-50 border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium">Unauthorized Access Attempt</p>
                    <p className="text-sm text-muted-foreground">Visitor attempted to access restricted area</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                  <Badge variant="destructive">High</Badge>
                </div>
                
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <Eye className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium">Suspicious Behavior Detected</p>
                    <p className="text-sm text-muted-foreground">Visitor loitering in lobby area</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                  <Badge variant="secondary">Medium</Badge>
                </div>
                
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Security Check Completed</p>
                    <p className="text-sm text-muted-foreground">All visitors properly checked in</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                  <Badge variant="outline">Info</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
                <CardDescription>Door and zone access statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>Zone Violations</span>
                  </div>
                  <Badge variant="destructive">2</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Successful Access</span>
                  </div>
                  <Badge variant="outline">1,245</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Denied Access</span>
                  </div>
                  <Badge variant="secondary">8</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>Security policy compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Policy Compliant</span>
                  </div>
                  <Badge>98.5%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>Pending Reviews</span>
                  </div>
                  <Badge variant="secondary">3</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>Security Level</span>
                  </div>
                  <Badge variant="outline">High</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}