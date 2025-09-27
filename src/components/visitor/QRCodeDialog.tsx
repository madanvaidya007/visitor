import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, Download, Share, Clock, MapPin, User, Building, RefreshCw } from 'lucide-react';
import qrcode from 'qrcode-generator';
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

interface QRCodeDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QRCodeDialog({ open: externalOpen, onOpenChange }: QRCodeDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [approvedVisits, setApprovedVisits] = useState<VisitRequest[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitRequest | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const { profile } = useAuth();
  const { toast } = useToast();
  const { generateQRCode: createQRCode, regenerateQRCode } = useQRCode();

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
    console.log('📋 Fetching approved visits for profile:', profile?.id);
    console.log('🔍 Current user profile details:', {
      profileId: profile?.id,
      userId: profile?.user_id,
      fullName: profile?.full_name,
      email: profile?.email,
      role: profile?.role
    });
    
    if (!profile) {
      console.log('❌ No profile found - user might not be authenticated');
      return;
    }

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

      console.log('🔍 Database query details:', {
        table: 'visit_requests',
        visitorId: profile.id,
        statusFilter: ['approved', 'checked_in'],
        dateFilter: new Date().toISOString().split('T')[0],
        error: error,
        dataCount: data?.length || 0
      });

      if (error) throw error;
      
      console.log('✅ Approved visits fetched:', { count: data?.length, visits: data });
      setApprovedVisits(data || []);
      if (data && data.length > 0) {
        console.log('🎯 Setting first visit as selected:', data[0]);
        setSelectedVisit(data[0]);
      } else {
        console.log('❌ No approved visits found');
      }
    } catch (error: any) {
      console.error('💥 Error fetching approved visits:', error);
      toast({
        title: 'Error loading visits',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const generateQRCode = async (forceRegenerate = false) => {
    if (!selectedVisit || !profile) return;

    setLoading(true);
    try {
      let qrCodeData = selectedVisit.qr_code;
      
      // Generate new QR code if it doesn't exist or force regeneration
      if (!qrCodeData || forceRegenerate) {
        if (forceRegenerate && qrCodeData) {
          // Use regenerate function for existing QR codes
          qrCodeData = await regenerateQRCode(selectedVisit.id);
        } else {
          // Generate new QR code
          qrCodeData = await createQRCode(selectedVisit.id);
        }
        
        if (qrCodeData) {
          setSelectedVisit(prev => prev ? { ...prev, qr_code: qrCodeData } : null);
        }
      }

      // Generate QR code image with enhanced styling
      if (qrCodeData) {
        const qr = qrcode(0, 'M');
        qr.addData(qrCodeData);
        qr.make();
        
        // Create canvas and draw QR code
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const moduleCount = qr.getModuleCount();
        const cellSize = 10;
        const margin = 20;
        
        canvas.width = canvas.height = moduleCount * cellSize + margin * 2;
        
        if (ctx) {
          // Fill background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw QR code
          ctx.fillStyle = '#1e293b';
          for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
              if (qr.isDark(row, col)) {
                ctx.fillRect(
                  col * cellSize + margin,
                  row * cellSize + margin,
                  cellSize,
                  cellSize
                );
              }
            }
          }
          
          const qrImageUrl = canvas.toDataURL();
          setQrCodeUrl(qrImageUrl);
        }
        
        if (forceRegenerate) {
          toast({
            title: 'QR Code Regenerated',
            description: 'A new secure QR code has been generated for your visit.',
          });
        }
      } else {
        setQrCodeUrl('');
        toast({
          title: 'Error generating QR code',
          description: 'Failed to generate QR code data',
          variant: 'destructive'
        });
      }
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
                  <label htmlFor="visit-select" className="text-sm font-medium">Select Visit</label>
                  <select
                    id="visit-select"
                    value={selectedVisit?.id || ''}
                    onChange={(e) => {
                      const visit = approvedVisits.find(v => v.id === e.target.value);
                      setSelectedVisit(visit || null);
                    }}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    aria-label="Select a visit to generate QR code"
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
                          alt={`QR code for ${selectedVisit.purpose} visit on ${selectedVisit.visit_date}`}
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
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={downloadQRCode}
                          className="flex-1"
                          aria-label={`Download QR code for ${selectedVisit.purpose} visit`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          onClick={shareQRCode}
                          className="flex-1"
                          aria-label={`Share QR code for ${selectedVisit.purpose} visit`}
                        >
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => generateQRCode(true)}
                        className="w-full"
                        disabled={loading}
                        aria-label={`Regenerate QR code for ${selectedVisit.purpose} visit`}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Regenerate QR Code
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