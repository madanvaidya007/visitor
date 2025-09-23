import { useState, useEffect } from 'react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  RefreshCw,
  Users,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  History,
  Activity,
  Star,
  UserCheck,
  UserX,
  BarChart3,
  Calendar as CalendarIcon,
  Timer,
  Shield,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeZoneData } from '@/hooks/useRealtimeZoneData';
import { supabase } from '@/integrations/supabase/client';

interface Visitor {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  photo_url?: string;
  created_at: string;
  is_active: boolean;
  total_visits: number;
  last_visit_date?: string;
  last_visit_status?: string;
  favorite?: boolean;
}

interface VisitHistory {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out' | 'cancelled';
  notes?: string;
  created_at: string;
  visitor: {
    id: string;
    full_name: string;
    email: string;
    company?: string;
    photo_url?: string;
  };
  visit_logs?: {
    action: string;
    timestamp: string;
    zone?: {
      name: string;
    };
  }[];
}

interface VisitorStats {
  totalVisitors: number;
  activeVisitors: number;
  totalVisits: number;
  completedVisits: number;
  averageVisitDuration: number;
  topCompanies: { company: string; count: number }[];
  visitTrends: { date: string; count: number }[];
}

type FilterStatus = 'all' | 'active' | 'inactive';
type SortBy = 'name' | 'company' | 'last_visit' | 'total_visits';
type TimeRange = 'all' | 'today' | 'week' | 'month' | 'year';

export default function MyVisitors() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitHistory[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('last_visit');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [showVisitorDetails, setShowVisitorDetails] = useState(false);
  const [visitorHistory, setVisitorHistory] = useState<VisitHistory[]>([]);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  useEffect(() => {
    filterAndSortVisitors();
  }, [visitors, searchTerm, statusFilter, sortBy, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchVisitors(),
        fetchVisitHistory(),
        fetchStats()
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

  const fetchVisitors = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('visit_requests')
      .select(`
        visitor:profiles!visit_requests_visitor_id_fkey(
          id,
          full_name,
          email,
          phone,
          company,
          photo_url,
          created_at,
          is_active
        ),
        visit_date,
        status,
        created_at
      `)
      .eq('host_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process visitors data to get unique visitors with stats
    const visitorMap = new Map<string, Visitor>();
    
    data?.forEach((visit: any) => {
      const visitor = visit.visitor;
      if (!visitor) return;

      const existingVisitor = visitorMap.get(visitor.id);
      if (existingVisitor) {
        existingVisitor.total_visits += 1;
        if (visit.visit_date > (existingVisitor.last_visit_date || '')) {
          existingVisitor.last_visit_date = visit.visit_date;
          existingVisitor.last_visit_status = visit.status;
        }
      } else {
        visitorMap.set(visitor.id, {
          ...visitor,
          total_visits: 1,
          last_visit_date: visit.visit_date,
          last_visit_status: visit.status,
          favorite: false
        });
      }
    });

    setVisitors(Array.from(visitorMap.values()));
  };

  const fetchVisitHistory = async () => {
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
        ),
        visit_logs(
          action,
          timestamp,
          zone:zones(name)
        )
      `)
      .eq('host_id', profile.id)
      .order('visit_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    setVisitHistory(data || []);
  };

  const fetchStats = async () => {
    if (!profile) return;

    const { data: visitsData, error } = await supabase
      .from('visit_requests')
      .select(`
        *,
        visitor:profiles!visit_requests_visitor_id_fkey(company),
        visit_logs(action, timestamp)
      `)
      .eq('host_id', profile.id);

    if (error) throw error;

    const uniqueVisitors = new Set(visitsData?.map(v => v.visitor_id)).size;
    const activeVisitors = new Set(
      visitsData?.filter(v => v.status === 'checked_in').map(v => v.visitor_id)
    ).size;
    const completedVisits = visitsData?.filter(v => v.status === 'checked_out').length || 0;

    // Calculate average visit duration
    const completedVisitsWithLogs = visitsData?.filter(v => 
      v.status === 'checked_out' && v.visit_logs?.length >= 2
    ) || [];
    
    let totalDuration = 0;
    completedVisitsWithLogs.forEach(visit => {
      const checkIn = visit.visit_logs?.find((log: any) => log.action === 'check_in');
      const checkOut = visit.visit_logs?.find((log: any) => log.action === 'check_out');
      if (checkIn && checkOut) {
        const duration = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
        totalDuration += duration;
      }
    });
    
    const averageVisitDuration = completedVisitsWithLogs.length > 0 
      ? totalDuration / completedVisitsWithLogs.length / (1000 * 60) // in minutes
      : 0;

    // Get top companies
    const companyCount = new Map<string, number>();
    visitsData?.forEach(visit => {
      const company = visit.visitor?.company || 'Unknown';
      companyCount.set(company, (companyCount.get(company) || 0) + 1);
    });
    
    const topCompanies = Array.from(companyCount.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get visit trends (last 30 days)
    const visitTrends: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = visitsData?.filter(v => v.visit_date === dateStr).length || 0;
      visitTrends.push({ date: dateStr, count });
    }

    setStats({
      totalVisitors: uniqueVisitors,
      activeVisitors,
      totalVisits: visitsData?.length || 0,
      completedVisits,
      averageVisitDuration,
      topCompanies,
      visitTrends
    });
  };

  const filterAndSortVisitors = () => {
    let filtered = [...visitors];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(visitor =>
        visitor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(visitor => {
        if (statusFilter === 'active') {
          return visitor.is_active && visitor.last_visit_status !== 'rejected';
        } else {
          return !visitor.is_active || visitor.last_visit_status === 'rejected';
        }
      });
    }

    // Time range filter
    if (timeRange !== 'all' && filtered.length > 0) {
      filtered = filtered.filter(visitor => {
        if (!visitor.last_visit_date) return false;
        const visitDate = new Date(visitor.last_visit_date);
        
        switch (timeRange) {
          case 'today':
            return isToday(visitDate);
          case 'week':
            return isThisWeek(visitDate);
          case 'month':
            return isThisMonth(visitDate);
          case 'year':
            return visitDate.getFullYear() === new Date().getFullYear();
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name);
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        case 'last_visit':
          return new Date(b.last_visit_date || 0).getTime() - new Date(a.last_visit_date || 0).getTime();
        case 'total_visits':
          return b.total_visits - a.total_visits;
        default:
          return 0;
      }
    });

    setFilteredVisitors(filtered);
  };

  const fetchVisitorHistory = async (visitorId: string) => {
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
        ),
        visit_logs(
          action,
          timestamp,
          zone:zones(name)
        )
      `)
      .eq('host_id', profile.id)
      .eq('visitor_id', visitorId)
      .order('visit_date', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading visitor history',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    setVisitorHistory(data || []);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checked_in': return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'checked_out': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'checked_out': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Visitors</h1>
          <p className="text-muted-foreground">View and manage your visitor history and relationships</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Visitors</p>
                  <p className="text-xl font-semibold">{stats.totalVisitors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currently Active</p>
                  <p className="text-xl font-semibold">{stats.activeVisitors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                  <p className="text-xl font-semibold">{stats.totalVisits}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Timer className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-xl font-semibold">{Math.round(stats.averageVisitDuration)}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="visitors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="history">Visit History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="visitors" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search visitors by name, email, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_visit">Last Visit</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="total_visits">Total Visits</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Visitors List */}
          <Card>
            <CardHeader>
              <CardTitle>Visitors ({filteredVisitors.length})</CardTitle>
              <CardDescription>Your visitor relationships and history</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredVisitors.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {visitors.length === 0 ? 'No visitors yet' : 'No visitors match your filters'}
                  </h3>
                  <p className="text-muted-foreground">
                    {visitors.length === 0 
                      ? 'Visitors will appear here after they submit visit requests'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVisitors.map((visitor) => (
                    <div key={visitor.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={visitor.photo_url || ''} alt={visitor.full_name} />
                            <AvatarFallback>
                              {visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{visitor.full_name}</h4>
                              {visitor.favorite && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                              {!visitor.is_active && (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{visitor.email}</span>
                              </div>
                              {visitor.company && (
                                <div className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  <span>{visitor.company}</span>
                                </div>
                              )}
                              {visitor.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{visitor.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <History className="h-3 w-3" />
                                <span>{visitor.total_visits} visit{visitor.total_visits !== 1 ? 's' : ''}</span>
                              </div>
                            </div>

                            {visitor.last_visit_date && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Last visit:</span>
                                <span className="text-sm font-medium">
                                  {format(new Date(visitor.last_visit_date), 'MMM dd, yyyy')}
                                </span>
                                {visitor.last_visit_status && (
                                  <div className="flex items-center gap-1">
                                    {getStatusIcon(visitor.last_visit_status)}
                                    <Badge variant="secondary" className={getStatusColor(visitor.last_visit_status)}>
                                      {visitor.last_visit_status.toUpperCase()}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVisitor(visitor);
                              fetchVisitorHistory(visitor.id);
                              setShowVisitorDetails(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Visit History</CardTitle>
              <CardDescription>Complete history of all visits to you</CardDescription>
            </CardHeader>
            <CardContent>
              {visitHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No visit history</h3>
                  <p className="text-muted-foreground">Visit history will appear here as visitors check in and out</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visitHistory.slice(0, 20).map((visit) => (
                    <div key={visit.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={visit.visitor.photo_url || ''} alt={visit.visitor.full_name} />
                            <AvatarFallback>
                              {visit.visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{visit.visitor.full_name}</h4>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(visit.status)}
                                <Badge variant="secondary" className={getStatusColor(visit.status)}>
                                  {visit.status.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-sm font-medium">{visit.purpose}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(visit.visit_date), 'MMM dd, yyyy')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{visit.start_time} - {visit.end_time}</span>
                              </div>
                              {visit.visitor.company && (
                                <div className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  <span>{visit.visitor.company}</span>
                                </div>
                              )}
                            </div>

                            {visit.visit_logs && visit.visit_logs.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Activity: </span>
                                {visit.visit_logs.map((log, index) => (
                                  <span key={index}>
                                    {log.action.replace('_', ' ')} at {format(new Date(log.timestamp), 'HH:mm')}
                                    {index < visit.visit_logs!.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Companies</CardTitle>
                    <CardDescription>Most frequent visiting companies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.topCompanies.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No company data available</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.topCompanies.map((company, index) => (
                          <div key={company.company} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                              <span className="font-medium">{company.company}</span>
                            </div>
                            <Badge variant="secondary">{company.count} visits</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Visit Trends</CardTitle>
                    <CardDescription>Daily visits over the last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.visitTrends.slice(-7).map((trend) => (
                        <div key={trend.date} className="flex items-center justify-between text-sm">
                          <span>{format(new Date(trend.date), 'MMM dd')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.max(10, (trend.count / Math.max(...stats.visitTrends.map(t => t.count))) * 100)}%` 
                                }}
                              />
                            </div>
                            <span className="font-medium">{trend.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Visitor Details Dialog */}
      <Dialog open={showVisitorDetails} onOpenChange={setShowVisitorDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visitor Details</DialogTitle>
            <DialogDescription>
              Complete information and visit history for this visitor
            </DialogDescription>
          </DialogHeader>
          
          {selectedVisitor && (
            <div className="space-y-6">
              {/* Visitor Profile */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedVisitor.photo_url || ''} alt={selectedVisitor.full_name} />
                  <AvatarFallback className="text-lg">
                    {selectedVisitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{selectedVisitor.full_name}</h3>
                    {selectedVisitor.favorite && (
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedVisitor.email}</p>
                    </div>
                    {selectedVisitor.phone && (
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <p className="font-medium">{selectedVisitor.phone}</p>
                      </div>
                    )}
                    {selectedVisitor.company && (
                      <div>
                        <span className="text-muted-foreground">Company:</span>
                        <p className="font-medium">{selectedVisitor.company}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Total Visits:</span>
                      <p className="font-medium">{selectedVisitor.total_visits}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Member Since:</span>
                      <p className="font-medium">{format(new Date(selectedVisitor.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-medium">{selectedVisitor.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit History */}
              <div>
                <h4 className="font-medium mb-3">Visit History</h4>
                {visitorHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No visit history available</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {visitorHistory.map((visit) => (
                      <div key={visit.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{visit.purpose}</span>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(visit.status)}
                            <Badge variant="secondary" className={getStatusColor(visit.status)}>
                              {visit.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(visit.visit_date), 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{visit.start_time} - {visit.end_time}</span>
                          </div>
                        </div>

                        {visit.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{visit.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}