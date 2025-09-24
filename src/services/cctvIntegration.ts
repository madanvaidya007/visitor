import { FaceRecognitionService, RecognizedFace, FaceTrack } from './faceRecognition';

export interface CCTVCamera {
  id: string;
  name: string;
  location: string;
  streamUrl: string;
  isActive: boolean;
  resolution: { width: number; height: number };
  fps: number;
}

export interface CCTVEvent {
  id: string;
  cameraId: string;
  timestamp: number;
  eventType: 'face_detected' | 'person_recognized' | 'person_entered' | 'person_left';
  personId?: string;
  personName?: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  frameData?: string; // Base64 encoded frame
}

export interface StreamProcessor {
  cameraId: string;
  videoElement: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  isProcessing: boolean;
  lastProcessTime: number;
  frameRate: number;
}

export class CCTVIntegrationService {
  private faceRecognition: FaceRecognitionService;
  private processors: Map<string, StreamProcessor> = new Map();
  private eventListeners: ((event: CCTVEvent) => void)[] = [];
  private processingInterval = 200; // Process every 200ms (5 FPS)

  constructor(faceRecognitionService: FaceRecognitionService) {
    this.faceRecognition = faceRecognitionService;
  }

  stopCamera(cameraId: string): void {
    return this.stopProcessing(cameraId);
  }

  async initializeCamera(camera: CCTVCamera): Promise<void> {
    try {
      // Create video element for the stream
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = camera.resolution.width;
      canvas.height = camera.resolution.height;

      const processor: StreamProcessor = {
        cameraId: camera.id,
        videoElement: video,
        canvas,
        context,
        isProcessing: false,
        lastProcessTime: 0,
        frameRate: camera.fps
      };

      // Set up video stream
      if (camera.streamUrl.startsWith('rtsp://') || camera.streamUrl.startsWith('rtmp://')) {
        // For RTSP/RTMP streams, you might need a media server like WebRTC or HLS
        // This is a simplified example - in production, you'd use a proper streaming solution
        console.warn('RTSP/RTMP streams require additional setup with media servers');
        video.src = camera.streamUrl;
      } else if (camera.streamUrl === 'webcam') {
        // Use webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: camera.resolution.width,
            height: camera.resolution.height,
            frameRate: camera.fps
          }
        });
        video.srcObject = stream;
      } else {
        // HTTP stream or file
        video.src = camera.streamUrl;
      }

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve(void 0);
        video.onerror = reject;
        setTimeout(reject, 10000); // 10 second timeout
      });

      this.processors.set(camera.id, processor);
      this.startProcessing(camera.id);

      console.log(`Camera ${camera.name} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize camera ${camera.name}:`, error);
      throw error;
    }
  }

  private startProcessing(cameraId: string): void {
    const processor = this.processors.get(cameraId);
    if (!processor) return;

    processor.isProcessing = true;

    const processFrame = async () => {
      if (!processor.isProcessing) return;

      const currentTime = Date.now();
      if (currentTime - processor.lastProcessTime < this.processingInterval) {
        requestAnimationFrame(processFrame);
        return;
      }

      processor.lastProcessTime = currentTime;

      try {
        // Draw current video frame to canvas
        processor.context.drawImage(
          processor.videoElement,
          0, 0,
          processor.canvas.width,
          processor.canvas.height
        );

        // Detect faces in the frame
        const detections = await this.faceRecognition.detectFaces(processor.canvas);
        
        if (detections.length > 0) {
          // Recognize faces
          const recognizedFaces = await this.faceRecognition.recognizeFaces(detections);
          
          // Update tracking
          const tracks = this.faceRecognition.updateTracks(recognizedFaces);
          
          // Generate events
          await this.processDetections(cameraId, recognizedFaces, tracks);
        }
      } catch (error) {
        console.error(`Error processing frame for camera ${cameraId}:`, error);
      }

      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  }

  private async processDetections(
    cameraId: string,
    faces: RecognizedFace[],
    tracks: FaceTrack[]
  ): Promise<void> {
    const currentTime = Date.now();

    for (const face of faces) {
      // Face detected event
      const detectionEvent: CCTVEvent = {
        id: `event_${currentTime}_${Math.random().toString(36).substr(2, 9)}`,
        cameraId,
        timestamp: currentTime,
        eventType: 'face_detected',
        confidence: face.confidence,
        boundingBox: face.box
      };

      this.emitEvent(detectionEvent);

      // Person recognized event
      if (face.personId && face.matchConfidence && face.matchConfidence > 0.7) {
        const recognitionEvent: CCTVEvent = {
          id: `event_${currentTime}_${Math.random().toString(36).substr(2, 9)}`,
          cameraId,
          timestamp: currentTime,
          eventType: 'person_recognized',
          personId: face.personId,
          personName: face.personName,
          confidence: face.matchConfidence,
          boundingBox: face.box
        };

        this.emitEvent(recognitionEvent);
      }
    }

    // Track-based events (person entered/left)
    for (const track of tracks) {
      if (track.detections.length === this.faceRecognition.getConfig().minDetectionsForTrack) {
        // Person entered
        const enteredEvent: CCTVEvent = {
          id: `event_${currentTime}_${Math.random().toString(36).substr(2, 9)}`,
          cameraId,
          timestamp: track.firstSeen,
          eventType: 'person_entered',
          personId: track.personId,
          personName: track.personName,
          confidence: 0.9,
          boundingBox: track.detections[0].box
        };

        this.emitEvent(enteredEvent);
      }
    }
  }

  stopProcessing(cameraId: string): void {
    const processor = this.processors.get(cameraId);
    if (processor) {
      processor.isProcessing = false;
      
      // Stop video stream
      if (processor.videoElement.srcObject) {
        const stream = processor.videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      this.processors.delete(cameraId);
    }
  }

  getProcessor(cameraId: string): StreamProcessor | undefined {
    return this.processors.get(cameraId);
  }

  getAllProcessors(): StreamProcessor[] {
    return Array.from(this.processors.values());
  }

  addEventListener(listener: (event: CCTVEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: CCTVEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(event: CCTVEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  setProcessingInterval(intervalMs: number): void {
    this.processingInterval = Math.max(100, intervalMs); // Minimum 100ms
  }

  getProcessingInterval(): number {
    return this.processingInterval;
  }

  async captureFrame(cameraId: string): Promise<string | null> {
    const processor = this.processors.get(cameraId);
    if (!processor) return null;

    try {
      processor.context.drawImage(
        processor.videoElement,
        0, 0,
        processor.canvas.width,
        processor.canvas.height
      );

      return processor.canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error(`Failed to capture frame from camera ${cameraId}:`, error);
      return null;
    }
  }

  getStreamStats(cameraId: string): {
    isActive: boolean;
    fps: number;
    resolution: { width: number; height: number };
    lastProcessTime: number;
  } | null {
    const processor = this.processors.get(cameraId);
    if (!processor) return null;

    return {
      isActive: processor.isProcessing,
      fps: processor.frameRate,
      resolution: {
        width: processor.canvas.width,
        height: processor.canvas.height
      },
      lastProcessTime: processor.lastProcessTime
    };
  }
  // Static methods for easy access
  static async getCameras(): Promise<CCTVCamera[]> {
    console.log('CCTVIntegrationService.getCameras() called');
    return cctvIntegrationService.getCameras();
  }

  static async initialize(): Promise<void> {
    console.log('CCTVIntegrationService.initialize() called');
    return cctvIntegrationService.initialize();
  }

  static async getCameraStatus(cameraId: string): Promise<{
    id: string;
    isActive: boolean;
    isStreaming: boolean;
    lastUpdate: number;
    error?: string;
  }> {
    console.log('CCTVIntegrationService.getCameraStatus() called');
    return cctvIntegrationService.getCameraStatus(cameraId);
  }

  static async startAllStreams(): Promise<void> {
    console.log('CCTVIntegrationService.startAllStreams() called');
    return cctvIntegrationService.startAllStreams();
  }

  static async stopAllStreams(): Promise<void> {
    console.log('CCTVIntegrationService.stopAllStreams() called');
    return cctvIntegrationService.stopAllStreams();
  }

  static async initializeCamera(camera: CCTVCamera): Promise<void> {
    return cctvIntegrationService.initializeCamera(camera);
  }

  static stopCamera(cameraId: string): void {
    return cctvIntegrationService.stopCamera(cameraId);
  }

  static addEventListener(listener: (event: CCTVEvent) => void): void {
    return cctvIntegrationService.addEventListener(listener);
  }

  static removeEventListener(listener: (event: CCTVEvent) => void): void {
    return cctvIntegrationService.removeEventListener(listener);
  }

  static captureFrame(cameraId: string): string | null {
    return cctvIntegrationService.captureFrame(cameraId);
  }

  static getStreamStats(cameraId: string): {
    isActive: boolean;
    fps: number;
    resolution: { width: number; height: number };
    lastProcessTime: number;
  } | null {
    return cctvIntegrationService.getStreamStats(cameraId);
  }

  // Instance methods
  async getCameras(): Promise<CCTVCamera[]> {
    console.log('Getting available CCTV cameras...');
    
    // TODO: Implement actual CCTV camera integration
    // This would typically connect to your CCTV system's API
    // For now, return empty array until integration is implemented
    return [];
  }

  async initialize(): Promise<void> {
    console.log('Initializing CCTV Integration Service...');
    try {
      // Initialize face recognition service if not already done
      if (!this.faceRecognition) {
        throw new Error('Face recognition service not provided');
      }
      
      // Get available cameras and initialize active ones
      const cameras = await this.getCameras();
      const activeCameras = cameras.filter(cam => cam.isActive);
      
      console.log(`Found ${cameras.length} cameras, ${activeCameras.length} active`);
      
      // Initialize active cameras
      for (const camera of activeCameras) {
        try {
          await this.initializeCamera(camera);
          console.log(`✅ Camera ${camera.name} initialized`);
        } catch (error) {
          console.error(`❌ Failed to initialize camera ${camera.name}:`, error);
        }
      }
      
      console.log('CCTV Integration Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CCTV Integration Service:', error);
      throw error;
    }
  }

  async getCameraStatus(cameraId: string): Promise<{
    id: string;
    isActive: boolean;
    isStreaming: boolean;
    lastUpdate: number;
    error?: string;
  }> {
    const processor = this.processors.get(cameraId);
    const cameras = await this.getCameras();
    const camera = cameras.find(cam => cam.id === cameraId);
    
    if (!camera) {
      return {
        id: cameraId,
        isActive: false,
        isStreaming: false,
        lastUpdate: Date.now(),
        error: 'Camera not found'
      };
    }

    return {
      id: cameraId,
      isActive: camera.isActive,
      isStreaming: processor ? processor.isProcessing : false,
      lastUpdate: processor ? processor.lastProcessTime : Date.now(),
      error: processor ? undefined : 'Camera not initialized'
    };
  }

  async startAllStreams(): Promise<void> {
    console.log('Starting all camera streams...');
    try {
      const cameras = await this.getCameras();
      const activeCameras = cameras.filter(cam => cam.isActive);
      
      for (const camera of activeCameras) {
        try {
          if (!this.processors.has(camera.id)) {
            await this.initializeCamera(camera);
          } else {
            // Restart processing if stopped
            const processor = this.processors.get(camera.id);
            if (processor && !processor.isProcessing) {
              this.startProcessing(camera.id);
            }
          }
          console.log(`✅ Started stream for camera ${camera.name}`);
        } catch (error) {
          console.error(`❌ Failed to start stream for camera ${camera.name}:`, error);
        }
      }
      
      console.log('All camera streams started');
    } catch (error) {
      console.error('Failed to start all streams:', error);
      throw error;
    }
  }

  async stopAllStreams(): Promise<void> {
    console.log('Stopping all camera streams...');
    try {
      const processorIds = Array.from(this.processors.keys());
      
      for (const cameraId of processorIds) {
        try {
          this.stopProcessing(cameraId);
          console.log(`✅ Stopped stream for camera ${cameraId}`);
        } catch (error) {
          console.error(`❌ Failed to stop stream for camera ${cameraId}:`, error);
        }
      }
      
      console.log('All camera streams stopped');
    } catch (error) {
      console.error('Failed to stop all streams:', error);
      throw error;
    }
  }

}

export const cctvIntegrationService = new CCTVIntegrationService(
  // This will be injected when the face recognition service is initialized
  {} as FaceRecognitionService
);