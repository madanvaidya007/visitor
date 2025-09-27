import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Users, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Zap,
  RefreshCw,
  Monitor,
  Grid3X3,
  Maximize,
  Volume2,
  VolumeX
} from 'lucide-react';
import { toast } from 'sonner';
import { faceRecognitionService } from '@/services/faceRecognition';
import { FaceMatch, CameraConfig } from '@/types/faceRecognitionTypes';
import '../../styles/progress-bars.css';

interface CameraStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  faceCount: number;
}

interface DetectedFace {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  personId?: string;
  personName?: string;
  isRecognized: boolean;
}

interface LiveCameraFeedProps {
  cameras: CameraStatus[];
  isSystemActive: boolean;
}

interface CameraFeedState {
  isStreaming: boolean;
  detectedFaces: DetectedFace[];
  error: string | null;
  frameRate: number;
  processingTime: number;
}

export const LiveCameraFeed: React.FC<LiveCameraFeedProps> = ({ 
  cameras, 
  isSystemActive 
}) => {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [cameraStates, setCameraStates] = useState<Record<string, CameraFeedState>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement>>({});
  const streamRefs = useRef<Record<string, MediaStream>>({});

  useEffect(() => {
    if (isSystemActive && cameras.length > 0) {
      initializeCameraFeeds();
    } else {
      stopAllFeeds();
    }

    return () => {
      stopAllFeeds();
    };
  }, [isSystemActive, cameras]);

  useEffect(() => {
    if (selectedCamera && !cameras.find(c => c.id === selectedCamera)) {
      setSelectedCamera(cameras[0]?.id || null);
    }
  }, [cameras, selectedCamera]);

  const initializeCameraFeeds = async () => {
    for (const camera of cameras) {
      try {
        await startCameraFeed(camera.id);
      } catch (error) {
        console.error(`Failed to start feed for camera ${camera.id}:`, error);
        updateCameraState(camera.id, {
          isStreaming: false,
          error: 'Failed to start camera feed',
          detectedFaces: [],
          frameRate: 0,
          processingTime: 0
        });
      }
    }
  };

  const startCameraFeed = async (cameraId: string) => {
    try {
      // Initialize camera state
      updateCameraState(cameraId, {
        isStreaming: true,
        error: null,
        detectedFaces: [],
        frameRate: 0,
        processingTime: 0
      });

      // Start CCTV stream
      await CCTVIntegrationService.startStream(cameraId);
      
      // Set up face detection processing
      const processFrame = async () => {
        const video = videoRefs.current[cameraId];
        const canvas = canvasRefs.current[cameraId];
        
        if (!video || !canvas || !cameraStates[cameraId]?.isStreaming) {
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const startTime = performance.now();

        try {
          // Draw video frame to canvas
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          // Get image data for face detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Perform face detection
          const detections = await FaceRecognitionService.detectFaces(imageData);
          
          // Process detections for recognition
          const recognizedFaces: DetectedFace[] = [];
          
          for (const detection of detections) {
            const faceImage = extractFaceImage(ctx, detection.boundingBox);
            let personId: string | undefined;
            let personName: string | undefined;
            let isRecognized = false;

            try {
              const recognition = await FaceRecognitionService.recognizeFace(faceImage);
              if (recognition && recognition.confidence > 0.6) {
                personId = recognition.personId;
                personName = recognition.personName;
                isRecognized = true;

                // Log recognition event
                await CCTVIntegrationService.logEvent({
                  cameraId,
                  personId,
                  personName,
                  confidence: recognition.confidence,
                  boundingBox: detection.boundingBox,
                  eventType: 'person_recognized'
                });
              }
            } catch (error) {
              console.error('Face recognition error:', error);
            }

            recognizedFaces.push({
              id: `${cameraId}-${Date.now()}-${Math.random()}`,
              boundingBox: detection.boundingBox,
              confidence: detection.confidence,
              personId,
              personName,
              isRecognized
            });
          }

          // Draw bounding boxes and labels
          drawFaceOverlays(ctx, recognizedFaces);

          const processingTime = performance.now() - startTime;
          
          // Update camera state
          updateCameraState(cameraId, {
            isStreaming: true,
            error: null,
            detectedFaces: recognizedFaces,
            frameRate: Math.round(1000 / processingTime),
            processingTime: Math.round(processingTime)
          });

        } catch (error) {
          console.error('Frame processing error:', error);
        }

        // Schedule next frame processing
        if (cameraStates[cameraId]?.isStreaming) {
          requestAnimationFrame(processFrame);
        }
      };

      // Start processing frames
      requestAnimationFrame(processFrame);

    } catch (error) {
      console.error(`Failed to start camera feed ${cameraId}:`, error);
      updateCameraState(cameraId, {
        isStreaming: false,
        error: 'Failed to initialize camera feed',
        detectedFaces: [],
        frameRate: 0,
        processingTime: 0
      });
    }
  };

  const stopCameraFeed = async (cameraId: string) => {
    try {
      updateCameraState(cameraId, {
        isStreaming: false,
        error: null,
        detectedFaces: [],
        frameRate: 0,
        processingTime: 0
      });

      await CCTVIntegrationService.stopStream(cameraId);
      
      if (streamRefs.current[cameraId]) {
        streamRefs.current[cameraId].getTracks().forEach(track => track.stop());
        delete streamRefs.current[cameraId];
      }
    } catch (error) {
      console.error(`Failed to stop camera feed ${cameraId}:`, error);
    }
  };

  const stopAllFeeds = async () => {
    for (const cameraId of Object.keys(cameraStates)) {
      await stopCameraFeed(cameraId);
    }
  };

  const updateCameraState = (cameraId: string, state: Partial<CameraFeedState>) => {
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        ...state
      }
    }));
  };

  const extractFaceImage = (ctx: CanvasRenderingContext2D, boundingBox: any): ImageData => {
    return ctx.getImageData(
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height
    );
  };

  const drawFaceOverlays = (ctx: CanvasRenderingContext2D, faces: DetectedFace[]) => {
    faces.forEach(face => {
      const { boundingBox, confidence, personName, isRecognized } = face;
      
      // Draw bounding box
      ctx.strokeStyle = isRecognized ? '#10B981' : '#F59E0B';
      ctx.lineWidth = 2;
      ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
      
      // Draw label background
      const label = personName || `Unknown (${(confidence * 100).toFixed(1)}%)`;
      const labelHeight = 20;
      
      ctx.fillStyle = isRecognized ? '#10B981' : '#F59E0B';
      ctx.fillRect(
        boundingBox.x,
        boundingBox.y - labelHeight,
        Math.max(boundingBox.width, ctx.measureText(label).width + 10),
        labelHeight
      );
      
      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(label, boundingBox.x + 5, boundingBox.y - 5);
    });
  };

  const toggleCameraFeed = async (cameraId: string) => {
    const state = cameraStates[cameraId];
    if (state?.isStreaming) {
      await stopCameraFeed(cameraId);
    } else {
      await startCameraFeed(cameraId);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isSystemActive) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Face recognition system is not active. Please start the system to view live camera feeds.
        </AlertDescription>
      </Alert>
    );
  }

  if (cameras.length === 0) {
    return (
      <Alert>
        <Camera className="h-4 w-4" />
        <AlertDescription>
          No cameras are currently online. Please check your camera connections.
        </AlertDescription>
      </Alert>
    );
  }

  const mainCamera = selectedCamera || cameras[0]?.id;
  const mainCameraState = cameraStates[mainCamera];

  return (
    <div className="space-y-6">
      {/* Camera Selection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Live Camera Feeds</h3>
          <div className="flex space-x-2">
            {cameras.map(camera => (
              <Button
                key={camera.id}
                variant={selectedCamera === camera.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCamera(camera.id)}
                className="flex items-center space-x-2"
              >
                <Camera className="h-4 w-4" />
                <span>{camera.name}</span>
                {cameraStates[camera.id]?.detectedFaces.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {cameraStates[camera.id].detectedFaces.length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Camera Feed */}
      <Card className={isFullscreen ? "fixed inset-0 z-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>{cameras.find(c => c.id === mainCamera)?.name}</span>
            </CardTitle>
            {mainCameraState && (
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{mainCameraState.detectedFaces.length} faces</span>
                </span>
                <span>{mainCameraState.frameRate} FPS</span>
                <span>{mainCameraState.processingTime}ms</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant={mainCameraState?.isStreaming ? "default" : "destructive"}
            >
              {mainCameraState?.isStreaming ? "Live" : "Offline"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleCameraFeed(mainCamera)}
            >
              {mainCameraState?.isStreaming ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {mainCameraState?.error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{mainCameraState.error}</AlertDescription>
            </Alert>
          ) : (
            <div className="relative">
              <video
                ref={el => {
                  if (el) videoRefs.current[mainCamera] = el;
                }}
                className="w-full h-auto rounded-lg"
                autoPlay
                muted
                playsInline
              />
              <canvas
                ref={el => {
                  if (el) canvasRefs.current[mainCamera] = el;
                }}
                className="absolute inset-0 w-full h-full no-pointer-events"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Face Detection Summary */}
      {mainCameraState?.detectedFaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Detected Faces</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mainCameraState.detectedFaces.map(face => (
                <div key={face.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">
                      {face.personName || 'Unknown Person'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Confidence: {(face.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Badge 
                    variant={face.isRecognized ? "default" : "secondary"}
                  >
                    {face.isRecognized ? "Recognized" : "Unknown"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};