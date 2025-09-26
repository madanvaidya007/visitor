import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CameraOff, 
  RotateCcw, 
  Check, 
  X, 
  User, 
  Scan,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { FaceRecognitionService } from '@/services/faceRecognition';
import { FaceDatabaseService } from '@/services/faceDatabase';

interface PhotoCaptureProps {
  onPhotoCapture: (photoData: string, faceData?: any) => void;
  onCancel: () => void;
  visitorName?: string;
  visitorEmail?: string;
  className?: string;
}

interface FaceDetectionResult {
  confidence: number;
  landmarks: any;
  descriptor: Float32Array;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function PhotoCapture({ 
  onPhotoCapture, 
  onCancel, 
  visitorName, 
  visitorEmail,
  className 
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceData, setFaceData] = useState<FaceDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      console.log('📷 Starting camera for photo capture...');
      setError(null);
      
      // Check HTTPS requirement for mobile devices
      const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile && !isSecureContext) {
        console.error('❌ HTTPS required for camera access on mobile devices');
        setCameraPermission('denied');
        setError('Camera access requires HTTPS on mobile devices. Please access this page via HTTPS.');
        return;
      }

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ Camera API not supported');
        setCameraPermission('denied');
        setError('Camera not supported in this browser.');
        return;
      }

      // Mobile-optimized camera constraints with fallbacks
      const getVideoConstraints = () => {
        if (isMobile) {
          return [
            // Primary: High quality for mobile front camera
            {
              facingMode: 'user',
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 },
              frameRate: { ideal: 30, max: 60 }
            },
            // Fallback 1: Medium quality
            {
              facingMode: 'user',
              width: { ideal: 480, max: 640 },
              height: { ideal: 360, max: 480 },
              frameRate: { ideal: 15, max: 30 }
            },
            // Fallback 2: Basic quality
            {
              facingMode: 'user',
              width: { ideal: 320, max: 480 },
              height: { ideal: 240, max: 360 }
            },
            // Fallback 3: Any available front camera
            {
              facingMode: { ideal: 'user' }
            },
            // Final fallback: Any camera
            true
          ];
        } else {
          // Desktop constraints
          return [{
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }];
        }
      };

      let stream = null;
      const constraints = getVideoConstraints();
      
      // Try each constraint set until one works
      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(`📷 Trying camera constraint set ${i + 1}/${constraints.length}...`);
          
          stream = await navigator.mediaDevices.getUserMedia({
            video: constraints[i]
          });
          
          console.log(`✅ Camera stream obtained with constraint set ${i + 1}`);
          break;
        } catch (constraintError) {
          console.log(`❌ Constraint set ${i + 1} failed:`, constraintError.message);
          
          if (i === constraints.length - 1) {
            throw constraintError; // Re-throw the last error
          }
        }
      }

      if (!stream) {
        throw new Error('Failed to obtain camera stream with any constraints');
      }
      
      streamRef.current = stream;
      setCameraPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        console.log('✅ Camera stream started successfully');
        
        // Start face detection
        startFaceDetection();
      }
    } catch (err: any) {
      console.error('❌ Camera access failed:', err);
      setCameraPermission('denied');
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
      
      let errorMessage = 'Camera access failed. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += isMobile 
          ? 'On mobile: Tap the camera icon in your browser\'s address bar and select "Allow".' 
          : 'Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += isMobile && !isSecureContext
          ? 'Camera requires HTTPS on mobile devices.'
          : 'Camera not supported in this browser.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += err.message || 'Unknown camera error.';
      }
      
      setError(errorMessage);
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setFaceDetected(false);
    setFaceData(null);
    console.log('📷 Camera stream stopped');
  }, []);

  // Face detection loop
  const startFaceDetection = useCallback(async () => {
    if (!videoRef.current || !isStreaming) return;

    const detectFaces = async () => {
      try {
        if (videoRef.current && videoRef.current.readyState === 4) {
          const detections = await FaceRecognitionService.detectFaces(videoRef.current);
          
          if (detections && detections.length > 0) {
            const detection = detections[0];
            setFaceDetected(true);
            setFaceData({
              confidence: detection.score || 0.8,
              landmarks: detection.landmarks,
              descriptor: detection.descriptor,
              boundingBox: {
                x: detection.box?.x || 0,
                y: detection.box?.y || 0,
                width: detection.box?.width || 100,
                height: detection.box?.height || 100
              }
            });
            console.log('👤 Face detected with confidence:', detection.score);
          } else {
            setFaceDetected(false);
            setFaceData(null);
          }
        }
      } catch (err) {
        console.warn('Face detection error:', err);
      }
      
      // Continue detection loop
      if (isStreaming && !capturedPhoto) {
        setTimeout(detectFaces, 100);
      }
    };

    detectFaces();
  }, [isStreaming, capturedPhoto]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    console.log('📸 Capturing photo...');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Canvas context not available');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoData);

      // Process face data if available
      if (faceData && visitorName) {
        console.log('🔍 Processing face data for visitor:', visitorName);
        
        // Add face to recognition database
        await FaceRecognitionService.addPersonToDatabase(
          visitorName,
          faceData.descriptor,
          {
            email: visitorEmail,
            photoUrl: photoData,
            confidence: faceData.confidence
          }
        );

        // Update face database statistics
        await FaceDatabaseService.createProfile({
          person_id: `visitor_${Date.now()}`,
          person_name: visitorName || 'Unknown Visitor',
          face_encoding: JSON.stringify(Array.from(faceData.descriptor)),
          confidence_threshold: faceData.confidence,
          is_active: true,
          metadata: {
            source: 'manual_upload',
            quality_score: faceData.confidence,
            image_url: photoData,
            notes: `Email: ${visitorEmail || 'Not provided'}`
          }
        });

        console.log('✅ Face data processed and stored successfully');
      }

      stopCamera();
      console.log('📸 Photo captured successfully');
    } catch (err: any) {
      console.error('❌ Photo capture failed:', err);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [faceData, visitorName, visitorEmail, stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    setFaceData(null);
    setFaceDetected(false);
    startCamera();
  }, [startCamera]);

  // Confirm photo
  const confirmPhoto = useCallback(() => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto, faceData);
    }
  }, [capturedPhoto, faceData, onPhotoCapture]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photo Capture
        </CardTitle>
        <CardDescription>
          Capture a photo for visitor identification and face recognition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {cameraPermission === 'denied' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Camera access is required for photo capture. Please enable camera permissions in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {/* Camera View */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
          {!capturedPhoto ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              
              {/* Face detection overlay */}
              {faceDetected && faceData && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute border-2 border-green-400 rounded face-detection-box"
                    style={{
                      '--face-left': `${(faceData.boundingBox.x / 640) * 100}%`,
                      '--face-top': `${(faceData.boundingBox.y / 480) * 100}%`,
                      '--face-width': `${(faceData.boundingBox.width / 640) * 100}%`,
                      '--face-height': `${(faceData.boundingBox.height / 480) * 100}%`,
                      left: 'var(--face-left)',
                      top: 'var(--face-top)',
                      width: 'var(--face-width)',
                      height: 'var(--face-height)',
                    } as React.CSSProperties}
                  />
                  <Badge 
                    className="absolute top-2 left-2 bg-green-500"
                    variant="secondary"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Face Detected ({Math.round(faceData.confidence * 100)}%)
                  </Badge>
                </div>
              )}

              {/* Status indicators */}
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                {isStreaming && (
                  <Badge variant="outline" className="bg-white/90">
                    <Camera className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
                
                {!faceDetected && isStreaming && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    <Scan className="h-3 w-3 mr-1" />
                    Looking for face...
                  </Badge>
                )}
              </div>
            </>
          ) : (
            <img
              src={capturedPhoto}
              alt="Captured photo"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="flex gap-2">
          {!capturedPhoto ? (
            <>
              <Button
                onClick={capturePhoto}
                disabled={!isStreaming || isProcessing}
                className="flex-1"
                size="lg"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {isProcessing ? 'Processing...' : 'Capture Photo'}
              </Button>
              
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={confirmPhoto}
                className="flex-1"
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                Use This Photo
              </Button>
              
              <Button
                variant="outline"
                onClick={retakePhoto}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
            </>
          )}
        </div>

        {/* Face Recognition Status */}
        {faceData && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Face Recognition Ready</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Face detected with {Math.round(faceData.confidence * 100)}% confidence. 
              This photo will be used for future visitor identification.
            </p>
          </div>
        )}

        {visitorName && (
          <div className="text-sm text-muted-foreground">
            <User className="h-4 w-4 inline mr-1" />
            Capturing photo for: <span className="font-medium">{visitorName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}