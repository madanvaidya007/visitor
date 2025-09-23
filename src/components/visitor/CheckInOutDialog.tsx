import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { QrCode, Scan, Clock, MapPin, User, CheckCircle, LogOut, AlertTriangle, Timer, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQRCode } from '@/hooks/useQRCode';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInMinutes, isWithinInterval, parseISO } from 'date-fns';

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

interface CheckInState {
  processing: boolean;
  visitId?: string;
  progress: number;
}

export function CheckInOutDialog() {
  const [open, setOpen] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [activeVisits, setActiveVisits] = useState<ActiveVisit[]>([]);
  const [checkedInVisits, setCheckedInVisits] = useState<ActiveVisit[]>([]);
  const [checkInState, setCheckInState] = useState<CheckInState>({ processing: false, progress: 0 });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

  const validateVisitTiming = (visit: ActiveVisit): string[] => {
    const errors: string[] = [];
    const now = new Date();
    const visitDate = parseISO(visit.visit_date);
    const startTime = parseISO(`${visit.visit_date}T${visit.start_time}`);
    const endTime = parseISO(`${visit.visit_date}T${visit.end_time}`);
    
    // Check if visit is for today
    if (format(visitDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) {
      errors.push('Visit is not scheduled for today');
    }
    
    // Check if current time is within visit window (with 30-minute buffer)
    const bufferStart = new Date(startTime.getTime() - 30 * 60 * 1000);
    const bufferEnd = new Date(endTime.getTime() + 30 * 60 * 1000);
    
    if (!isWithinInterval(now, { start: bufferStart, end: bufferEnd })) {
      const minutesToStart = differenceInMinutes(startTime, now);
      const minutesPastEnd = differenceInMinutes(now, endTime);
      
      if (minutesToStart > 30) {
        errors.push(`Visit starts in ${minutesToStart} minutes`);
      } else if (minutesPastEnd > 30) {
        errors.push(`Visit ended ${minutesPastEnd} minutes ago`);
      }
    }
    
    return errors;
  };

  const handleCheckIn = async (visitId?: string) => {
    try {
      setCheckInState({ processing: true, visitId, progress: 0 });
      setValidationErrors([]);
      
      let qrCode = qrCodeInput;
      let visit: ActiveVisit | undefined;
      
      // Progress: Validating input
      setCheckInState(prev => ({ ...prev, progress: 20 }));
      
      // If checking in from approved list, use that visit's QR code
      if (visitId) {
        visit = activeVisits.find(v => v.id === visitId);
        if (!visit) {
          throw new Error('Visit not found');
        }
        
        // Validate visit timing
        const timingErrors = validateVisitTiming(visit);
        if (timingErrors.length > 0) {
          setValidationErrors(timingErrors);
          toast({
            title: 'Timing validation failed',
            description: timingErrors.join(', '),
            variant: 'destructive'
          });
          return;
        }
        
        if (visit?.qr_code) {
          qrCode = visit.qr_code;
        } else {
          throw new Error('This visit does not have a valid QR code.');
        }
      }

      if (!qrCode.trim()) {
        throw new Error('Please enter or scan a QR code.');
      }

      // Progress: Processing QR code
      setCheckInState(prev => ({ ...prev, progress: 60 }));
      
      const result = await scanQRCode(qrCode, 'check_in', profile?.id);
      
      // Progress: Finalizing
      setCheckInState(prev => ({ ...prev, progress: 90 }));
      
      if (result.success) {
        setQrCodeInput('');
        await fetchActiveVisits();
        
        toast({
          title: 'Check-in successful!',
          description: visit ? `Checked in for: ${visit.purpose}` : 'You have been checked in successfully',
          variant: 'default'
        });
        
        setCheckInState(prev => ({ ...prev, progress: 100 }));
        
        // Reset after a short delay
        setTimeout(() => {
          setCheckInState({ processing: false, progress: 0 });
        }, 1000);
      }
    } catch (error: any) {
      setCheckInState({ processing: false, progress: 0 });
      toast({
        title: 'Check-in failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleCheckOut = async (visitId: string) => {
    try {
      setCheckInState({ processing: true, visitId, progress: 0 });
      
      const visit = checkedInVisits.find(v => v.id === visitId);
      if (!visit?.qr_code) {
        throw new Error('Cannot check out without valid QR code.');
      }

      // Progress: Fetching check-in time
      setCheckInState(prev => ({ ...prev, progress: 25 }));
      
      // Get check-in time from visit logs
      const { data: checkInLog, error: logError } = await supabase
        .from('visit_logs')
        .select('timestamp')
        .eq('visit_request_id', visitId)
        .eq('action', 'check_in')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (logError) {
        console.warn('Could not fetch check-in time:', logError);
      }

      // Progress: Processing checkout
      setCheckInState(prev => ({ ...prev, progress: 50 }));
      
      const result = await scanQRCode(visit.qr_code, 'check_out', profile?.id);
      
      setCheckInState(prev => ({ ...prev, progress: 90 }));
      
      if (result.success) {
        await fetchActiveVisits();
        
        // Calculate visit duration if check-in time is available
        let durationMessage = '';
        if (checkInLog?.timestamp) {
          const checkInTime = parseISO(checkInLog.timestamp);
          const checkOutTime = new Date();
          const duration = differenceInMinutes(checkOutTime, checkInTime);
          
          if (duration >= 60) {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            durationMessage = ` (Duration: ${hours}h ${minutes}m)`;
          } else {
            durationMessage = ` (Duration: ${duration}m)`;
          }
        }
        
        toast({
          title: 'Check-out successful!',
          description: `Checked out from: ${visit.purpose}${durationMessage}`,
          variant: 'default'
        });
        
        setCheckInState(prev => ({ ...prev, progress: 100 }));
        
        setTimeout(() => {
          setCheckInState({ processing: false, progress: 0 });
        }, 1000);
      }
    } catch (error: any) {
      setCheckInState({ processing: false, progress: 0 });
      toast({
        title: 'Check-out failed',
        description: error.message,
        variant: 'destructive'
      });
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
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Processing Progress */}
          {checkInState.processing && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    {checkInState.progress < 50 ? 'Validating...' : 
                     checkInState.progress < 90 ? 'Processing...' : 'Finalizing...'}
                  </span>
                </div>
                <Progress value={checkInState.progress} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Manual QR Code Entry */}
          <div className="space-y-3">
            <h4 className="font-medium">Manual Check-in</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter or scan QR code"
                value={qrCodeInput}
                onChange={(e) => setQrCodeInput(e.target.value)}
                className="flex-1"
                disabled={checkInState.processing}
              />
              <Button 
                onClick={() => handleCheckIn()}
                disabled={loading || !qrCodeInput.trim() || checkInState.processing}
                size="sm"
              >
                {checkInState.processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
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
                          {/* Time validation indicator */}
                          {(() => {
                            const errors = validateVisitTiming(visit);
                            if (errors.length > 0) {
                              return (
                                <div className="flex items-center gap-1 mt-1">
                                  <Timer className="h-3 w-3 text-orange-500" />
                                  <span className="text-xs text-orange-600">{errors[0]}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(visit.id)}
                          disabled={loading || checkInState.processing || validateVisitTiming(visit).length > 0}
                          className="bg-approved hover:bg-approved/90"
                        >
                          {checkInState.processing && checkInState.visitId === visit.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
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
                          disabled={loading || checkInState.processing}
                        >
                          {checkInState.processing && checkInState.visitId === visit.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <LogOut className="h-3 w-3 mr-1" />
                          )}
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