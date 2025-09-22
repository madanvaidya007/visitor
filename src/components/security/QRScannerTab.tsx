import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Scan, UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useQRCode } from '@/hooks/useQRCode';
import { useToast } from '@/hooks/use-toast';

interface QRScannerTabProps {
  onScanSuccess: () => void;
}

export function QRScannerTab({ onScanSuccess }: QRScannerTabProps) {
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const { scanQRCode, loading } = useQRCode();
  const { toast } = useToast();

  const handleScan = async (action: 'check_in' | 'check_out') => {
    if (!qrCode.trim()) {
      toast({
        title: 'Invalid QR code',
        description: 'Please enter a valid QR code.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await scanQRCode(qrCode, action, 'Security Officer');
      setScanResult(result);
      
      if (result.success) {
        onScanSuccess();
        setQrCode(''); // Clear after successful scan
      }
    } catch (error: any) {
      toast({
        title: 'Scan failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const simulateQRScan = () => {
    // Simulate scanning a QR code for demo purposes
    const demoQRCode = `VMS-demo-${Date.now()}`;
    setQrCode(demoQRCode);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>QR Code Scanner</CardTitle>
          <CardDescription>Scan visitor QR codes for check-in and check-out</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manual QR Code Input */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="qr_code">QR Code</Label>
              <div className="flex space-x-2">
                <Input
                  id="qr_code"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Scan or enter QR code"
                  className="flex-1"
                />
                <Button 
                  variant="outline"
                  onClick={simulateQRScan}
                  aria-label="Simulate QR code scan"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Scan Actions */}
            <div className="flex space-x-2">
              <Button
                onClick={() => handleScan('check_in')}
                disabled={!qrCode.trim() || loading}
                className="flex-1"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Check In
              </Button>
              <Button
                onClick={() => handleScan('check_out')}
                disabled={!qrCode.trim() || loading}
                variant="outline"
                className="flex-1"
              >
                <Clock className="mr-2 h-4 w-4" />
                Check Out
              </Button>
            </div>
          </div>

          {/* Camera Scanner (Placeholder) */}
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Camera Scanner</h3>
            <p className="text-muted-foreground mb-4">
              Position QR code within the camera view
            </p>
            <Button variant="outline">
              <Scan className="mr-2 h-4 w-4" />
              Open Camera Scanner
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {scanResult.success ? (
                <CheckCircle className="mr-2 h-5 w-5 text-success" />
              ) : (
                <XCircle className="mr-2 h-5 w-5 text-destructive" />
              )}
              Scan Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanResult.success ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge className="bg-success text-success-foreground">Success</Badge>
                </div>
                {scanResult.visitRequest && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Visitor:</span>
                      <span>{scanResult.visitRequest.visitor?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Purpose:</span>
                      <span>{scanResult.visitRequest.purpose}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Time:</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant="destructive">Failed</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Error:</span>
                  <span className="text-destructive">{scanResult.error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>Latest QR code scan activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent rounded-full">
                    <UserCheck className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">John Doe</p>
                    <p className="text-xs text-muted-foreground">Check-in successful</p>
                  </div>
                </div>
                <Badge variant="outline">
                  {new Date(Date.now() - index * 300000).toLocaleTimeString()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}