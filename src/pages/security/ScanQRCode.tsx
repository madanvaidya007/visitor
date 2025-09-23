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
  const cameraActiveRef = useRef<boolean>(false);
  
  const { scanQRCode, validateQRCodeString, loading } = useQRCode();
  const { toast } = useToast();
  const { profile } = useAuth();

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Ensure component is ready after mount
  useEffect(() => {
    const checkComponentReady = () => {
      if (canvasRef.current) {
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
        cameraActiveRef.current = true;
        setIsScanning(true);
        
        // Wait a bit more for video to be fully ready
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            addDebugLog('✅ Video ready, starting QR detection');
            detectQRCode();
          } else {
            addDebugLog('⏳ Video still loading, waiting more...');
            setTimeout(() => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                addDebugLog('✅ Video ready after wait, starting QR detection');
                detectQRCode();
              } else {
                addDebugLog('❌ Video failed to load properly');
              }
            }, 1000);
          }
        }, 200);
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
    cameraActiveRef.current = false;
    setIsScanning(false);
  };

  const detectQRCode = () => {
    // Enhanced ref checking with more detailed logging
    if (!videoRef.current) {
      addDebugLog('❌ Detection stopped - videoRef is null');
      return;
    }
    
    if (!canvasRef.current) {
      addDebugLog('❌ Detection stopped - canvasRef is null');
      return;
    }
    
    // Use ref instead of state to avoid timing issues
    if (!cameraActiveRef.current) {
      addDebugLog('❌ Detection stopped - camera not active (ref check)');
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
      addDebugLog(`⏳ Video not ready (readyState: ${video.readyState}), retrying...`);
      setTimeout(() => detectQRCode(), 100);
      return;
    }

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog(`⏳ Video dimensions not ready (${video.videoWidth}x${video.videoHeight}), retrying...`);
      setTimeout(() => detectQRCode(), 100);
      return;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Add debug info about image data
      addDebugLog(`🔍 Scanning frame: ${canvas.width}x${canvas.height}, data length: ${imageData.data.length}`);
      
      // Check if jsQR is available
      if (typeof jsQR !== 'function') {
        addDebugLog('❌ jsQR library not loaded properly');
        return;
      }
      
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        addDebugLog(`✅ QR Code detected: ${code.data.substring(0, 50)}...`);
        setQrCode(code.data);
        stopCamera();
        
        // Automatically process the detected QR code
        handleQRCodeDetected(code.data);
      } else {
        // Continue scanning with a slight delay to prevent excessive CPU usage
        if (cameraActiveRef.current && videoRef.current && canvasRef.current) {
          setTimeout(() => detectQRCode(), 100);
        }
      }
    } catch (error) {
      addDebugLog(`❌ QR detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('QR Detection Error:', error);
      if (isScanning && videoRef.current && canvasRef.current) {
        setTimeout(() => detectQRCode(), 100);
      }
    }
  };

  const handleQRCodeDetected = async (qrCodeData: string) => {
    try {
      addDebugLog('🔍 Processing detected QR code...');
      
      // Pre-validate QR code format and expiration
      const validation = validateQRCodeString(qrCodeData);
      if (!validation.valid) {
        setScanResult({
          success: false,
          message: 'Invalid QR Code',
          error: validation.reason || 'QR code validation failed'
        });
        addDebugLog(`❌ QR validation failed: ${validation.reason}`);
        return;
      }

      addDebugLog(`✅ QR code pre-validation passed (v${validation.data?.version})`);
      
      // Get visitor information with enhanced validation
      const visitorInfo = await getVisitorInfo(qrCodeData);
      
      if (!visitorInfo) {
        setScanResult({
          success: false,
          message: 'Invalid Digital Visit Pass',
          error: 'QR code not found, expired, or not valid for current time'
        });
        addDebugLog('❌ Invalid visit pass detected');
        return;
      }

      addDebugLog(`✅ Valid visit pass for ${visitorInfo.visitor.full_name}`);

      // Determine action based on current status
      const action = visitorInfo.status === 'checked_in' ? 'check_out' : 'check_in';
      addDebugLog(`📋 Action determined: ${action}`);
      
      // Perform the scan action with enhanced logging
      const result = await scanQRCode(qrCodeData, action, profile?.id);
      
      if (result.success) {
        addDebugLog(`✅ ${action} completed successfully`);
        setScanResult({
          success: true,
          message: `${action === 'check_in' ? 'Check-in' : 'Check-out'} completed successfully`,
          visitor: visitorInfo,
          action: action
        });

        await fetchRecentScans();
        toast({
          title: 'Success',
          description: `${visitorInfo.visitor.full_name} has been ${action.replace('_', ' ')}ed successfully`,
        });
      } else {
        addDebugLog(`❌ ${action} failed: ${result.error}`);
        setScanResult({
          success: false,
          message: `${action.replace('_', ' ')} failed`,
          error: result.error || 'Operation failed'
        });
        
        toast({
          title: 'Error',
          description: result.error || 'Operation failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      addDebugLog(`❌ Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setScanResult({
        success: false,
        message: 'Error processing digital visit pass',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        title: 'Processing Error',
        description: 'Failed to process the digital visit pass. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleManualScan = async (action: 'check_in' | 'check_out') => {
    if (!qrCode.trim()) {
      toast({
        title: 'Digital Visit Pass Required',
        description: 'Please enter or scan a digital visit pass QR code.',
        variant: 'destructive'
      });
      return;
    }

    try {
      addDebugLog(`🔍 Processing manual scan for ${action}...`);
      
      // Pre-validate QR code format and expiration
      const validation = validateQRCodeString(qrCode);
      if (!validation.valid) {
        setScanResult({
          success: false,
          message: 'Invalid QR Code',
          error: validation.reason || 'QR code validation failed'
        });
        addDebugLog(`❌ Manual scan QR validation failed: ${validation.reason}`);
        toast({
          title: 'Invalid QR Code',
          description: validation.reason || 'QR code validation failed',
          variant: 'destructive'
        });
        return;
      }

      addDebugLog(`✅ Manual scan QR code pre-validation passed (v${validation.data?.version})`);
      
      // First, get visitor information with enhanced validation
      const visitorInfo = await getVisitorInfo(qrCode);
      
      if (!visitorInfo) {
        setScanResult({
          success: false,
          message: 'Invalid Digital Visit Pass',
          error: 'QR code not found, expired, or not valid for current time'
        });
        addDebugLog('❌ Invalid visit pass in manual scan');
        return;
      }

      addDebugLog(`✅ Valid visit pass for ${visitorInfo.visitor.full_name}`);

      // Validate action against current status
      if (action === 'check_in' && visitorInfo.status === 'checked_in') {
        setScanResult({
          success: false,
          message: 'Already Checked In',
          error: 'This visitor is already checked in. Use check-out instead.'
        });
        addDebugLog('❌ Visitor already checked in');
        return;
      }

      if (action === 'check_out' && visitorInfo.status !== 'checked_in') {
        setScanResult({
          success: false,
          message: 'Not Checked In',
          error: 'This visitor is not currently checked in. Use check-in instead.'
        });
        addDebugLog('❌ Visitor not checked in');
        return;
      }

      // Perform the scan action
      const result = await scanQRCode(qrCode, action, profile?.id);
      
      if (result.success) {
        addDebugLog(`✅ Manual ${action} completed successfully`);
        setScanResult({
          success: true,
          message: `${action === 'check_in' ? 'Check-in' : 'Check-out'} successful`,
          visitor: visitorInfo,
          action
        });
        setQrCode('');
        fetchRecentScans();
        
        toast({
          title: 'Success',
          description: `${visitorInfo.visitor.full_name} has been ${action.replace('_', ' ')}ed successfully`,
        });
      } else {
        addDebugLog(`❌ Manual ${action} failed: ${result.error}`);
        setScanResult({
          success: false,
          message: `${action.replace('_', ' ')} Failed`,
          error: result.error
        });
        
        toast({
          title: 'Error',
          description: result.error || 'Operation failed',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      addDebugLog(`❌ Manual scan error: ${error.message}`);
      setScanResult({
        success: false,
        message: `${action.replace('_', ' ')} Failed`,
        error: error.message
      });
      
      toast({
        title: 'Processing Error',
        description: 'Failed to process the digital visit pass. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getVisitorInfo = async (qrCode: string): Promise<VisitorInfo | null> => {
    try {
      addDebugLog(`🔍 Validating QR code (full): ${qrCode}`);
      addDebugLog(`📏 QR code length: ${qrCode.length}`);
      addDebugLog(`🔤 QR code type: ${typeof qrCode}`);
      
      // Extract visit request ID from QR code
      // Supports multiple formats:
      // Current: QR_{visitRequestId}_{timestamp}
      // Legacy: VMS-{visitRequestId}-{timestamp}
      // Legacy UUID: VMS-{uuid-parts}-{timestamp}
      // Enhanced: VMS-v2.0-{visitRequestId}-{timestamp}-{expiresAt}-{checksum}-{securityLevel}
      if (!qrCode.startsWith('VMS-') && !qrCode.startsWith('QR_')) {
        addDebugLog(`❌ Invalid QR format. Expected to start with 'VMS-' or 'QR_', Got: ${qrCode}`);
        throw new Error('Invalid QR code format. Expected digital visit pass format.');
      }
      
      let visitRequestId: string;
      let timestamp: string;
      
      // Handle QR_ format: QR_{visitRequestId}_{timestamp}
      if (qrCode.startsWith('QR_')) {
        const parts = qrCode.split('_');
        if (parts.length >= 3) {
          visitRequestId = parts[1];
          timestamp = parts[2];
          addDebugLog(`🔧 Detected QR_ format - ID: ${visitRequestId}, Timestamp: ${timestamp}`);
        } else {
          addDebugLog(`❌ Invalid QR_ format. Expected minimum 3 parts, Got: ${qrCode}`);
          throw new Error('Invalid QR code format. Expected digital visit pass format.');
        }
      } else {
        // Split by hyphens and extract parts for VMS- formats
        const parts = qrCode.split('-');
        if (parts.length < 3) {
          addDebugLog(`❌ Invalid QR format. Expected minimum 3 parts, Got: ${qrCode}`);
          throw new Error('Invalid QR code format. Expected digital visit pass format.');
        }
        
        // Handle enhanced format: VMS-v2.0-{visitRequestId}-{timestamp}-{expiresAt}-{checksum}-{securityLevel}
        if (parts.length >= 7 && parts[1].startsWith('v')) {
          addDebugLog(`🔧 Detected enhanced QR format v${parts[1].substring(1)}`);
          
          if (parts.length === 7) {
            // Simple ID format: VMS-v2.0-{visitRequestId}-{timestamp}-{expiresAt}-{checksum}-{securityLevel}
            visitRequestId = parts[2];
            timestamp = parts[3];
          } else if (parts.length === 11) {
            // UUID format: VMS-v2.0-{uuid-part1}-{uuid-part2}-{uuid-part3}-{uuid-part4}-{uuid-part5}-{timestamp}-{expiresAt}-{checksum}-{securityLevel}
            visitRequestId = parts.slice(2, 7).join('-'); // Reconstruct UUID
            timestamp = parts[7];
          } else {
            addDebugLog(`❌ Invalid enhanced QR format. Unexpected number of parts: ${parts.length}, Got: ${qrCode}`);
            throw new Error('Invalid QR code format. Expected digital visit pass format.');
          }
        }
        // Handle legacy formats
        else if (parts.length === 3) {
        // Simple legacy format: VMS-{visitRequestId}-{timestamp}
        addDebugLog(`🔧 Detected legacy QR format (simple)`);
        visitRequestId = parts[1];
        timestamp = parts[2];
      } else if (parts.length === 7) {
        // UUID legacy format: VMS-{uuid-part1}-{uuid-part2}-{uuid-part3}-{uuid-part4}-{uuid-part5}-{timestamp}
        addDebugLog(`🔧 Detected legacy QR format (UUID)`);
        visitRequestId = parts.slice(1, 6).join('-'); // Reconstruct UUID
        timestamp = parts[6];
      } else {
          addDebugLog(`❌ Invalid QR format. Unexpected number of parts: ${parts.length}, Got: ${qrCode}`);
          throw new Error('Invalid QR code format. Expected digital visit pass format.');
        }
      }
      
      addDebugLog(`📋 Extracted visit request ID: ${visitRequestId}`);
      addDebugLog(`⏰ Extracted timestamp: ${timestamp}`);

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

      if (error) {
        addDebugLog(`❌ Database error: ${error.message}`);
        throw error;
      }

      // Enhanced validation for digital visit pass
      if (!data) {
        addDebugLog('❌ Visit request not found in database');
        throw new Error('Visit request not found');
      }

      addDebugLog(`✅ Found visit request for ${data.visitor?.full_name || 'Unknown visitor'}`);
      addDebugLog(`📅 Visit date: ${data.visit_date}, Status: ${data.status}`);

      // Check if visit is for today or future dates
      const visitDate = new Date(data.visit_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      visitDate.setHours(0, 0, 0, 0);

      if (visitDate < today) {
        addDebugLog(`❌ Visit pass expired. Visit date: ${data.visit_date}, Today: ${today.toISOString().split('T')[0]}`);
        throw new Error('Visit pass has expired');
      }

      // Check if visit is within time window (30 minutes before start time to end time)
      const now = new Date();
      const startTime = new Date(`${data.visit_date}T${data.start_time}`);
      const endTime = new Date(`${data.visit_date}T${data.end_time}`);
      const earlyAccessTime = new Date(startTime.getTime() - 30 * 60 * 1000); // 30 minutes before

      addDebugLog(`⏰ Time validation - Now: ${now.toLocaleTimeString()}, Early access: ${earlyAccessTime.toLocaleTimeString()}, End: ${endTime.toLocaleTimeString()}`);

      if (now < earlyAccessTime) {
        addDebugLog('❌ Visit pass not yet valid - too early');
        throw new Error('Visit pass is not yet valid. Please arrive within 30 minutes of your scheduled time.');
      }

      if (now > endTime && data.status !== 'checked_in') {
        addDebugLog('❌ Visit pass expired - past end time and not checked in');
        throw new Error('Visit pass has expired for the scheduled time');
      }

      // Validate visit status
      if (!['approved', 'checked_in'].includes(data.status)) {
        addDebugLog(`❌ Invalid status: ${data.status}. Expected: approved or checked_in`);
        throw new Error('Visit pass is not approved or has been cancelled');
      }

      addDebugLog(`✅ All validations passed for visitor: ${data.visitor?.full_name}`);
      return data as VisitorInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      addDebugLog(`❌ Validation failed: ${errorMessage}`);
      console.error('Error validating visit pass:', error);
      return null;
    }
  };

  const simulateQRScan = async () => {
    try {
      // First, let's get a real visit request from the database for demo
      const { data: visitRequests, error } = await supabase
        .from('visit_requests')
        .select('id, qr_code')
        .eq('status', 'approved')
        .not('qr_code', 'is', null)
        .limit(1);

      if (error) {
        console.error('Error fetching visit requests:', error);
        // Fallback to a properly formatted demo QR code
        const demoQRCode = `VMS-550e8400-e29b-41d4-a716-446655440000-${Date.now()}`;
        setQrCode(demoQRCode);
        addDebugLog(`🎭 Using fallback demo QR: ${demoQRCode}`);
        return;
      }

      if (visitRequests && visitRequests.length > 0 && visitRequests[0].qr_code) {
        // Use real QR code from database
        setQrCode(visitRequests[0].qr_code);
        addDebugLog(`🎭 Using real QR from database: ${visitRequests[0].qr_code}`);
      } else {
        // Create a properly formatted demo QR code with valid UUID format
        const demoQRCode = `VMS-550e8400-e29b-41d4-a716-446655440000-${Date.now()}`;
        setQrCode(demoQRCode);
        addDebugLog(`🎭 Using formatted demo QR: ${demoQRCode}`);
      }
    } catch (error) {
      console.error('Error in simulateQRScan:', error);
      // Fallback to properly formatted demo
      const demoQRCode = `VMS-550e8400-e29b-41d4-a716-446655440000-${Date.now()}`;
      setQrCode(demoQRCode);
      addDebugLog(`🎭 Error fallback demo QR: ${demoQRCode}`);
    }
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
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-64 object-cover ${!cameraActive ? 'hidden' : ''}`}
                  />
                  {!cameraActive && (
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
                    placeholder="Scan or enter QR code (e.g., VMS-550e8400-e29b-41d4-a716-446655440100-1737550800000)"
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
                <p className="text-xs text-muted-foreground mt-1">
                  Test QR codes: VMS-550e8400-e29b-41d4-a716-446655440100-1737550800000 (approved), 
                  VMS-550e8400-e29b-41d4-a716-446655440102-1737551400000 (checked-in)<br/>
                  Error test: INVALID-QR-CODE (invalid format), VMS-expired-visit-123 (expired)
                </p>
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