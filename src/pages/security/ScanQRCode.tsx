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
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Square,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  error?: string;
}

export default function ScanQRCode() {
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [componentReady, setComponentReady] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [userInteractionRequired, setUserInteractionRequired] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraActiveRef = useRef<boolean>(false);
  
  const { scanQRCode, validateQRCodeString, loading } = useQRCode();
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Debug logging function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
  };

  // Ensure component is ready after mount
  useEffect(() => {
    const checkComponentReady = () => {
      if (canvasRef.current) {
        setComponentReady(true);
      } else {
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
    
    // Mark that permission has been requested
    setPermissionRequested(true);
    setUserInteractionRequired(false);
    
    try {
      // Enhanced mobile browser detection
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);
      const isChrome = /chrome/i.test(userAgent) && !/edg/i.test(userAgent);
      const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
      const isFirefox = /firefox/i.test(userAgent);
      const isEdge = /edg/i.test(userAgent);
      
      // Enhanced security context check
      const isSecureContext = window.isSecureContext || 
                             location.protocol === 'https:' || 
                             location.hostname === 'localhost' || 
                             location.hostname === '127.0.0.1' ||
                             location.hostname.endsWith('.local');
      
      console.log('🔍 Browser detection:', {
        isMobile,
        isIOS,
        isAndroid,
        isChrome,
        isSafari,
        isFirefox,
        isEdge,
        isSecureContext,
        userAgent: navigator.userAgent
      });
      addDebugLog(`🔍 Browser: ${isMobile ? 'Mobile' : 'Desktop'}, ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other'}, Secure: ${isSecureContext}`);
      
      // Check HTTPS requirement for mobile devices
      if (isMobile && !isSecureContext) {
        const errorMsg = '❌ HTTPS required for camera access on mobile devices';
        console.error(errorMsg);
        addDebugLog(errorMsg);
        
        let httpsGuidance = 'Camera access requires HTTPS on mobile devices. ';
        if (location.hostname !== 'localhost' && !location.hostname.endsWith('.local')) {
          httpsGuidance += 'Please access this page via HTTPS (https://) or use a desktop browser.';
        } else {
          httpsGuidance += 'Try accessing via your local network IP with HTTPS, or use a desktop browser.';
        }
        
        toast({
          title: "HTTPS Required",
          description: httpsGuidance,
          variant: "destructive",
        });
        return;
      }

      // Enhanced camera API support check
      if (!navigator.mediaDevices) {
        const errorMsg = '❌ MediaDevices API not supported';
        console.error(errorMsg);
        addDebugLog(errorMsg);
        
        let browserGuidance = 'Your browser does not support camera access. ';
        if (isMobile) {
          if (isIOS) {
            browserGuidance += 'Please use Safari 11+ or Chrome 69+ on iOS.';
          } else if (isAndroid) {
            browserGuidance += 'Please use Chrome 53+ or Firefox 36+ on Android.';
          } else {
            browserGuidance += 'Please use a modern mobile browser.';
          }
        } else {
          browserGuidance += 'Please use a modern browser like Chrome, Firefox, or Safari.';
        }
        
        throw new Error(browserGuidance);
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        const errorMsg = '❌ getUserMedia not supported';
        console.error(errorMsg);
        addDebugLog(errorMsg);
        throw new Error('Camera access not supported in this browser version');
      }

      // Check for permissions API support and query current permission state
      let permissionState = 'unknown';
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          permissionState = permission.state;
          console.log('📋 Camera permission state:', permissionState);
          addDebugLog(`📋 Camera permission: ${permissionState}`);
          
          if (permissionState === 'denied') {
            const errorMsg = '❌ Camera permission permanently denied';
            console.error(errorMsg);
            addDebugLog(errorMsg);
            
            let permissionGuidance = 'Camera permission has been denied. ';
            if (isMobile) {
              if (isIOS && isSafari) {
                permissionGuidance += 'Go to Settings > Safari > Camera and enable camera access, then refresh this page.';
              } else if (isAndroid && isChrome) {
                permissionGuidance += 'Tap the camera icon in the address bar, select "Allow", then refresh this page.';
              } else {
                permissionGuidance += 'Check your browser settings to allow camera access for this site, then refresh this page.';
              }
            } else {
              permissionGuidance += 'Click the camera icon in your browser\'s address bar and select "Allow", then refresh this page.';
            }
            
            toast({
              title: "Camera Permission Denied",
              description: permissionGuidance,
              variant: "destructive",
            });
            return;
          }
        } catch (permError) {
          console.log('⚠️ Permission query failed:', permError);
          addDebugLog('⚠️ Permission query not supported');
        }
      }

      console.log('✅ Camera API supported, requesting permissions...');
      addDebugLog('✅ Camera API supported, requesting permissions...');

      // Show user interaction prompt for mobile devices if needed
      if (isMobile && permissionState === 'prompt') {
        console.log('📱 Mobile device detected, showing permission guidance');
        addDebugLog('📱 Showing mobile permission guidance');
        
        let interactionGuidance = 'Camera permission is required. ';
        if (isIOS && isSafari) {
          interactionGuidance += 'When prompted, tap "Allow" to grant camera access.';
        } else if (isAndroid && isChrome) {
          interactionGuidance += 'When prompted, tap "Allow" to grant camera access.';
        } else {
          interactionGuidance += 'Please allow camera access when prompted by your browser.';
        }
        
        toast({
          title: "Camera Permission Required",
          description: interactionGuidance,
          variant: "default",
        });
        
        // Small delay to let user see the message
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Enhanced mobile-optimized camera constraints with more fallbacks
      const getVideoConstraints = () => {
        if (isMobile) {
          const constraints = [
            // Primary: High quality for mobile with rear camera
            {
              facingMode: 'environment',
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 }
            },
            // Fallback 1: Medium quality with rear camera
            {
              facingMode: 'environment',
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 15, max: 30 }
            },
            // Fallback 2: Basic quality with rear camera
            {
              facingMode: 'environment',
              width: { ideal: 320, max: 640 },
              height: { ideal: 240, max: 480 }
            },
            // Fallback 3: Any rear camera
            {
              facingMode: { ideal: 'environment' }
            },
            // Fallback 4: Front camera if rear not available
            {
              facingMode: 'user',
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 }
            },
            // Fallback 5: Any front camera
            {
              facingMode: { ideal: 'user' }
            },
            // Final fallback: Any camera with basic constraints
            {
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            // Ultimate fallback: Any camera
            true
          ];
          
          // iOS Safari specific adjustments
          if (isIOS && isSafari) {
            // iOS Safari has issues with high frame rates
            constraints.forEach(constraint => {
              if (typeof constraint === 'object' && constraint.frameRate) {
                constraint.frameRate = { ideal: 15, max: 30 };
              }
            });
          }
          
          return constraints;
        } else {
          // Desktop constraints with more fallbacks
          return [
            {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            {
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            true
          ];
        }
      };

      let stream = null;
      const constraints = getVideoConstraints();
      let lastError = null;
      
      // Try each constraint set until one works
      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(`🎥 Trying camera constraint set ${i + 1}/${constraints.length}...`);
          addDebugLog(`🎥 Trying camera constraint set ${i + 1}/${constraints.length}...`);
          
          // Add a small delay between attempts to help with mobile browsers
          if (i > 0 && isMobile) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          stream = await navigator.mediaDevices.getUserMedia({
            video: constraints[i],
            audio: false // Explicitly disable audio to avoid additional permissions
          });
          
          console.log(`✅ Camera stream obtained with constraint set ${i + 1}`);
          addDebugLog(`✅ Camera stream obtained with constraint set ${i + 1}`);
          
          // Log stream details for debugging
          const tracks = stream.getVideoTracks();
          if (tracks.length > 0) {
            const settings = tracks[0].getSettings();
            console.log('📹 Camera settings:', settings);
            addDebugLog(`📹 Camera: ${settings.width}x${settings.height}, facing: ${settings.facingMode || 'unknown'}`);
          }
          
          break;
        } catch (constraintError) {
          lastError = constraintError;
          console.log(`❌ Constraint set ${i + 1} failed:`, constraintError.message);
          addDebugLog(`❌ Constraint set ${i + 1} failed: ${constraintError.message}`);
          
          // Don't throw immediately, try next constraint
          if (i === constraints.length - 1) {
            throw constraintError; // Re-throw the last error
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to obtain camera stream with any constraints');
      }
      
      console.log('✅ Camera stream obtained:', stream);
      addDebugLog('✅ Camera stream obtained');
      
      // Double-check video ref before using it
      if (!videoRef.current) {
        // Clean up stream if video element is gone
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Video element reference lost');
      }

      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      streamRef.current = stream;
      
      console.log('✅ Video element configured');
      addDebugLog('✅ Video element configured');
      
      // Enhanced video loading with better mobile support
      const setupVideoHandlers = () => {
        videoElement.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded, starting detection');
          addDebugLog('✅ Video metadata loaded, starting detection');
          setCameraActive(true);
          cameraActiveRef.current = true;
          setIsScanning(true);
          
          // Progressive readiness check with longer delays for mobile
          const checkVideoReady = (attempt = 1) => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              console.log(`✅ Video ready after ${attempt} attempts`);
              addDebugLog(`✅ Video ready after ${attempt} attempts`);
              detectQRCode();
            } else if (attempt < 5) {
              const delay = isMobile ? 500 * attempt : 200 * attempt;
              setTimeout(() => checkVideoReady(attempt + 1), delay);
            } else {
              console.error('❌ Video failed to become ready after 5 attempts');
              addDebugLog('❌ Video failed to become ready after 5 attempts');
            }
          };
          
          // Initial delay before checking readiness
          setTimeout(() => checkVideoReady(), isMobile ? 300 : 100);
        };

        videoElement.onerror = (error) => {
          console.error('Video element error:', error);
          addDebugLog('❌ Video element error occurred');
        };
        
        videoElement.onabort = () => {
          console.log('Video loading aborted');
          addDebugLog('⚠️ Video loading aborted');
        };
        
        videoElement.onstalled = () => {
          console.log('Video loading stalled');
          addDebugLog('⚠️ Video loading stalled');
        };
      };
      
      setupVideoHandlers();
      
      // Force video to start playing (important for mobile)
      try {
        await videoElement.play();
        console.log('✅ Video playback started');
        addDebugLog('✅ Video playback started');
      } catch (playError) {
        console.log('⚠️ Video autoplay failed (this is normal):', playError.message);
        addDebugLog('⚠️ Video autoplay failed (normal behavior)');
      }
      
    } catch (error) {
      console.error('Camera access error:', error);
      addDebugLog('❌ Camera access failed');
      
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);
      const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
      
      let errorMessage = 'Unable to access camera. ';
      let mobileGuidance = '';
      
      if (error instanceof Error) {
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        addDebugLog(`Error details: ${error.name} - ${error.message}`);
        
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Camera permission was denied. ';
          if (isMobile) {
            if (isIOS) {
              mobileGuidance = 'On iOS: 1) Go to Settings > Safari > Camera and enable access, 2) Or tap the "aA" icon in Safari\'s address bar and select "Allow Camera", 3) Refresh this page and try again.';
            } else if (isAndroid) {
              mobileGuidance = 'On Android: 1) Tap the camera icon in your browser\'s address bar, 2) Select "Allow" for camera access, 3) Refresh the page and try again. If that doesn\'t work, check your browser\'s site settings.';
            } else {
              mobileGuidance = 'On mobile: Check your browser settings to allow camera access for this site, then refresh the page and try again.';
            }
          } else {
            mobileGuidance = 'Please click "Allow" when prompted for camera access and try again.';
          }
          
          // Set flag to require user interaction
          setUserInteractionRequired(true);
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device. ';
          if (isMobile) {
            mobileGuidance = 'Make sure your device has a camera and no other apps are using it. Try closing other camera apps and refreshing this page.';
          }
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported in this browser. ';
          if (isMobile) {
            if (!isSecureContext) {
              mobileGuidance = 'Camera access requires HTTPS on mobile devices. Please use HTTPS or try a different browser like Chrome or Safari.';
            } else if (isIOS) {
              mobileGuidance = 'Please use Safari 11+ or Chrome 69+ on iOS devices.';
            } else if (isAndroid) {
              mobileGuidance = 'Please use Chrome 53+, Firefox 36+, or Samsung Internet on Android devices.';
            } else {
              mobileGuidance = 'Try using Chrome, Safari, or Firefox on your mobile device.';
            }
          } else {
            mobileGuidance = 'Try using a modern browser like Chrome, Firefox, or Safari.';
          }
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Camera is already in use by another application. ';
          if (isMobile) {
            mobileGuidance = 'Close other camera apps and try again. You may need to restart your browser or device.';
          } else {
            mobileGuidance = 'Close other applications using the camera and try again.';
          }
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'Camera constraints cannot be satisfied. ';
          if (isMobile) {
            mobileGuidance = 'Your device camera may not support the required settings. This should be automatically handled - please try again or restart your browser.';
          }
        } else if (error.name === 'SecurityError') {
          errorMessage += 'Security error accessing camera. ';
          if (isMobile && !isSecureContext) {
            mobileGuidance = 'Camera access requires HTTPS on mobile devices. Please access this page via HTTPS.';
          } else {
            mobileGuidance = 'Please check your browser security settings and try again.';
          }
        } else if (error.name === 'AbortError') {
          errorMessage += 'Camera access was aborted. ';
          mobileGuidance = 'Please try again. If the problem persists, restart your browser.';
        } else {
          errorMessage += `Unexpected error: ${error.message}. `;
          if (isMobile) {
            mobileGuidance = 'Try refreshing the page, restarting your browser, or using a different browser like Chrome or Safari.';
          } else {
            mobileGuidance = 'Please try refreshing the page or using a different browser.';
          }
        }
      } else {
        errorMessage += 'Unknown error occurred. ';
        mobileGuidance = 'Please try refreshing the page or using a different browser.';
      }

      // Add network-specific guidance for host network issues
      if (isMobile && location.hostname !== 'localhost' && !location.hostname.endsWith('.local')) {
        mobileGuidance += '\n\nFor host network access: Ensure you\'re using HTTPS and the correct local IP address. Some mobile browsers may block camera access over local networks.';
      }

      toast({
        title: "Camera Access Failed",
        description: errorMessage + mobileGuidance,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    console.log('🛑 Stopping camera...');
    addDebugLog('🛑 Stopping camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    cameraActiveRef.current = false;
    setIsScanning(false);
    setUserInteractionRequired(false);
    
    console.log('✅ Camera stopped successfully');
    addDebugLog('✅ Camera stopped successfully');
  };

  const detectQRCode = () => {
    if (!cameraActiveRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      setTimeout(detectQRCode, 100);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      console.log('QR Code detected:', code.data);
      addDebugLog(`QR Code detected: ${code.data}`);
      handleQRCodeDetected(code.data);
    } else {
      setTimeout(detectQRCode, 100);
    }
  };

  const handleQRCodeDetected = async (qrData: string) => {
    console.log('Processing QR code:', qrData);
    addDebugLog(`Processing QR code: ${qrData}`);
    
    setQrCode(qrData);
    
    // Determine action based on QR code format or user selection
    // For now, default to check_in
    await handleScan(qrData, 'check_in');
  };

  const handleScan = async (qrData: string, action: 'check_in' | 'check_out') => {
    try {
      console.log(`Attempting ${action} with QR:`, qrData);
      addDebugLog(`Attempting ${action} with QR: ${qrData}`);
      
      const result = await scanQRCode(qrData, action);
      
      console.log('Scan result:', result);
      addDebugLog(`Scan result: ${result.success ? 'Success' : 'Failed'}`);
      
      setScanResult(result);
      
      if (result.success) {
        fetchRecentScans(); // Refresh recent scans
        toast({
          title: "Success",
          description: result.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Scan Failed",
          description: result.error || result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      addDebugLog(`Scan error: ${error}`);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setScanResult({
        success: false,
        message: 'Scan failed',
        error: errorMessage
      });
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleManualScan = (action: 'check_in' | 'check_out') => {
    if (!qrCode.trim()) return;
    handleScan(qrCode, action);
  };

  const simulateQRScan = () => {
    const demoQRCodes = [
      'VMS-550e8400-e29b-41d4-a716-446655440100-1737550800000',
      'VMS-550e8400-e29b-41d4-a716-446655440102-1737551400000',
      'INVALID-QR-CODE',
      'VMS-expired-visit-123'
    ];
    const randomQR = demoQRCodes[Math.floor(Math.random() * demoQRCodes.length)];
    setQrCode(randomQR);
    addDebugLog(`Generated demo QR: ${randomQR}`);
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <QrCode className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Code Scanner</h1>
          <p className="text-gray-600">Position the QR code within the camera frame</p>
        </div>

        {/* User Interaction Required Notice */}
        {userInteractionRequired && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-sm font-medium text-yellow-800">Camera Permission Required</h3>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Camera access was denied. Please grant permission and try again.
            </p>
            <Button 
              onClick={startCamera}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              disabled={isScanning}
            >
              <Camera className="mr-2 h-4 w-4" />
              Request Camera Access
            </Button>
          </div>
        )}

        {/* Camera View */}
        <div className="relative mb-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg">
                <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-indigo-500"></div>
                <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-indigo-500"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-indigo-500"></div>
                <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-indigo-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                    Scanning for QR codes...
                  </div>
                </div>
              </div>
            )}
            
            {/* Camera not active overlay */}
            {!cameraActive && !userInteractionRequired && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-600 text-sm">Camera not active</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {!cameraActive && !userInteractionRequired ? (
            <Button 
              onClick={startCamera} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isScanning}
            >
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </Button>
          ) : cameraActive ? (
            <Button 
              onClick={stopCamera} 
              variant="outline" 
              className="w-full"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop Camera
            </Button>
          ) : null}
          
          <Button 
            onClick={() => navigate('/security')} 
            variant="ghost" 
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Security
          </Button>
        </div>

        {/* Debug Information */}
        {showDebug && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Debug Information</h3>
              <Button
                onClick={() => setShowDebug(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 text-xs text-gray-600 max-h-40 overflow-y-auto">
              {debugLogs.map((log, index) => (
                <div key={index} className="font-mono">{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Toggle */}
        <div className="mt-4 text-center">
          <Button
            onClick={() => setShowDebug(!showDebug)}
            variant="ghost"
            size="sm"
            className="text-gray-500"
          >
            {showDebug ? 'Hide' : 'Show'} Debug Info
          </Button>
        </div>
      </div>
      
      {/* Hidden canvas for QR detection */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}