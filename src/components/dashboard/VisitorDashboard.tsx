import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  QrCode, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { NewVisitRequestDialog } from '@/components/visitor/NewVisitRequestDialog';
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
  host: {
    full_name: string;
    company?: string;
  };
}

export function VisitorDashboard() {
  const { profile } = useAuth();
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showCheckInOut, setShowCheckInOut] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchVisitRequests();
    }
  }, [profile]);

  const fetchVisitRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          host:profiles!visit_requests_host_id_fkey(full_name, company)
        `)
        .eq('visitor_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setVisitRequests(data || []);
    } catch (error) {
      console.error('Error fetching visit requests:', error);
    } finally {
      setLoading(false);
    }
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
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
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

  const upcomingVisits = visitRequests.filter(
    req => req.status === 'approved' && new Date(req.visit_date) >= new Date()
  );

  const todaysVisits = visitRequests.filter(
    req => req.visit_date === format(new Date(), 'yyyy-MM-dd')
  );

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {profile?.full_name}</h1>
        <p className="text-white/90">Manage your visits and access requests</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button onClick={() => setShowQRDialog(true)} className="w-full">
          <QrCode className="h-4 w-4 mr-2" />
          My Digital Pass
        </Button>
        <Button onClick={() => setShowCheckInOut(true)} variant="outline" className="w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Check In/Out
        </Button>
        <Button onClick={() => setShowNewRequest(true)} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Visit Request
        </Button>
      </div>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Visits</p>
                <p className="text-xl font-semibold">{upcomingVisits.length}</p>
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
                <p className="text-sm text-muted-foreground">Today's Visits</p>
                <p className="text-xl font-semibold">{todaysVisits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold">
                  {visitRequests.filter(req => req.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <QrCode className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Passes</p>
                <p className="text-xl font-semibold">
                  {visitRequests.filter(req => req.status === 'approved' && req.qr_code).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Visit Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Visit Requests</CardTitle>
            <CardDescription>Your latest visit requests and their status</CardDescription>
          </div>
          <Button onClick={() => setShowNewRequest(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading visit requests...</p>
            </div>
          ) : visitRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No visit requests yet</h3>
              <p className="text-muted-foreground mb-4">Create your first visit request to get started</p>
              <Button onClick={() => setShowNewRequest(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Request
              </Button>
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
                        {request.qr_code && (
                          <Badge variant="outline">
                            <QrCode className="h-3 w-3 mr-1" />
                            QR Ready
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium">{request.purpose}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(request.visit_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {request.start_time} - {request.end_time}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Host: {request.host.full_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {request.status === 'approved' && request.qr_code && (
                        <Button variant="outline" size="sm" onClick={() => setShowQRDialog(true)}>
                          <QrCode className="h-4 w-4 mr-2" />
                          View Pass
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

      {/* New Visit Request Dialog */}
      <NewVisitRequestDialog
        open={showNewRequest}
        onOpenChange={setShowNewRequest}
        onSuccess={() => {
          setShowNewRequest(false);
          fetchVisitRequests();
        }}
      />

      {/* QR Code Dialog */}
      {showQRDialog && <QRCodeDialog />}

      {/* Check In/Out Dialog */}
      {showCheckInOut && <CheckInOutDialog />}
    </div>
  );
}