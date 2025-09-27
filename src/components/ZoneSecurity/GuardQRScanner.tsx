import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  User, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Shield,
  CameraOff,
  Scan
} from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions.tsx';
import { useToast } from '@/hooks/use-toast';
import { zoneSecurityService } from '@/services/zoneSecurityService';
import { QRScanResult, ZoneVisitor, SecurityZone } from '@/types/zoneTypes';

interface GuardQRScannerProps {
  zoneId?: string;
  entryPointId?: string;
}

export function GuardQRScanner({ zoneId, entryPointId }: GuardQRScannerProps) {
  const { profile } = useAuth();
  const permissions = usePermissions();
  const { toast } = useToast();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [visitor, setVisitor] = useState<ZoneVisitor | null>(null);
  const [zone, setZone] = useState<SecurityZone | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (zoneId) {
      fetchZoneInfo();
    }
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.clear();
      }
    };
  }, [zoneId]);

  const fetchZoneInfo = async () => {
    if (!zoneId) return;
    
    try {
      const zones = await zoneSecurityService.getZones();
      const currentZone = zones.find(z => z.id === zoneId);
      setZone(currentZone || null);
    } catch (error) {
      console.error('Error fetching zone info:', error);
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanResult(null);
    setVisitor(null);
    setError('');

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;
  };

  const stopScanning = () => {
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      scannerRef.current.clear();
    }
    setIsScanning(false);
    scannerRef.current = null;
  };

  const onScanSuccess = async (decodedText: string) => {
    setScanResult(null);
    setVisitor(null);
    stopScanning();
    
    await processQRCode(decodedText);
  };

  const onScanFailure = (error: string) => {
    // Handle scan failures silently for better UX
    console.log('QR scan error:', error);
  };

  const processQRCode = async (qrData: string) => {
    setLoading(true);
    try {
      // Simulate QR code processing - in real implementation, use a QR code library
      const result = await zoneSecurityService.processQRScan({
        qr_data: qrData,
        guard_id: profile?.id || '',
        zone_id: zoneId || '',
        entry_point_id: entryPointId || '',
        scan_timestamp: new Date().toISOString(),
        scan_location: zone?.name || 'Unknown Zone'
      });

      setScanResult(result);
      
      if (result.visitor) {
        setVisitor(result.visitor);
      }

      if (result.success) {
        toast({
          title: 'Access Granted',
          description: `${result.visitor?.full_name} has been checked in to ${zone?.name}`,
        });
      } else {
        toast({
          title: 'Access Denied',
          description: result.message || 'Invalid QR code or access not authorized',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Scan Error',
        description: 'Failed to process QR code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = async (qrCode: string) => {
    if (!qrCode.trim()) return;
    await processQRCode(qrCode);
  };

  const resetScan = () => {
    setScanResult(null);
    setVisitor(null);
    setError('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'checked_in':
        return <Badge className="bg-blue-100 text-blue-800">Checked In</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone Info */}
      {zone && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">{zone.name}</CardTitle>
            </div>
            <CardDescription>
              {zone.description} • Security Level: {zone.access_level}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* QR Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>
            Scan visitor QR codes to verify and check in visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isScanning && !scanResult ? (
            <div className="text-center space-y-4">
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Ready to scan QR codes</p>
                </div>
              </div>
              <Button 
                onClick={startScanning} 
                className="w-full"
                disabled={!zoneId || !permissions.canScanQR(zoneId)}
              >
                <Camera className="h-4 w-4 mr-2" />
                {!zoneId || !permissions.canScanQR(zoneId) ? 'Scanning Not Permitted' : 'Start Scanning'}
              </Button>
              {!permissions.canScanQR(zoneId || '') && (
                <p className="text-sm text-red-600">
                  You don't have permission to scan QR codes for this zone.
                </p>
              )}
            </div>
          ) : isScanning ? (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full"></div>
              <Button onClick={stopScanning} variant="outline" className="w-full">
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Scanning
              </Button>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <Scan className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-lg font-medium">Verifying access...</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Scan Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              {scanResult.success ? (
                <Badge className="bg-green-100 text-green-800">Access Granted</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Access Denied</Badge>
              )}
            </div>
            
            {scanResult.message && (
              <Alert>
                <AlertDescription>{scanResult.message}</AlertDescription>
              </Alert>
            )}

            {visitor && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={visitor.photo_url || ''} alt={visitor.full_name} />
                    <AvatarFallback>
                      {visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{visitor.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{visitor.email}</p>
                    {visitor.company && (
                      <p className="text-sm text-muted-foreground">{visitor.company}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Purpose:</span>
                    <p className="text-muted-foreground">{visitor.purpose}</p>
                  </div>
                  <div>
                    <span className="font-medium">Visit Date:</span>
                    <p className="text-muted-foreground">{visitor.visit_date}</p>
                  </div>
                  <div>
                    <span className="font-medium">Time:</span>
                    <p className="text-muted-foreground">
                      {visitor.start_time} - {visitor.end_time}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    {getStatusBadge(visitor.status)}
                  </div>
                </div>

                {visitor.destination_zone && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>Destination: {visitor.destination_zone}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={resetScan} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}