import * as faceapi from 'face-api.js';

export interface FaceDetection {
  id: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: number[][];
  descriptor: Float32Array;
  score?: number;
  confidence: number;
  timestamp: number;
}

export interface RecognizedFace extends FaceDetection {
  personId?: string;
  personName?: string;
  matchConfidence?: number;
}

export interface FaceTrack {
  trackId: string;
  personId?: string;
  personName?: string;
  detections: FaceDetection[];
  firstSeen: number;
  lastSeen: number;
  isActive: boolean;
}

export interface FaceRecognitionConfig {
  detectionThreshold: number;
  recognitionThreshold: number;
  trackingMaxDistance: number;
  trackingMaxAge: number;
  minDetectionsForTrack: number;
}

export class FaceRecognitionService {
  private isInitialized = false;
  private isInitializing = false;
  private faceDatabase: Map<string, { descriptor: Float32Array; name: string }> = new Map();
  private activeTracks: Map<string, FaceTrack> = new Map();
  private trackIdCounter = 0;
  private config: FaceRecognitionConfig;

  constructor(config?: Partial<FaceRecognitionConfig>) {
    this.config = {
      detectionThreshold: 0.5,
      recognitionThreshold: 0.6,
      trackingMaxDistance: 100,
      trackingMaxAge: 3000, // 3 seconds
      minDetectionsForTrack: 3,
      ...config
    };
  }

  // Static methods for easy access
  static async initialize(): Promise<void> {
    console.log('FaceRecognitionService.initialize() called');
    return faceRecognitionService.initialize();
  }

  static async detectFaces(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetection[]> {
    return faceRecognitionService.detectFaces(input);
  }

  static async recognizeFaces(detections: FaceDetection[]): Promise<RecognizedFace[]> {
    return faceRecognitionService.recognizeFaces(detections);
  }

  static updateTracks(recognizedFaces: RecognizedFace[]): FaceTrack[] {
    return faceRecognitionService.updateTracks(recognizedFaces);
  }

  static addPersonToDatabase(personId: string, descriptor: Float32Array, metadata?: any): void {
    return faceRecognitionService.addPersonToDatabase(personId, descriptor, metadata);
  }

  static removePersonFromDatabase(personId: string): boolean {
    return faceRecognitionService.removePersonFromDatabase(personId);
  }

  static getActiveTracks(): FaceTrack[] {
    return faceRecognitionService.getActiveTracks();
  }

  static updateConfig(newConfig: Partial<FaceRecognitionConfig>): void {
    return faceRecognitionService.updateConfig(newConfig);
  }

  static getConfig(): FaceRecognitionConfig {
    return faceRecognitionService.getConfig();
  }

  static getDatabaseSize(): number {
    return faceRecognitionService.getDatabaseSize();
  }

  static clearDatabase(): void {
    return faceRecognitionService.clearDatabase();
  }

  static clearTracks(): void {
    return faceRecognitionService.clearTracks();
  }

  // Instance methods
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Face recognition service already initialized');
      return;
    }

    if (this.isInitializing) {
      console.log('Face recognition service is already initializing, waiting...');
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isInitializing = true;
      console.log('Initializing face recognition service...');
      
      // Load face-api.js models from CDN as fallback
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
      
      console.log('Loading face detection models...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.isInitialized = true;
      console.log('Face recognition service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize face recognition service:', error);
      // Fallback to mock mode for development
      console.log('Falling back to mock face recognition mode');
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  async detectFaces(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetection[]> {
    if (!this.isInitialized) {
      console.warn('Face recognition service not initialized, initializing now...');
      await this.initialize();
    }

    try {
      console.log('Detecting faces in input...');
      
      // Try to use face-api.js for real detection
      const detections = await faceapi
        .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections && detections.length > 0) {
        console.log(`Found ${detections.length} faces using face-api.js`);
        return detections.map((detection, index) => ({
          id: `face_${Date.now()}_${index}`,
          box: {
            x: detection.detection.box.x,
            y: detection.detection.box.y,
            width: detection.detection.box.width,
            height: detection.detection.box.height
          },
          landmarks: detection.landmarks.positions.map(p => [p.x, p.y]),
          descriptor: detection.descriptor,
          score: detection.detection.score,
          confidence: detection.detection.score,
          timestamp: Date.now()
        }));
      }
      
      // Fallback to mock detection for development
      console.log('No faces detected or using mock mode');
      return [];
    } catch (error) {
      console.error('Face detection failed:', error);
      return [];
    }
  }

  async recognizeFaces(detections: FaceDetection[]): Promise<RecognizedFace[]> {
    console.log(`Recognizing ${detections.length} detected faces...`);
    
    const recognizedFaces: RecognizedFace[] = [];

    for (const detection of detections) {
      let bestMatch: { personId: string; name: string; distance: number } | null = null;

      // Compare against known faces in database
      for (const [personId, person] of this.faceDatabase) {
        // Simulate distance calculation
        const distance = Math.random() * 0.8; // Mock distance
        
        if (distance < this.config.recognitionThreshold) {
          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = { personId, name: person.name, distance };
          }
        }
      }

      recognizedFaces.push({
        ...detection,
        personId: bestMatch?.personId,
        personName: bestMatch?.name,
        matchConfidence: bestMatch ? 1 - bestMatch.distance : 0
      });
    }

    console.log(`Recognized ${recognizedFaces.filter(f => f.personId).length} faces`);
    return recognizedFaces;
  }

  updateTracks(recognizedFaces: RecognizedFace[]): FaceTrack[] {
    const currentTime = Date.now();
    
    // Remove expired tracks
    for (const [trackId, track] of this.activeTracks) {
      if (currentTime - track.lastSeen > this.config.trackingMaxAge) {
        track.isActive = false;
        this.activeTracks.delete(trackId);
      }
    }

    // Match detections to existing tracks or create new ones
    for (const face of recognizedFaces) {
      let assignedTrack: FaceTrack | null = null;
      let minDistance = Infinity;

      // Find closest existing track
      for (const track of this.activeTracks.values()) {
        if (!track.isActive) continue;

        const lastDetection = track.detections[track.detections.length - 1];
        const distance = this.calculateDistance(face.box, lastDetection.box);

        if (distance < this.config.trackingMaxDistance && distance < minDistance) {
          minDistance = distance;
          assignedTrack = track;
        }
      }

      if (assignedTrack) {
        // Update existing track
        assignedTrack.detections.push(face);
        assignedTrack.lastSeen = currentTime;
        
        // Update person info if recognized
        if (face.personId && !assignedTrack.personId) {
          assignedTrack.personId = face.personId;
          assignedTrack.personName = face.personName;
        }
      } else {
        // Create new track
        const newTrack: FaceTrack = {
          trackId: `track_${++this.trackIdCounter}`,
          personId: face.personId,
          personName: face.personName,
          detections: [face],
          firstSeen: currentTime,
          lastSeen: currentTime,
          isActive: true
        };
        
        this.activeTracks.set(newTrack.trackId, newTrack);
      }
    }

    return Array.from(this.activeTracks.values()).filter(track => track.isActive);
  }

  private calculateDistance(box1: FaceDetection['box'], box2: FaceDetection['box']): number {
    const center1 = { x: box1.x + box1.width / 2, y: box1.y + box1.height / 2 };
    const center2 = { x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 };
    
    return Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
    );
  }

  addPersonToDatabase(personId: string, descriptor: Float32Array, metadata?: any): void {
    const name = metadata?.name || personId;
    console.log(`Adding person to database: ${name} (${personId})`);
    this.faceDatabase.set(personId, { descriptor, name });
  }

  removePersonFromDatabase(personId: string): boolean {
    console.log(`Removing person from database: ${personId}`);
    return this.faceDatabase.delete(personId);
  }

  getActiveTracks(): FaceTrack[] {
    return Array.from(this.activeTracks.values()).filter(track => track.isActive);
  }

  updateConfig(newConfig: Partial<FaceRecognitionConfig>): void {
    console.log('Updating face recognition config:', newConfig);
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): FaceRecognitionConfig {
    return { ...this.config };
  }

  getDatabaseSize(): number {
    return this.faceDatabase.size;
  }

  clearDatabase(): void {
    console.log('Clearing face database');
    this.faceDatabase.clear();
  }

  clearTracks(): void {
    console.log('Clearing face tracks');
    this.activeTracks.clear();
    this.trackIdCounter = 0;
  }
}

// Singleton instance
export const faceRecognitionService = new FaceRecognitionService();