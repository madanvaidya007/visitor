export interface FaceProfile {
  id: string;
  person_id: string;
  person_name: string;
  face_encoding: number[];
  confidence_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaceRecognitionLog {
  id: string;
  camera_id: string;
  person_id?: string;
  person_name?: string;
  event_type: 'detection' | 'recognition' | 'unknown';
  confidence: number;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  frame_data?: string;
  timestamp: string;
}

export interface FaceRecognitionSettings {
  id: string;
  detectionThreshold: number;
  recognitionThreshold: number;
  trackingMaxDistance: number;
  trackingMaxAge: number;
  minDetectionsForTrack: number;
  enableLogging: boolean;
  logRetentionDays: number;
  enableFrameCapture: boolean;
  encryptionKeyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CameraFeed {
  id: string;
  isActive: boolean;
  isStreaming: boolean;
  lastUpdate: number;
  error?: string;
  isOnline?: boolean;
  lastSeen?: number;
  activeFaceCount?: number;
}

export interface SecurityZone {
  id: string;
  name: string;
  description?: string;
  location?: string;
  zone_type: 'public' | 'restricted' | 'confidential' | 'top_secret';
  access_level: 'public' | 'restricted' | 'confidential' | 'top_secret';
  max_capacity?: number;
  requires_escort: boolean;
  is_active: boolean;
  security_level?: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface QRScanResult {
  success: boolean;
  visitor?: ZoneVisitor;
  zones?: SecurityZone[];
  message?: string;
  error?: string;
}

export interface ZoneVisitor {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  photo_url?: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  destination_zone?: string;
}

export interface FaceMatch {
  person_id: string;
  person_name: string;
  confidence: number;
  face_encoding: number[];
}

export interface CameraConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  resolution: string;
  fps: number;
}