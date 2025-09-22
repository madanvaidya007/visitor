import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  QrCode, 
  Scan, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Camera, 
  CameraOff,
  User,
  Building,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useQRCode } from '@/hooks/useQRCode';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import jsQR from 'jsqr';

interface VisitorInfo {
  id: string;
  visitor: {
    full_name: string;
    email: string;
    phone: string;
    company?: string;
  };
  host: {
    full_name: string;
    company?: string;
  };
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  qr_code: string;
}

interface ScanResult {
  success: boolean;
  message: string;
  visitor?: VisitorInfo;
  action?: 'check_in' | 'check_out';
  error?: string;
}

export default function ScanQRCode() {
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [componentReady, setComponentReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { scanQRCode, loading } = useQRCode();
  const { toast } = useToast();
  const { profile } = useAuth();

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Ensure component is ready after mount
  useEffect(() => {
    const checkComponentReady = () => {
      if (videoRef.current && canvasRef.current) {
        setComponentReady(true);
        addDebugLog('✅ Component fully mounted and ready');
      } else {
        addDebugLog('⏳ Waiting for component to mount...');
        setTimeout(checkComponentReady, 100);
      }
    };
    
    checkComponentReady();
  }, []);

  useEffect(() => {
    fetchRecentScans();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`
          *,
          visit_request:visit_requests(
            visitor:profiles!visit_requests_visitor_id_fkey(full_name, company),
            purpose,
            visit_date
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentScans(data || []);
    } catch (error) {
      console.error('Error fetching recent scans:', error);
    }
  };

  const startCamera = async () => {
    console.log('🎥 Starting camera access...');
    addDebugLog('🎥 Starting camera access...');
    
    // Check if component is ready
    if (!componentReady) {
      const errorMsg = '❌ Component not ready - please wait a moment';
      console.error(errorMsg);
      addDebugLog(errorMsg);
      toast({
        title: "Component Loading",
        description: "Please wait for the component to load completely, then try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if video ref is available
    if (!videoRef.current) {
      const errorMsg = '❌ Video element not found - component not ready';
      console.error(errorMsg);
      addDebugLog(errorMsg);
      toast({
        title: "Component Error",
        description: "Video element not ready. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    addDebugLog('✅ Video element reference found');
    
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = '❌ Camera API not supported';
        console.error(errorMsg);
        addDebugLog(errorMsg);
        throw new Error('Camera not supported in this browser');
      }

      console.log('✅ Camera API supported, requesting permissions...');
      addDebugLog('✅ Camera API supported, requesting permissions...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      console.log('✅ Camera stream obtained:', stream);
      addDebugLog('✅ Camera stream obtained');
      
      // Double-check video ref before using it
      if (!videoRef.current) {
        addDebugLog('❌ Video ref became null after getting stream');
        throw new Error('Video element reference lost');
      }

      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      streamRef.current = stream;
      
      console.log('✅ Video element configured');
      addDebugLog('✅ Video element configured');
      
      // Wait for video to be ready before starting detection
      videoElement.onloadedmetadata = () => {
        console.log('✅ Video metadata loaded, starting detection');
        addDebugLog('✅ Video metadata loaded, starting detection');
        setCameraActive(true);
        setIsScanning(true);
        
        // Start QR code detection
        detectQRCode();
      };

      // Add error handler for video element
      videoElement.onerror = (error) => {
        console.error('❌ Video element error:', error);
        addDebugLog(`❌ Video element error: ${error}`);
      };
      
      // Force a small delay to ensure video element is ready
      setTimeout(() => {
        if (videoRef.current && videoRef.current.readyState === 0) {
          addDebugLog('⏳ Video still loading, waiting...');
        }
      }, 100);
    } catch (error) {
      console.error('❌ Camera access error:', error);
      let errorMessage = 'Unable to access camera. ';
      
      if (error instanceof Error) {
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        addDebugLog(`❌ Camera access failed: ${error.message}`);
        
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera permissions and try again.';
          addDebugLog('🚫 Permission denied by user');
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
          addDebugLog('📷 No camera device found');
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported in this browser.';
          addDebugLog('🚫 Camera not supported');
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Camera is already in use by another application.';
          addDebugLog('🔒 Camera already in use');
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'Camera constraints cannot be satisfied.';
          addDebugLog('⚙️ Camera constraints not supported');
        } else {
          errorMessage += error.message;
          addDebugLog(`🔍 Unknown error: ${error.message}`);
        }
      }
      
      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsScanning(false);
  };

  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      addDebugLog('❌ Detection stopped - missing refs or not scanning');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      addDebugLog('❌ Canvas context not available');
      return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      addDebugLog('⏳ Video not ready, retrying...');
      requestAnimationFrame(detectQRCode);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        addDebugLog(`✅ QR Code detected: ${code.data.substring(0, 50)}...`);
        setQrCode(code.data);
        stopCamera();
        
        // Automatically process the detected QR code
        handleQRCodeDetected(code.data);
      } else {
        // Continue scanning
        requestAnimationFrame(detectQRCode);
      }
    } catch (error) {
      addDebugLog(`❌ QR detection error: ${error.message}`);
      requestAnimationFrame(detectQRCode);
    }
  };

  const handleQRCodeDetected = async (qrCodeData: string) => {
    try {
      // Get visitor information
      const visitorInfo = await getVisitorInfo(qrCodeData);
      
      if (!visitorInfo) {
        setScanResult({
          success: false,
          message: 'Invalid QR Code',
          error: 'QR code not found or expired'
        });
        return;
      }

      // Determine action based on current status
      const action = visitorInfo.status === 'checked_in' ? 'check_out' : 'check_in';
      
      // Perform the scan action
      const result = await scanQRCode(qrCodeData, action, profile?.id);
      
      setScanResult({
        success: result.success,
        message: result.message,
        visitor: visitorInfo,
        action: action
      });

      if (result.success) {
        await fetchRecentScans();
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      setScanResult({
        success: false,
        message: 'Error processing QR code',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleManualScan = async (action: 'check_in' | 'check_out') => {
    if (!qrCode.trim()) {
      toast({
        title: 'QR Code Required',
        description: 'Please enter or scan a QR code.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // First, get visitor information
      const visitorInfo = await getVisitorInfo(qrCode);
      
      if (!visitorInfo) {
        setScanResult({
          success: false,
          message: 'Invalid QR Code',
          error: 'QR code not found or expired'
        });
        return;
      }

      // Perform the scan action
      const result = await scanQRCode(qrCode, action, profile?.id);
      
      if (result.success) {
        setScanResult({
          success: true,
          message: `${action === 'check_in' ? 'Check-in' : 'Check-out'} successful`,
          visitor: visitorInfo,
          action
        });
        setQrCode('');
        fetchRecentScans();
      } else {
        setScanResult({
          success: false,
          message: 'Scan Failed',
          error: result.error
        });
      }
    } catch (error: any) {
      setScanResult({
        success: false,
        message: 'Scan Failed',
        error: error.message
      });
    }
  };

  const getVisitorInfo = async (qrCode: string): Promise<VisitorInfo | null> => {
    try {
      // Extract visit request ID from QR code
      const parts = qrCode.split('-');
      if (parts.length < 2 || parts[0] !== 'VMS') {
        throw new Error('Invalid QR code format');
      }
      
      const visitRequestId = parts[1];

      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(full_name, email, phone, company),
          host:profiles!visit_requests_host_id_fkey(full_name, company)
        `)
        .eq('id', visitRequestId)
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;
      return data as VisitorInfo;
    } catch (error) {
      return null;
    }
  };

  const simulateQRScan = () => {
    // Simulate scanning a QR code for demo purposes
    const demoQRCode = `VMS-demo-${Date.now()}`;
    setQrCode(demoQRCode);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">QR Code Scanner</h1>
        <p className="text-muted-foreground">
          Scan visitor QR codes for check-in and check-out
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="space-y-6">
          {/* Debug Information Panel */}
          {debugInfo.length > 0 && (
            <Card className="p-4 bg-gray-50 border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  🔍 Debug Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {debugInfo.map((log, index) => (
                    <div key={index} className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Scanner
              </CardTitle>
              <CardDescription>
                Use your device camera to scan QR codes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div className="border-2 border-dashed border-muted rounded-lg overflow-hidden bg-black">
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Camera Scanner</h3>
                        <p className="text-muted-foreground mb-4">
                          {!componentReady ? 'Loading camera component...' : 'Position QR code within the camera view'}
                        </p>
                        {!componentReady && (
                          <p className="text-sm text-muted-foreground">
                            Please wait for the component to load completely
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex gap-2">
                {!cameraActive ? (
                  <Button onClick={startCamera} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="outline" className="flex-1">
                    <CameraOff className="mr-2 h-4 w-4" />
                    Stop Camera
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Manual Entry
              </CardTitle>
              <CardDescription>
                Enter QR code manually or use demo data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="qr_code">QR Code</Label>
                <div className="flex space-x-2">
                  <Input
                    id="qr_code"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    placeholder="Scan or enter QR code"
                    className="flex-1"
                    aria-label="QR code input field"
                  />
                  <Button 
                    variant="outline"
                    onClick={simulateQRScan}
                    aria-label="Generate demo QR code"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleManualScan('check_in')}
                  disabled={!qrCode.trim() || loading}
                  className="flex-1"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Check In
                </Button>
                <Button
                  onClick={() => handleManualScan('check_out')}
                  disabled={!qrCode.trim() || loading}
                  variant="outline"
                  className="flex-1"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Check Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
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
              <CardContent>
                {scanResult.success && scanResult.visitor ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        {scanResult.message}
                      </AlertDescription>
                    </Alert>

                    {/* Visitor Information */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-3">Visitor Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{scanResult.visitor.visitor.full_name}</span>
                        </div>
                        {scanResult.visitor.visitor.company && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-green-600" />
                            <span>{scanResult.visitor.visitor.company}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span>Host: {scanResult.visitor.host.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span>{scanResult.visitor.visit_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span>
                            {formatTime(scanResult.visitor.start_time)} - {formatTime(scanResult.visitor.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(scanResult.visitor.status)}>
                            {scanResult.visitor.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {scanResult.error || scanResult.message}
                    </AlertDescription>
                  </Alert>
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
                {recentScans.length > 0 ? (
                  recentScans.map((scan, index) => (
                    <div key={scan.id || index} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-accent rounded-full">
                          {scan.action === 'check_in' ? (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {scan.visit_request?.visitor?.full_name || 'Unknown Visitor'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {scan.action === 'check_in' ? 'Check-in' : 'Check-out'} successful
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {new Date(scan.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <QrCode className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent scans</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}