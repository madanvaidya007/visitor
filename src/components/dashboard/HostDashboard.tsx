import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQRCode } from '@/hooks/useQRCode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HostBusyStatusToggle } from '@/components/host/HostBusyStatusToggle';
import { VisitRescheduleDialog } from '@/components/visit/VisitRescheduleDialog';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  MapPin,
  UserCheck,
  Bell,
  CalendarClock
} from 'lucide-react';
import { format } from 'date-fns';

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  visitor_id: string;
  created_at: string;
  notes?: string;
  visitor: {
    full_name: string;
    company?: string;
    phone?: string;
  };
}

export function HostDashboard() {
  const { profile } = useAuth();
  const { generateQRCode } = useQRCode();
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    visitRequest: VisitRequest | null;
  }>({ open: false, visitRequest: null });

  useEffect(() => {
    if (profile) {
      fetchVisitRequests();
      fetchHostProfile();
    }
  }, [profile]);

  const fetchHostProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_busy, busy_message, busy_until')
        .eq('id', profile?.id)
        .single();

      if (error) throw error;
      setHostProfile(data);
    } catch (error) {
      console.error('Error fetching host profile:', error);
    }
  };

  const fetchVisitRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(full_name, company, phone)
        `)
        .eq('host_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setVisitRequests(data || []);
    } catch (error) {
      console.error('Error fetching visit requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          status: action,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      
      // If approved, generate QR code
      if (action === 'approved') {
        const qrCodeData = await generateQRCode(requestId);
        if (!qrCodeData) {
          console.error('Failed to generate QR code for visit request:', requestId);
        }
      }

      fetchVisitRequests();
    } catch (error) {
      console.error('Error updating visit request:', error);
    }
  };

  const handleReschedule = (request: VisitRequest) => {
    setRescheduleDialog({ open: true, visitRequest: request });
  };

  const handleRescheduleSuccess = () => {
    setRescheduleDialog({ open: false, visitRequest: null });
    fetchVisitRequests(); // Refresh the list
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'checked_in':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'checked_out':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const pendingRequests = visitRequests.filter(req => req.status === 'pending');
  const todaysVisitors = visitRequests.filter(
    req => req.visit_date === format(new Date(), 'yyyy-MM-dd') && req.status === 'approved'
  );
  const checkedInVisitors = visitRequests.filter(req => req.status === 'checked_in');

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {profile?.full_name}</h1>
        <p className="text-white/90">Manage your visitor requests and meetings</p>
      </div>

      {/* Busy Status Toggle */}
      <HostBusyStatusToggle
        isBusy={hostProfile?.is_busy}
        busyMessage={hostProfile?.busy_message}
        busyUntil={hostProfile?.busy_until}
        onStatusChange={fetchHostProfile}
      />

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
                <p className="text-sm text-muted-foreground">Today's Visitors</p>
                <p className="text-xl font-semibold">{todaysVisitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checked In</p>
                <p className="text-xl font-semibold">{checkedInVisitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-xl font-semibold">{visitRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-500" />
              Pending Approval ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Review and approve visitor requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-yellow-50/50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          PENDING APPROVAL
                        </Badge>
                      </div>
                      <h4 className="font-medium">{request.purpose}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {request.visitor.full_name}
                          {request.visitor.company && ` (${request.visitor.company})`}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(request.visit_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {request.start_time} - {request.end_time}
                        </div>
                      </div>
                      {request.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{request.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRequestAction(request.id, 'rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReschedule(request)}
                      >
                        <CalendarClock className="h-4 w-4 mr-2" />
                        Reschedule
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleRequestAction(request.id, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Visit Requests */}
      <Card>
        <CardHeader>
          <CardTitle>All Visit Requests</CardTitle>
          <CardDescription>Complete history of visitor requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading visit requests...</p>
            </div>
          ) : visitRequests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No visit requests yet</h3>
              <p className="text-muted-foreground">Visitor requests will appear here when submitted</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visitRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge variant="secondary" className={getStatusColor(request.status)}>
                          {request.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{request.purpose}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {request.visitor.full_name}
                          {request.visitor.company && ` (${request.visitor.company})`}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(request.visit_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {request.start_time} - {request.end_time}
                        </div>
                      </div>
                      {request.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{request.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(request.status === 'pending' || request.status === 'approved') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReschedule(request)}
                        >
                          <CalendarClock className="h-4 w-4 mr-2" />
                          Reschedule
                        </Button>
                      )}
                      {request.status === 'approved' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => generateQRCode(request.id)}
                        >
                          Generate QR
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <VisitRescheduleDialog
        isOpen={rescheduleDialog.open}
        onClose={() => setRescheduleDialog({ open: false, visitRequest: null })}
        visitRequest={rescheduleDialog.visitRequest}
        onRescheduleSuccess={handleRescheduleSuccess}
      />
    </div>
  );
}