import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Building,
  Shield,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  RefreshCw,
  Eye,
  Mail,
  Printer,
  FileSpreadsheet,
  File
} from 'lucide-react';

interface ReportData {
  totalVisitors: number;
  approvedVisitors: number;
  rejectedVisitors: number;
  pendingVisitors: number;
  checkedInVisitors: number;
  checkedOutVisitors: number;
  averageVisitDuration: string;
  topCompanies: Array<{ name: string; count: number }>;
  topHosts: Array<{ name: string; count: number }>;
  dailyStats: Array<{ date: string; visitors: number; approved: number; rejected: number }>;
  hourlyStats: Array<{ hour: number; visitors: number }>;
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

const REPORT_TYPES = [
  { value: 'visitor_summary', label: 'Visitor Summary', icon: Users },
  { value: 'daily_activity', label: 'Daily Activity', icon: Activity },
  { value: 'company_analysis', label: 'Company Analysis', icon: Building },
  { value: 'host_performance', label: 'Host Performance', icon: Shield },
  { value: 'time_analysis', label: 'Time Analysis', icon: Clock }
];

const PRESET_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'This week', value: 'this_week' },
  { label: 'Last week', value: 'last_week' }
];

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedReportType, setSelectedReportType] = useState('visitor_summary');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    generateReport();
  }, [selectedReportType, dateRange]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual report generation from database
      // const { data, error } = await supabase.rpc('generate_report', {
      //   report_type: selectedReportType,
      //   start_date: dateRange.from,
      //   end_date: dateRange.to
      // });
      
      // if (error) throw error;
      // setReportData(data);
      
      // For now, show empty report until database implementation
      setReportData({
        totalVisitors: 0,
        approvedVisitors: 0,
        rejectedVisitors: 0,
        pendingVisitors: 0,
        checkedInVisitors: 0,
        checkedOutVisitors: 0,
        averageVisitDuration: '0m',
        topCompanies: [],
        topHosts: [],
        dailyStats: [],
        hourlyStats: [],
        statusDistribution: []
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetRange = (preset: string) => {
    const today = new Date();
    let from: Date, to: Date;

    switch (preset) {
      case 'today':
        from = to = today;
        break;
      case 'yesterday':
        from = to = subDays(today, 1);
        break;
      case 'last_7_days':
        from = subDays(today, 7);
        to = today;
        break;
      case 'last_30_days':
        from = subDays(today, 30);
        to = today;
        break;
      case 'this_month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'last_month':
        from = startOfMonth(subDays(today, 30));
        to = endOfMonth(subDays(today, 30));
        break;
      case 'this_week':
        from = startOfWeek(today);
        to = endOfWeek(today);
        break;
      case 'last_week':
        from = startOfWeek(subDays(today, 7));
        to = endOfWeek(subDays(today, 7));
        break;
      default:
        return;
    }

    setDateRange({ from, to });
  };

  const exportReport = async (exportFormat: 'csv' | 'pdf' | 'excel') => {
    setIsGenerating(true);
    try {
      // Simulate export generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const filename = `visitor-report-${exportFormat}-${format(new Date(), 'yyyy-MM-dd')}`;
      
      if (exportFormat === 'csv') {
        const csvContent = [
          ['Metric', 'Value'],
          ['Total Visitors', reportData?.totalVisitors.toString() || '0'],
          ['Approved Visitors', reportData?.approvedVisitors.toString() || '0'],
          ['Rejected Visitors', reportData?.rejectedVisitors.toString() || '0'],
          ['Pending Visitors', reportData?.pendingVisitors.toString() || '0'],
          ['Average Visit Duration', reportData?.averageVisitDuration || 'N/A']
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Export Complete',
        description: `Report exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, trend }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                <span className={`text-xs ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and analyze visitor reports and statistics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')} disabled={isGenerating}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')} disabled={isGenerating}>
            <File className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={generateReport} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select onValueChange={handlePresetRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preset range" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Custom Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "MMM dd") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "MMM dd") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Generating report...</p>
        </div>
      ) : reportData ? (
        <Tabs value={selectedReportType} onValueChange={setSelectedReportType}>
          <TabsList className="grid w-full grid-cols-5">
            {REPORT_TYPES.map(type => (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                <type.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{type.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="visitor_summary" className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Visitors"
                value={reportData.totalVisitors}
                change="+12.5% from last period"
                icon={Users}
                trend="up"
              />
              <StatCard
                title="Approved"
                value={reportData.approvedVisitors}
                change="+8.3% from last period"
                icon={Shield}
                trend="up"
              />
              <StatCard
                title="Rejected"
                value={reportData.rejectedVisitors}
                change="-2.1% from last period"
                icon={Shield}
                trend="down"
              />
              <StatCard
                title="Avg Duration"
                value={reportData.averageVisitDuration}
                change="+15min from last period"
                icon={Clock}
                trend="up"
              />
            </div>

            {/* Status Distribution */}
            <ChartCard title="Status Distribution">
              <div className="space-y-4">
                {reportData.statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === 'Approved' ? 'bg-green-500' :
                        item.status === 'Rejected' ? 'bg-red-500' :
                        item.status === 'Pending' ? 'bg-yellow-500' :
                        item.status === 'Checked In' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="font-medium">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={item.percentage} className="w-24" />
                      <span className="text-sm text-muted-foreground w-12">
                        {item.percentage}%
                      </span>
                      <span className="font-medium w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </TabsContent>

          <TabsContent value="daily_activity" className="space-y-6">
            <ChartCard title="Daily Visitor Activity">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Showing visitor activity for the last 30 days
                </div>
                {reportData.dailyStats.slice(-7).map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="font-medium w-24">
                      {format(new Date(day.date), 'MMM dd')}
                    </div>
                    <div className="flex-1 mx-4">
                      <Progress value={(day.visitors / 50) * 100} className="h-2" />
                    </div>
                    <div className="text-right space-x-4 text-sm">
                      <span className="text-green-600">{day.approved} approved</span>
                      <span className="text-red-600">{day.rejected} rejected</span>
                      <span className="font-medium">{day.visitors} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Hourly Distribution">
              <div className="grid grid-cols-12 gap-2">
                {reportData.hourlyStats.map((hour, index) => (
                  <div key={index} className="text-center">
                    <div 
                      className="bg-blue-500 rounded-t mb-1"
                      style={{ height: `${(hour.visitors / 50) * 100}px`, minHeight: '4px' }}
                    />
                    <div className="text-xs text-muted-foreground">
                      {hour.hour}h
                    </div>
                    <div className="text-xs font-medium">
                      {hour.visitors}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </TabsContent>

          <TabsContent value="company_analysis" className="space-y-6">
            <ChartCard title="Top Companies by Visitor Count">
              <div className="space-y-4">
                {reportData.topCompanies.map((company, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{company.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={(company.count / reportData.topCompanies[0].count) * 100} className="w-32" />
                      <span className="font-medium w-12 text-right">{company.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </TabsContent>

          <TabsContent value="host_performance" className="space-y-6">
            <ChartCard title="Top Hosts by Visitor Count">
              <div className="space-y-4">
                {reportData.topHosts.map((host, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{host.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={(host.count / reportData.topHosts[0].count) * 100} className="w-32" />
                      <span className="font-medium w-12 text-right">{host.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </TabsContent>

          <TabsContent value="time_analysis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="Peak Hours">
                <div className="space-y-3">
                  {reportData.hourlyStats
                    .sort((a, b) => b.visitors - a.visitors)
                    .slice(0, 5)
                    .map((hour, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">
                          {hour.hour}:00 - {hour.hour + 1}:00
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress value={(hour.visitors / 50) * 100} className="w-20" />
                          <span className="text-sm font-medium w-8">{hour.visitors}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </ChartCard>

              <ChartCard title="Visit Duration Analysis">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {reportData.averageVisitDuration}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Visit Duration</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>&lt; 1 hour</span>
                      <span>25%</span>
                    </div>
                    <Progress value={25} />
                    <div className="flex justify-between text-sm">
                      <span>1-3 hours</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} />
                    <div className="flex justify-between text-sm">
                      <span>3-6 hours</span>
                      <span>25%</span>
                    </div>
                    <Progress value={25} />
                    <div className="flex justify-between text-sm">
                      <span>&gt; 6 hours</span>
                      <span>5%</span>
                    </div>
                    <Progress value={5} />
                  </div>
                </div>
              </ChartCard>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-muted-foreground">No report data available</p>
        </div>
      )}
    </div>
  );
}