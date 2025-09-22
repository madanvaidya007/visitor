import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText,
  Trash2,
  Edit,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { NewVisitRequestDialog } from '@/components/visitor/NewVisitRequestDialog';
import { QRCodeDialog } from '@/components/visitor/QRCodeDialog';

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

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'checked_in' | 'completed';
type SortBy = 'date' | 'created' | 'status' | 'host';
type SortOrder = 'asc' | 'desc';

export default function VisitRequests() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateRange, setDateRange] = useState<'all' | 'upcoming' | 'past' | 'today'>('all');

  useEffect(() => {
    if (profile) {
      fetchVisitRequests();
    }
  }, [profile]);

  useEffect(() => {
    filterAndSortRequests();
  }, [visitRequests, searchTerm, statusFilter, sortBy, sortOrder, dateRange]);

  const fetchVisitRequests = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          host:profiles!visit_requests_host_id_fkey(full_name, company)
        `)
        .eq('visitor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisitRequests(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading visit requests',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRequests = () => {
    let filtered = [...visitRequests];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.host.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.host.company && request.host.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Apply date range filter
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    if (dateRange === 'today') {
      filtered = filtered.filter(request => request.visit_date === todayStr);
    } else if (dateRange === 'upcoming') {
      filtered = filtered.filter(request => new Date(request.visit_date) >= today);
    } else if (dateRange === 'past') {
      filtered = filtered.filter(request => new Date(request.visit_date) < today);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.visit_date + ' ' + a.start_time);
          bValue = new Date(b.visit_date + ' ' + b.start_time);
          break;
        case 'created':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'host':
          aValue = a.host.full_name;
          bValue = b.host.full_name;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredRequests(filtered);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(filteredRequests.map(req => req.id));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRequests.length === 0) return;

    try {
      const { error } = await supabase
        .from('visit_requests')
        .delete()
        .in('id', selectedRequests)
        .in('status', ['pending', 'rejected']); // Only allow deletion of pending/rejected requests

      if (error) throw error;

      toast({
        title: 'Requests deleted',
        description: `${selectedRequests.length} visit requests have been deleted.`
      });

      setSelectedRequests([]);
      fetchVisitRequests();
    } catch (error: any) {
      toast({
        title: 'Error deleting requests',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'checked_in':
        return <QrCode className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusCounts = () => {
    return {
      all: visitRequests.length,
      pending: visitRequests.filter(req => req.status === 'pending').length,
      approved: visitRequests.filter(req => req.status === 'approved').length,
      rejected: visitRequests.filter(req => req.status === 'rejected').length,
      checked_in: visitRequests.filter(req => req.status === 'checked_in').length,
      completed: visitRequests.filter(req => req.status === 'completed').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Visit Requests</h1>
            <p className="text-muted-foreground">Manage your visit requests and track their status</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading visit requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visit Requests</h1>
          <p className="text-muted-foreground">Manage your visit requests and track their status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchVisitRequests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowNewRequest(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by purpose, host, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                  <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                  <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
                  <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
                  <SelectItem value="checked_in">Checked In ({statusCounts.checked_in})</SelectItem>
                  <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>

              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [sort, order] = value.split('-');
                setSortBy(sort as SortBy);
                setSortOrder(order as SortOrder);
              }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="created-desc">Created (Newest)</SelectItem>
                  <SelectItem value="created-asc">Created (Oldest)</SelectItem>
                  <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                  <SelectItem value="host-asc">Host (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedRequests.length > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedRequests.length} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={!selectedRequests.some(id => {
                  const request = visitRequests.find(req => req.id === id);
                  return request && ['pending', 'rejected'].includes(request.status);
                })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({statusCounts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
          <TabsTrigger value="checked_in">Active ({statusCounts.checked_in})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {/* Visit Requests List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Visit Requests</CardTitle>
                  <CardDescription>
                    {filteredRequests.length} of {visitRequests.length} requests
                  </CardDescription>
                </div>
                {filteredRequests.length > 0 && (
                  <Checkbox
                    checked={selectedRequests.length === filteredRequests.length}
                    onCheckedChange={handleSelectAll}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {visitRequests.length === 0 ? 'No visit requests yet' : 'No requests match your filters'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {visitRequests.length === 0 
                      ? 'Create your first visit request to get started'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                  {visitRequests.length === 0 && (
                    <Button onClick={() => setShowNewRequest(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Request
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedRequests.includes(request.id)}
                          onCheckedChange={(checked) => handleSelectRequest(request.id, checked as boolean)}
                        />
                        
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(request.status)}
                                <Badge variant="secondary" className={getStatusColor(request.status)}>
                                  {request.status.toUpperCase()}
                                </Badge>
                                {request.qr_code && (
                                  <Badge variant="outline">
                                    <QrCode className="h-3 w-3 mr-1" />
                                    QR Ready
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium text-lg">{request.purpose}</h4>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {request.status === 'pending' && (
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Request
                                  </DropdownMenuItem>
                                )}
                                {request.status === 'approved' && request.qr_code && (
                                  <DropdownMenuItem onClick={() => setShowQRDialog(true)}>
                                    <QrCode className="h-4 w-4 mr-2" />
                                    View QR Code
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export
                                </DropdownMenuItem>
                                {['pending', 'rejected'].includes(request.status) && (
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(request.visit_date), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{request.start_time} - {request.end_time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>Host: {request.host.full_name}</span>
                            </div>
                            {request.host.company && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>{request.host.company}</span>
                              </div>
                            )}
                          </div>

                          {/* Notes or Rejection Reason */}
                          {request.rejection_reason && (
                            <Alert className="border-red-200 bg-red-50">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                <strong>Rejection Reason:</strong> {request.rejection_reason}
                              </AlertDescription>
                            </Alert>
                          )}

                          {request.notes && (
                            <div className="text-sm">
                              <strong>Notes:</strong> {request.notes}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {request.status === 'approved' && request.qr_code && (
                              <Button variant="outline" size="sm" onClick={() => setShowQRDialog(true)}>
                                <QrCode className="h-4 w-4 mr-2" />
                                View Pass
                              </Button>
                            )}
                            {request.status === 'pending' && (
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
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
      </Tabs>

      {/* Dialogs */}
      <NewVisitRequestDialog
        open={showNewRequest}
        onOpenChange={setShowNewRequest}
        onSuccess={fetchVisitRequests}
      />

      <QRCodeDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
      />
    </div>
  );
}