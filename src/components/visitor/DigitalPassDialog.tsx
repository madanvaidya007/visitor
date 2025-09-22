import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QrCode, Download, Share2, MapPin, Clock, User, Building, Shield, CheckCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  qr_code: string;
  visitor: {
    full_name: string;
    company: string;
    photo_url?: string;
  };
  host: {
    full_name: string;
  };
  zones?: string[];
}

interface DigitalPassDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  visitRequest: VisitRequest;
}

export function DigitalPassDialog({ 
  open = false, 
  onOpenChange, 
  visitRequest 
}: DigitalPassDialogProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && visitRequest?.qr_code) {
      generateQRCodeImage();
    }
  }, [open, visitRequest]);

  const generateQRCodeImage = async () => {
    if (!visitRequest?.qr_code) return;
    
    setLoading(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(visitRequest.qr_code, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPass = async () => {
    if (!canvasRef.current || !visitRequest) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for digital pass
    canvas.width = 400;
    canvas.height = 600;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw header with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 80);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 80);

    // Company logo area
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VMS PASS', canvas.width / 2, 50);

    // Visitor photo placeholder
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(20, 100, 80, 80);
    ctx.strokeStyle = '#d1d5db';
    ctx.strokeRect(20, 100, 80, 80);
    
    // Visitor name
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(visitRequest.visitor.full_name, 120, 130);

    // Company
    ctx.font = '16px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(visitRequest.visitor.company || 'N/A', 120, 155);

    // Visit details
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Visit Details', 20, 220);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#374151';
    ctx.fillText(`Purpose: ${visitRequest.purpose}`, 20, 245);
    ctx.fillText(`Date: ${new Date(visitRequest.visit_date).toLocaleDateString()}`, 20, 265);
    ctx.fillText(`Time: ${visitRequest.start_time} - ${visitRequest.end_time}`, 20, 285);
    ctx.fillText(`Host: ${visitRequest.host.full_name}`, 20, 305);

    // QR Code
    if (qrCodeUrl) {
      const qrImage = new Image();
      qrImage.onload = () => {
        // QR Code background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(100, 340, 200, 200);
        ctx.strokeStyle = '#e5e7eb';
        ctx.strokeRect(100, 340, 200, 200);
        
        // QR Code
        ctx.drawImage(qrImage, 130, 370, 140, 140);

        // Instructions
        ctx.fillStyle = '#374151';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Scan this QR code at security checkpoints', canvas.width / 2, 570);

        // Download the image
        const link = document.createElement('a');
        link.download = `digital-pass-${visitRequest.visitor.full_name}-${visitRequest.visit_date}.png`;
        link.href = canvas.toDataURL();
        link.click();

        toast({
          title: 'Pass Downloaded',
          description: 'Your digital pass has been saved to your device.'
        });
      };
      qrImage.src = qrCodeUrl;
    }
  };

  const sharePass = async () => {
    if (!visitRequest || !qrCodeUrl) return;

    const shareData = {
      title: 'Digital Visitor Pass',
      text: `Digital pass for ${visitRequest.visitor.full_name} - ${visitRequest.purpose}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`Digital Visitor Pass: ${shareData.text}`);
        toast({
          title: 'Copied to clipboard',
          description: 'Pass details copied to clipboard.'
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
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
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Digital Visitor Pass
            </DialogTitle>
            <DialogDescription>
              Official visitor access pass with QR code verification
            </DialogDescription>
          </DialogHeader>

          {visitRequest && (
            <div className="space-y-4">
              {/* Pass Card */}
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Shield className="h-6 w-6 text-blue-600" />
                      <span className="font-bold text-lg text-blue-900">VISITOR MANAGEMENT SYSTEM</span>
                    </div>
                    <Badge className={`${getStatusColor(visitRequest.status)} border`}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {visitRequest.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <Separator className="mb-4" />

                  {/* Visitor Info */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      {visitRequest.visitor.photo_url ? (
                        <img 
                          src={visitRequest.visitor.photo_url} 
                          alt="Visitor"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <User className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{visitRequest.visitor.full_name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span>{visitRequest.visitor.company || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visit Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Host:</span>
                      <span>{visitRequest.host.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Purpose:</span>
                      <span>{visitRequest.purpose}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(visitRequest.visit_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Time:</span>
                      <span>{visitRequest.start_time} - {visitRequest.end_time}</span>
                    </div>
                    {visitRequest.zones && visitRequest.zones.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                        <span className="font-medium">Authorized Zones:</span>
                        <div className="flex flex-wrap gap-1">
                          {visitRequest.zones.map((zone, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {zone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="mb-4" />

                  {/* QR Code */}
                  <div className="text-center">
                    <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
                      {loading ? (
                        <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-sm text-gray-500">Loading...</span>
                        </div>
                      ) : qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                          <QrCode className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Present this QR code at security checkpoints
                    </p>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-4">
                    <p className="text-xs text-amber-800">
                      <strong>Security Notice:</strong> This pass is valid only for the specified date and time. 
                      Unauthorized use or sharing of this pass is prohibited.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={downloadPass} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Pass
                </Button>
                <Button variant="outline" onClick={sharePass} className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for pass generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
}