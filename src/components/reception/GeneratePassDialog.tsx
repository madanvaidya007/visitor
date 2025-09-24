import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Download, Printer, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQRCode } from '@/hooks/useQRCode';
import { useEmailNotifications } from '@/hooks/useEmailService';
import { generateQRCodeImage, qrCodeToBase64 } from '@/utils/qrCodeUtils';
import qrcode from 'qrcode-generator';

interface GeneratePassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitRequestId: string | null;
  onSuccess: () => void;
}

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  qr_code: string | null;
  visitor: {
    full_name: string;
    company: string | null;
    photo_url: string | null;
    email: string;
  };
  host: {
    full_name: string;
  };
}

export function GeneratePassDialog({ open, onOpenChange, visitRequestId, onSuccess }: GeneratePassDialogProps) {
  const [visitRequest, setVisitRequest] = useState<VisitRequest | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateQRCode, loading } = useQRCode();
  const { sendDigitalPass } = useEmailNotifications();
  const { toast } = useToast();

  useEffect(() => {
    if (visitRequestId && open) {
      fetchVisitRequest();
    }
  }, [visitRequestId, open]);

  const fetchVisitRequest = async () => {
    if (!visitRequestId) return;

    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          id,
          purpose,
          visit_date,
          start_time,
          end_time,
          qr_code,
          visitor:visitor_id(full_name, company, photo_url, email),
          host:host_id(full_name)
        `)
        .eq('id', visitRequestId)
        .single();

      if (error) throw error;
      setVisitRequest(data as any);

      // Generate QR code if not exists
      if (!data.qr_code) {
        await handleGenerateQRCode();
      } else {
        generateQRCodeImage(data.qr_code);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching visit request',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleGenerateQRCode = async () => {
    if (!visitRequestId) return;

    setIsGenerating(true);
    try {
      const qrCode = await generateQRCode(visitRequestId);
      if (qrCode) {
        generateQRCodeImage(qrCode);
        // Refresh visit request data
        await fetchVisitRequest();
      }
    } catch (error: any) {
      toast({
        title: 'Error generating QR code',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQRCodeImage = async (qrCodeData: string) => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(qrCodeData);
      qr.make();
      
      // Create canvas and draw QR code
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const moduleCount = qr.getModuleCount();
      const cellSize = 8;
      const margin = 16;
      
      canvas.width = canvas.height = moduleCount * cellSize + margin * 2;
      
      if (ctx) {
        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.fillStyle = '#000000';
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
        
        const dataUrl = canvas.toDataURL();
        setQrCodeDataUrl(dataUrl);
      }
    } catch (error) {
      console.error('Error generating QR code image:', error);
    }
  };

  const handleDownloadPass = () => {
    if (!visitRequest || !qrCodeDataUrl) return;

    // Create a temporary canvas to combine all pass elements
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 600;

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Add title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Visitor Pass', canvas.width / 2, 50);

    // Add visitor details
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Name: ${visitRequest.visitor.full_name}`, 30, 100);
    ctx.fillText(`Company: ${visitRequest.visitor.company || 'N/A'}`, 30, 130);
    ctx.fillText(`Host: ${visitRequest.host.full_name}`, 30, 160);
    ctx.fillText(`Purpose: ${visitRequest.purpose}`, 30, 190);
    ctx.fillText(`Date: ${visitRequest.visit_date}`, 30, 220);
    ctx.fillText(`Time: ${visitRequest.start_time} - ${visitRequest.end_time}`, 30, 250);

    // Add QR code
    if (qrCodeDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, (canvas.width - 200) / 2, 300, 200, 200);
        
        // Download the canvas as image
        const link = document.createElement('a');
        link.download = `visitor-pass-${visitRequest.visitor.full_name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = qrCodeDataUrl;
    }
  };

  const handlePrintPass = () => {
    if (!visitRequest || !qrCodeDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Visitor Pass - ${visitRequest.visitor.full_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              text-align: center;
            }
            .pass-container {
              border: 2px solid #e5e7eb;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .qr-code {
              margin: 20px 0;
            }
            .details {
              text-align: left;
              margin: 20px 0;
            }
            .details div {
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="pass-container">
            <h1>Visitor Pass</h1>
            <div class="details">
              <div><strong>Name:</strong> ${visitRequest.visitor.full_name}</div>
              <div><strong>Company:</strong> ${visitRequest.visitor.company || 'N/A'}</div>
              <div><strong>Host:</strong> ${visitRequest.host.full_name}</div>
              <div><strong>Purpose:</strong> ${visitRequest.purpose}</div>
              <div><strong>Date:</strong> ${visitRequest.visit_date}</div>
              <div><strong>Time:</strong> ${visitRequest.start_time} - ${visitRequest.end_time}</div>
            </div>
            <div class="qr-code">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; height: 200px;">
            </div>
            <p><small>Scan QR code for check-in/out</small></p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleEmailPass = async () => {
    if (!visitRequest || !qrCodeDataUrl) return;

    try {
      // Convert QR code data URL to base64 for email
      const qrCodeImage = qrCodeDataUrl.split(',')[1];

      console.log('🔄 Sending digital pass email to:', visitRequest.visitor.email);
      const digitalPassResult = await sendDigitalPass(visitRequest.visitor.email, {
        visitorId: visitRequest.id,
        visitorName: visitRequest.visitor.full_name,
        hostName: visitRequest.host.full_name,
        company: visitRequest.visitor.company || 'N/A',
        visitDate: visitRequest.visit_date,
        startTime: visitRequest.start_time,
        endTime: visitRequest.end_time,
        purpose: visitRequest.purpose,
        zone: 'Main Building',
        qrCode: `data:image/png;base64,${qrCodeImage}`,
        passId: visitRequest.id,
        validUntil: visitRequest.end_time,
      });
      console.log('✅ Digital pass email result:', digitalPassResult);

      toast({
        title: 'Digital pass sent',
        description: `Digital pass has been sent to ${visitRequest.visitor.email}`
      });
    } catch (error: any) {
      toast({
        title: 'Error sending digital pass',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (!visitRequest) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Visitor Pass</DialogTitle>
          <DialogDescription>
            Digital gate pass with QR code for {visitRequest.visitor.full_name}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Visitor Pass</CardTitle>
            <Badge className="w-fit mx-auto">
              {visitRequest.visit_date}
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Visitor Info */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{visitRequest.visitor.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Company:</span>
                <span>{visitRequest.visitor.company || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Host:</span>
                <span>{visitRequest.host.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Purpose:</span>
                <span className="text-right">{visitRequest.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span>{visitRequest.start_time} - {visitRequest.end_time}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center space-y-2">
              {qrCodeDataUrl ? (
                <div>
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="mx-auto w-32 h-32 border rounded"
                  />
                  <p className="text-xs text-muted-foreground">
                    Scan for check-in/out
                  </p>
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto border rounded flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              {!visitRequest.qr_code && (
                <Button 
                  onClick={handleGenerateQRCode}
                  disabled={isGenerating || loading}
                  className="w-full"
                >
                  {isGenerating || loading ? 'Generating...' : 'Generate QR Code'}
                </Button>
              )}
              
              {qrCodeDataUrl && (
                <>
                  <Button onClick={handleDownloadPass} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Pass
                  </Button>
                  <Button onClick={handlePrintPass} variant="outline" className="w-full">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Pass
                  </Button>
                  <Button onClick={handleEmailPass} variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Pass
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}