import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, Scan, Clock, MapPin, User, CheckCircle, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQRCode } from '@/hooks/useQRCode';
import { useToast } from '@/hooks/use-toast';

interface ActiveVisit {
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

export function CheckInOutDialog() {
  const [open, setOpen] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [activeVisits, setActiveVisits] = useState<ActiveVisit[]>([]);
  const [checkedInVisits, setCheckedInVisits] = useState<ActiveVisit[]>([]);

  const { profile } = useAuth();
  const { scanQRCode, loading } = useQRCode();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchActiveVisits();
    }
  }, [open]);

  const fetchActiveVisits = async () => {
    if (!profile) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch approved visits for today
      const { data: approved, error: approvedError } = await supabase
        .from('visit_requests')
        .select(`
          *,
          host:profiles!visit_requests_host_id_fkey(full_name, company)
        `)
        .eq('visitor_id', profile.id)
        .eq('status', 'approved')
        .eq('visit_date', today);

      if (approvedError) throw approvedError;

      // Fetch checked-in visits
      const { data: checkedIn, error: checkedInError } = await supabase
        .from('visit_requests')
        .select(`
          *,
          host:profiles!visit_requests_host_id_fkey(full_name, company)
        `)
        .eq('visitor_id', profile.id)
        .eq('status', 'checked_in')
        .eq('visit_date', today);

      if (checkedInError) throw checkedInError;

      setActiveVisits(approved || []);
      setCheckedInVisits(checkedIn || []);
    } catch (error: any) {
      toast({
        title: 'Error loading visits',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleCheckIn = async (visitId?: string) => {
    try {
      let qrCode = qrCodeInput;
      
      // If visiting from approved list, use that visit's QR code
      if (visitId) {
        const visit = activeVisits.find(v => v.id === visitId);
        if (visit?.qr_code) {
          qrCode = visit.qr_code;
        } else {
          toast({
            title: 'QR code not found',
            description: 'This visit does not have a valid QR code.',
            variant: 'destructive'
          });
          return;
        }
      }

      if (!qrCode.trim()) {
        toast({
          title: 'QR code required',
          description: 'Please enter or scan a QR code.',
          variant: 'destructive'
        });
        return;
      }

      const result = await scanQRCode(qrCode, 'check_in', profile?.id);
      
      if (result.success) {
        setQrCodeInput('');
        fetchActiveVisits();
      }
    } catch (error: any) {
      toast({
        title: 'Check-in failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleCheckOut = async (visitId: string) => {
    const visit = checkedInVisits.find(v => v.id === visitId);
    if (!visit?.qr_code) {
      toast({
        title: 'QR code not found',
        description: 'Cannot check out without valid QR code.',
        variant: 'destructive'
      });
      return;
    }

    const result = await scanQRCode(visit.qr_code, 'check_out', profile?.id);
    
    if (result.success) {
      fetchActiveVisits();
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Scan className="h-4 w-4 mr-2" />
          Check In/Out
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check In/Out</DialogTitle>
          <DialogDescription>
            Use your QR code to check in or check out of visits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Manual QR Code Entry */}
          <div className="space-y-3">
            <h4 className="font-medium">Manual Check-in</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter or scan QR code"
                value={qrCodeInput}
                onChange={(e) => setQrCodeInput(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => handleCheckIn()}
                disabled={loading || !qrCodeInput.trim()}
                size="sm"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Today's Approved Visits */}
          {activeVisits.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Ready to Check In</h4>
              <div className="space-y-2">
                {activeVisits.map((visit) => (
                  <Card key={visit.id} className="border border-approved/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{visit.purpose}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {visit.host.full_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(visit.start_time)}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(visit.id)}
                          disabled={loading}
                          className="bg-approved hover:bg-approved/90"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Check In
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Currently Checked In */}
          {checkedInVisits.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Currently Checked In</h4>
              <div className="space-y-2">
                {checkedInVisits.map((visit) => (
                  <Card key={visit.id} className="border border-success/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{visit.purpose}</p>
                            <Badge className="bg-success text-success-foreground text-xs">
                              Active
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {visit.host.full_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Until {formatTime(visit.end_time)}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(visit.id)}
                          disabled={loading}
                        >
                          <LogOut className="h-3 w-3 mr-1" />
                          Check Out
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeVisits.length === 0 && checkedInVisits.length === 0 && (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Visits</h3>
              <p className="text-muted-foreground text-sm">
                You don't have any approved visits for today.
              </p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}