import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Bell,
  Users,
  FileText,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  QrCode
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out' | 'cancelled';
  notes?: string;
  rejection_reason?: string;
  qr_code?: string;
  documents_uploaded: boolean;
  created_at: string;
  visitor: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
    photo_url?: string;
  };
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'checked_in' | 'completed';
type DateRange = 'all' | 'today' | 'week' | 'month';

export default function VisitorRequests() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (profile) {
      fetchVisitRequests();
    }
  }, [profile]);

  useEffect(() => {
    filterRequests();
  }, [visitRequests, searchTerm, statusFilter, dateRange]);

  const fetchVisitRequests = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(
            id,
            full_name,
            email,
            phone,
            company,
            photo_url
          )
        `)
        .eq('host_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisitRequests(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading visitor requests',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...visitRequests];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.visitor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.visitor.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.visitor.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        filtered = filtered.filter(request => request.status === 'checked_out');
      } else {
        filtered = filtered.filter(request => request.status === statusFilter);
      }
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      filtered = filtered.filter(request => {
        const requestDate = new Date(request.visit_date);
        
        switch (dateRange) {
          case 'today':
            return request.visit_date === today;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return requestDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return requestDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          status: 'approved',
          qr_code: `QR_${requestId}_${Date.now()}` // Generate QR code
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request approved',
        description: 'The visitor request has been approved and QR code generated.'
      });

      fetchVisitRequests();
    } catch (error: any) {
      toast({
        title: 'Error approving request',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejecting this request.',
        variant: 'destructive'
      });
      return;
    }

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request rejected',
        description: 'The visitor request has been rejected.'
      });

      setRejectionReason('');
      fetchVisitRequests();
    } catch (error: any) {
      toast({
        title: 'Error rejecting request',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checked_in': return <QrCode className="h-4 w-4 text-blue-500" />;
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

  const statusCounts = {
    all: visitRequests.length,
    pending: visitRequests.filter(r => r.status === 'pending').length,
    approved: visitRequests.filter(r => r.status === 'approved').length,
    rejected: visitRequests.filter(r => r.status === 'rejected').length,
    checked_in: visitRequests.filter(r => r.status === 'checked_in').length,
    completed: visitRequests.filter(r => r.status === 'checked_out').length,
  };

  const pendingRequests = visitRequests.filter(r => r.status === 'pending');
  const todaysRequests = visitRequests.filter(r => r.visit_date === format(new Date(), 'yyyy-MM-dd'));

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
          <h1 className="text-2xl font-bold">Visitor Requests</h1>
          <p className="text-muted-foreground">Manage incoming visitor requests and approvals</p>
        </div>
        <Button onClick={fetchVisitRequests} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Bell className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-xl font-semibold">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Visits</p>
                <p className="text-xl font-semibold">{todaysRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-xl font-semibold">{statusCounts.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-xl font-semibold">{statusCounts.all}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by visitor name, company, or purpose..."
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

              <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Requests ({filteredRequests.length})</CardTitle>
          <CardDescription>Review and manage visitor access requests</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {visitRequests.length === 0 ? 'No visitor requests yet' : 'No requests match your filters'}
              </h3>
              <p className="text-muted-foreground">
                {visitRequests.length === 0 
                  ? 'Visitor requests will appear here when submitted'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
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
                        {!request.documents_uploaded && request.status === 'pending' && (
                          <Badge variant="outline" className="text-orange-600">
                            <FileText className="h-3 w-3 mr-1" />
                            Docs Pending
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-medium">{request.purpose}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{request.visitor.full_name}</span>
                        </div>
                        {request.visitor.company && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>{request.visitor.company}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(request.visit_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{request.start_time} - {request.end_time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{request.visitor.email}</span>
                        </div>
                        {request.visitor.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{request.visitor.phone}</span>
                          </div>
                        )}
                      </div>

                      {request.notes && (
                        <div className="flex items-start gap-1 text-sm">
                          <MessageSquare className="h-3 w-3 mt-0.5" />
                          <span className="text-muted-foreground">{request.notes}</span>
                        </div>
                      )}

                      {request.rejection_reason && (
                        <Alert className="mt-2">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Rejection Reason:</strong> {request.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>

                      {request.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            disabled={actionLoading === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actionLoading === request.id}
                              >
                                <ThumbsDown className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Visit Request</DialogTitle>
                                <DialogDescription>
                                  Please provide a reason for rejecting this visit request.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Enter rejection reason..."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    onClick={() => setRejectionReason('')}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleReject(request.id, rejectionReason)}
                                    disabled={!rejectionReason.trim() || actionLoading === request.id}
                                  >
                                    Reject Request
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visit Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this visitor request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Visitor Information */}
              <div>
                <h3 className="font-medium mb-3">Visitor Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{selectedRequest.visitor.full_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedRequest.visitor.email}</p>
                  </div>
                  {selectedRequest.visitor.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{selectedRequest.visitor.phone}</p>
                    </div>
                  )}
                  {selectedRequest.visitor.company && (
                    <div>
                      <span className="text-muted-foreground">Company:</span>
                      <p className="font-medium">{selectedRequest.visitor.company}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Visit Details */}
              <div>
                <h3 className="font-medium mb-3">Visit Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Purpose:</span>
                    <p className="font-medium">{selectedRequest.purpose}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedRequest.status)}
                      <Badge className={getStatusColor(selectedRequest.status)}>
                        {selectedRequest.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium">{format(new Date(selectedRequest.visit_date), 'MMMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">{selectedRequest.start_time} - {selectedRequest.end_time}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Documents:</span>
                    <p className="font-medium">
                      {selectedRequest.documents_uploaded ? 'Uploaded' : 'Pending'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested:</span>
                    <p className="font-medium">{format(new Date(selectedRequest.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div>
                  <h3 className="font-medium mb-3">Additional Notes</h3>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedRequest.rejection_reason && (
                <div>
                  <h3 className="font-medium mb-3">Rejection Reason</h3>
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{selectedRequest.rejection_reason}</AlertDescription>
                  </Alert>
                </div>
              )}

              {/* QR Code Info */}
              {selectedRequest.qr_code && (
                <div>
                  <h3 className="font-medium mb-3">Access Information</h3>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">QR Code Generated</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Visitor can use their digital pass for entry
                    </p>
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