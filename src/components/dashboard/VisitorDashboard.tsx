import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Plus, QrCode, FileText, Scan } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { NewVisitRequestDialog } from '@/components/visitor/NewVisitRequestDialog';
import { DocumentUploadDialog } from '@/components/visitor/DocumentUploadDialog';
import { QRCodeDialog } from '@/components/visitor/QRCodeDialog';
import { CheckInOutDialog } from '@/components/visitor/CheckInOutDialog';

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  qr_code?: string;
  host: {
    full_name: string;
    company?: string;
  };
}

export function VisitorDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

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
        .order('visit_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setVisitRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching visits",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-approved text-approved-foreground';
      case 'pending': return 'bg-pending text-pending-foreground';
      case 'rejected': return 'bg-rejected text-rejected-foreground';
      case 'checked_in': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {profile?.full_name.split(' ')[0]}!
        </h1>
        <p className="text-white/90">
          Manage your visit requests and track your access status
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card hover:shadow-elevated transition-smooth">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">New Visit Request</h3>
                <p className="text-sm text-muted-foreground">Submit a new visit</p>
              </div>
            </div>
            <NewVisitRequestDialog onRequestCreated={fetchVisitRequests} />
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elevated transition-smooth">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <QrCode className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">My Pass</h3>
                <p className="text-sm text-muted-foreground">View QR code</p>
              </div>
            </div>
            <QRCodeDialog />
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elevated transition-smooth">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">Documents</h3>
                <p className="text-sm text-muted-foreground">Upload ID & docs</p>
              </div>
            </div>
            <DocumentUploadDialog />
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elevated transition-smooth">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Scan className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Check In/Out</h3>
                <p className="text-sm text-muted-foreground">Scan QR to enter</p>
              </div>
            </div>
            <CheckInOutDialog />
          </CardContent>
        </Card>
      </div>

      {/* Recent Visit Requests */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Visit Requests
          </CardTitle>
          <CardDescription>
            Track the status of your recent visit requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : visitRequests.length > 0 ? (
            <div className="space-y-4">
              {visitRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-smooth">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{request.purpose}</h4>
                      {request.qr_code && (
                        <QrCode className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(request.visit_date)}
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
                  <Badge className={getStatusColor(request.status)} variant="secondary">
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No visit requests yet</h3>
              <p className="text-muted-foreground mb-4">
                Submit your first visit request to get started
              </p>
              <NewVisitRequestDialog onRequestCreated={fetchVisitRequests} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}