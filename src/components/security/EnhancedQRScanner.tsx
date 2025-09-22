import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  ScanLine, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Clock, 
  MapPin,
  Building,
  Shield,
  RefreshCw
} from 'lucide-react';
import jsQR from 'jsqr';
import { useQRCode } from '@/hooks/useQRCode';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
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

interface ScanResult {
  success: boolean;
  message: string;
  visitRequest?: VisitRequest;
  error?: string;
  securityAlert?: string;
}

export function EnhancedQRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { scanQRCode } = useQRCode();
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchScanHistory();
    return () => {
      stopScanning();
    };
  }, []);

  const fetchScanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`
          *,
          visit_requests:visit_request_id (
            purpose,
            visitor:profiles!visit_requests_visitor_id_fkey (
              full_name,
              company
            )
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setScanHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching scan history:', error);
    }
  };

  const startScanning = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      setIsScanning(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        
        // Start QR code detection
        intervalRef.current = setInterval(scanFrame, 100);
      }
    } catch (error: any) {
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive'
      });
      console.error('Camera error:', error);
    }
  };

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code && code.data !== lastScannedCode) {
      setLastScannedCode(code.data);
      handleQRCodeDetected(code.data);
    }
  };

  const handleQRCodeDetected = async (qrCode: string) => {
    stopScanning();
    
    // Validate QR code format
    if (!qrCode.startsWith('VMS-')) {
      setScanResult({
        success: false,
        message: 'Invalid QR code format',
        error: 'This is not a valid visitor pass QR code.',
        securityAlert: 'Unauthorized QR code detected'
      });
      setResultDialogOpen(true);
      return;
    }

    try {
      // Extract visit request ID from QR code
      const parts = qrCode.split('-');
      if (parts.length < 2) {
        throw new Error('Invalid QR code format');
      }
      
      const visitRequestId = parts[1];

      // Fetch detailed visit request information
      const { data: visitRequest, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey (
            full_name,
            company,
            photo_url
          ),
          host:profiles!visit_requests_host_id_fkey (
            full_name
          )
        `)
        .eq('id', visitRequestId)
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;
      if (!visitRequest) throw new Error('Invalid or expired QR code');

      // Check visit validity
      const currentDate = new Date();
      const visitDate = new Date(visitRequest.visit_date);
      const startTime = new Date(`${visitRequest.visit_date}T${visitRequest.start_time}`);
      const endTime = new Date(`${visitRequest.visit_date}T${visitRequest.end_time}`);

      let securityAlert = '';
      let canProceed = true;

      // Time validation
      if (currentDate < startTime) {
        securityAlert = 'Visit time has not started yet';
        canProceed = false;
      } else if (currentDate > endTime) {
        securityAlert = 'Visit time has expired';
        canProceed = false;
      }

      // Status validation
      if (visitRequest.status === 'rejected') {
        securityAlert = 'Access denied - Visit request was rejected';
        canProceed = false;
      } else if (visitRequest.status === 'cancelled') {
        securityAlert = 'Access denied - Visit was cancelled';
        canProceed = false;
      }

      if (canProceed) {
        // Determine action based on current status
        const action = visitRequest.status === 'checked_in' ? 'check_out' : 'check_in';
        
        // Perform the scan action
        const result = await scanQRCode(qrCode, action, profile?.id);
        
        setScanResult({
          success: result.success,
          message: result.success ? 
            `Successfully ${action.replace('_', ' ')}ed ${visitRequest.visitor.full_name}` :
            result.error || 'Operation failed',
          visitRequest: visitRequest as any,
          error: result.success ? undefined : result.error
        });

        if (result.success) {
          fetchScanHistory();
        }
      } else {
        setScanResult({
          success: false,
          message: 'Access Denied',
          visitRequest: visitRequest as any,
          error: securityAlert,
          securityAlert
        });
      }
    } catch (error: any) {
      setScanResult({
        success: false,
        message: 'Scan Failed',
        error: error.message || 'Unknown error occurred',
        securityAlert: 'QR code verification failed'
      });
    }

    setResultDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'checked_in':
        return <Badge className="bg-blue-100 text-blue-800">Checked In</Badge>;
      case 'checked_out':
        return <Badge className="bg-gray-100 text-gray-800">Checked Out</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              Scan visitor QR codes for check-in/check-out
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera View */}
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-500 rounded-lg">
                      <div className="w-full h-full border border-blue-300 rounded-lg animate-pulse">
                        <ScanLine className="w-full h-1 text-blue-500 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    Scanning...
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Camera not active</p>
                    <Button onClick={startScanning}>
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {isScanning ? (
                <Button variant="destructive" onClick={stopScanning} className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" />
                  Stop Scanning
                </Button>
              ) : (
                <Button onClick={startScanning} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              )}
              <Button variant="outline" onClick={fetchScanHistory}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Scans
            </CardTitle>
            <CardDescription>
              Latest check-in/check-out activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scanHistory.length === 0 ? (
              <div className="text-center py-8">
                <ScanLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recent Scans</h3>
                <p className="text-muted-foreground">
                  Scanned activities will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scanHistory.slice(0, 5).map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        scan.action === 'check_in' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">
                          {scan.visit_requests?.visitor?.full_name || 'Unknown Visitor'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scan.visit_requests?.purpose || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={scan.action === 'check_in' ? 'default' : 'outline'} className="text-xs">
                        {scan.action.replace('_', ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(scan.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas for QR code detection */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Scan Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scanResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {scanResult?.success ? 'Access Granted' : 'Access Denied'}
            </DialogTitle>
            <DialogDescription>
              QR code scan result
            </DialogDescription>
          </DialogHeader>

          {scanResult && (
            <div className="space-y-4">
              {/* Result Alert */}
              <Alert variant={scanResult.success ? 'default' : 'destructive'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {scanResult.message}
                </AlertDescription>
              </Alert>

              {/* Security Alert */}
              {scanResult.securityAlert && (
                <Alert variant="destructive">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Alert:</strong> {scanResult.securityAlert}
                  </AlertDescription>
                </Alert>
              )}

              {/* Visitor Information */}
              {scanResult.visitRequest && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        {scanResult.visitRequest.visitor.photo_url ? (
                          <img 
                            src={scanResult.visitRequest.visitor.photo_url} 
                            alt="Visitor"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <User className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{scanResult.visitRequest.visitor.full_name}</h4>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          <span>{scanResult.visitRequest.visitor.company || 'N/A'}</span>
                        </div>
                      </div>
                      {getStatusBadge(scanResult.visitRequest.status)}
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>Host: {scanResult.visitRequest.host.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>Purpose: {scanResult.visitRequest.purpose}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>
                          Time: {scanResult.visitRequest.start_time} - {scanResult.visitRequest.end_time}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
                  Close
                </Button>
                {scanResult.success && (
                  <Button onClick={() => {
                    setResultDialogOpen(false);
                    setTimeout(() => startScanning(), 500);
                  }}>
                    Scan Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}