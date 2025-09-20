import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, Download, Share, Clock, MapPin, User, Building } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQRCode } from '@/hooks/useQRCode';

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

export function QRCodeDialog() {
  const [open, setOpen] = useState(false);
  const [approvedVisits, setApprovedVisits] = useState<VisitRequest[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitRequest | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { profile } = useAuth();
  const { toast } = useToast();
  const { generateQRCode: createQRCode } = useQRCode();

  useEffect(() => {
    if (open) {
      fetchApprovedVisits();
    }
  }, [open]);

  useEffect(() => {
    if (selectedVisit) {
      generateQRCode();
    }
  }, [selectedVisit]);

  const fetchApprovedVisits = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          host:profiles!visit_requests_host_id_fkey(full_name, company)
        `)
        .eq('visitor_id', profile.id)
        .in('status', ['approved', 'checked_in'])
        .gte('visit_date', new Date().toISOString().split('T')[0])
        .order('visit_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      setApprovedVisits(data || []);
      if (data && data.length > 0) {
        setSelectedVisit(data[0]);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading visits',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const generateQRCode = async () => {
    if (!selectedVisit || !profile) return;

    setLoading(true);
    try {
      // Generate QR code if it doesn't exist
      let qrCodeData = selectedVisit.qr_code;
      
      if (!qrCodeData) {
        // Update QR code in database if not exists
        if (!qrCodeData) {
          qrCodeData = await createQRCode(selectedVisit.id);
          
          if (qrCodeData) {
            setSelectedVisit(prev => prev ? { ...prev, qr_code: qrCodeData } : null);
          }
        }
      }

      // Generate QR code image
      const qrImageUrl = await QRCodeLib.toDataURL(qrCodeData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      });

      setQrCodeUrl(qrImageUrl);
    } catch (error: any) {
      toast({
        title: 'Error generating QR code',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl || !selectedVisit) return;

    const link = document.createElement('a');
    link.download = `visit-pass-${selectedVisit.visit_date}.png`;
    link.href = qrCodeUrl;
    link.click();

    toast({
      title: 'QR Code downloaded',
      description: 'Your digital pass has been saved to your device.'
    });
  };

  const shareQRCode = async () => {
    if (!qrCodeUrl || !selectedVisit) return;

    if (navigator.share) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], `visit-pass-${selectedVisit.visit_date}.png`, { type: 'image/png' });

        await navigator.share({
          title: 'My Visit Pass',
          text: `Visit pass for ${selectedVisit.purpose} on ${selectedVisit.visit_date}`,
          files: [file]
        });
      } catch (error) {
        // Fallback to copying QR code data
        if (selectedVisit.qr_code) {
          navigator.clipboard.writeText(selectedVisit.qr_code);
          toast({
            title: 'QR Code copied',
            description: 'QR code data copied to clipboard.'
          });
        }
      }
    } else {
      // Fallback for browsers without share API
      if (selectedVisit.qr_code) {
        navigator.clipboard.writeText(selectedVisit.qr_code);
        toast({
          title: 'QR Code copied',
          description: 'QR code data copied to clipboard.'
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-approved text-approved-foreground';
      case 'checked_in': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <QrCode className="h-4 w-4 mr-2" />
          My Digital Pass
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Digital Visit Pass</DialogTitle>
          <DialogDescription>
            Show this QR code at security checkpoints
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {approvedVisits.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Passes</h3>
              <p className="text-muted-foreground">
                You don't have any approved visits for digital passes.
              </p>
            </div>
          ) : (
            <>
              {/* Visit Selection */}
              {approvedVisits.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Visit</label>
                  <select
                    value={selectedVisit?.id || ''}
                    onChange={(e) => {
                      const visit = approvedVisits.find(v => v.id === e.target.value);
                      setSelectedVisit(visit || null);
                    }}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    {approvedVisits.map((visit) => (
                      <option key={visit.id} value={visit.id}>
                        {visit.purpose} - {formatDate(visit.visit_date)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedVisit && (
                <>
                  {/* Visit Details */}
                  <Card className="shadow-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{selectedVisit.purpose}</h4>
                        <Badge className={getStatusColor(selectedVisit.status)} variant="secondary">
                          {selectedVisit.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Host: {selectedVisit.host.full_name}</span>
                        </div>
                        {selectedVisit.host.company && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span>{selectedVisit.host.company}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(selectedVisit.visit_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{selectedVisit.start_time} - {selectedVisit.end_time}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-muted-foreground/25">
                    {loading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : qrCodeUrl ? (
                      <div className="text-center">
                        <img 
                          src={qrCodeUrl} 
                          alt="Visit QR Code" 
                          className="mx-auto mb-4 rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                          Scan this code at security checkpoints
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground">Failed to generate QR code</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {qrCodeUrl && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={downloadQRCode}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        onClick={shareQRCode}
                        className="flex-1"
                      >
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
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