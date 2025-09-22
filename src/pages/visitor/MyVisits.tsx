import { useState, useEffect } from 'react';
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User,
  Building,
  History,
  Activity,
  LogIn,
  LogOut,
  RefreshCw,
  Eye,
  Download,
  Filter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeDialog } from '@/components/visitor/QRCodeDialog';
import { CheckInOutDialog } from '@/components/visitor/CheckInOutDialog';

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  host_id: string;
  qr_code?: string;
  created_at: string;
  notes?: string;
  rejection_reason?: string;
  host: {
    full_name: string;
    company?: string;
  };
}

interface VisitLog {
  id: string;
  visit_request_id: string;
  action: string;
  timestamp: string;
  zone_id?: string;
  notes?: string;
  zone?: {
    name: string;
  };
}

export default function MyVisits() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showCheckInOut, setShowCheckInOut] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitRequest | null>(null);

  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchVisits();
      fetchVisitLogs();
    }
  }, [profile]);

  const fetchVisits = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          host:profiles!visit_requests_host_id_fkey(full_name, company)
        `)
        .eq('visitor_id', profile.id)
        .order('visit_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      setVisits(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading visits',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitLogs = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`
          *,
          zone:zones(name),
          visit_request:visit_requests!inner(visitor_id)
        `)
        .eq('visit_request.visitor_id', profile.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVisitLogs(data || []);
    } catch (error: any) {
      console.error('Error loading visit logs:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      checked_in: { variant: 'default' as const, label: 'Checked In', icon: LogIn },
      checked_out: { variant: 'outline' as const, label: 'Completed', icon: LogOut },
      expired: { variant: 'secondary' as const, label: 'Expired', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getVisitTypeByDate = (visitDate: string) => {
    const date = parseISO(visitDate);
    if (isToday(date)) return 'today';
    if (isPast(date)) return 'past';
    if (isFuture(date)) return 'upcoming';
    return 'unknown';
  };

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = visit.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         visit.host.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (visit.host.company && visit.host.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
    
    const visitType = getVisitTypeByDate(visit.visit_date);
    const matchesDate = dateFilter === 'all' || visitType === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getVisitStats = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: visits.length,
      upcoming: visits.filter(v => v.status === 'approved' && v.visit_date >= today).length,
      today: visits.filter(v => v.visit_date === today).length,
      checkedIn: visits.filter(v => v.status === 'checked_in').length,
      completed: visits.filter(v => v.status === 'checked_out').length
    };
  };

  const formatTime = (time: string) => {
    return format(new Date(`2000-01-01T${time}`), 'h:mm a');
  };

  const formatDateTime = (dateTime: string) => {
    return format(parseISO(dateTime), 'MMM dd, yyyy h:mm a');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'check_in': return <LogIn className="h-4 w-4 text-green-600" />;
      case 'check_out': return <LogOut className="h-4 w-4 text-blue-600" />;
      case 'zone_entry': return <MapPin className="h-4 w-4 text-orange-600" />;
      case 'zone_exit': return <MapPin className="h-4 w-4 text-gray-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'check_in': return 'Checked In';
      case 'check_out': return 'Checked Out';
      case 'zone_entry': return 'Zone Entry';
      case 'zone_exit': return 'Zone Exit';
      default: return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const stats = getVisitStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Visits</h1>
            <p className="text-muted-foreground">Track your visit history and manage current visits</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your visits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Visits</h1>
          <p className="text-muted-foreground">Track your visit history and manage current visits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchVisits}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowQRDialog(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            My Pass
          </Button>
          <Button onClick={() => setShowCheckInOut(true)} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Check In/Out
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-xl font-semibold">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-xl font-semibold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <LogIn className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-semibold">{stats.checkedIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <LogOut className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-semibold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visits">My Visits</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search visits by purpose, host, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Visits List */}
          <div className="space-y-4">
            {filteredVisits.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No visits found</h3>
                  <p className="text-muted-foreground">
                    {visits.length === 0 
                      ? "You haven't made any visit requests yet."
                      : "No visits match your current filters."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredVisits.map((visit) => (
                <Card key={visit.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg">{visit.purpose}</h3>
                          {getStatusBadge(visit.status)}
                          {visit.qr_code && (
                            <Badge variant="outline" className="text-xs">
                              <QrCode className="h-3 w-3 mr-1" />
                              Digital Pass
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Host: {visit.host.full_name}</span>
                          </div>
                          {visit.host.company && (
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              <span>{visit.host.company}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(parseISO(visit.visit_date), 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(visit.start_time)} - {formatTime(visit.end_time)}</span>
                          </div>
                        </div>

                        {visit.notes && (
                          <div className="mb-4">
                            <p className="text-sm"><strong>Notes:</strong> {visit.notes}</p>
                          </div>
                        )}

                        {visit.rejection_reason && (
                          <Alert className="mb-4">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Rejection Reason:</strong> {visit.rejection_reason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {visit.qr_code && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVisit(visit);
                              setShowQRDialog(true);
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            View Pass
                          </Button>
                        )}
                        
                        {(visit.status === 'approved' || visit.status === 'checked_in') && 
                         isToday(parseISO(visit.visit_date)) && (
                          <Button
                            size="sm"
                            onClick={() => setShowCheckInOut(true)}
                            className={visit.status === 'checked_in' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {visit.status === 'checked_in' ? (
                              <>
                                <LogOut className="h-4 w-4 mr-1" />
                                Check Out
                              </>
                            ) : (
                              <>
                                <LogIn className="h-4 w-4 mr-1" />
                                Check In
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>
                Your recent check-in/out activities and zone movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visitLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                  <p className="text-muted-foreground">
                    Your check-in/out activities will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visitLogs.map((log, index) => (
                    <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{getActionLabel(log.action)}</p>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        {log.zone && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Zone: {log.zone.name}
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showQRDialog && <QRCodeDialog />}

      {showCheckInOut && <CheckInOutDialog />}
    </div>
  );
}