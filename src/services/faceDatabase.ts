import CryptoJS from 'crypto-js';
import { supabase } from '@/integrations/supabase/client';

export interface FaceProfile {
  id: string;
  person_id: string;
  person_name: string;
  face_encoding: string; // Encrypted face descriptor
  confidence_threshold: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata?: {
    source: 'manual_upload' | 'cctv_capture' | 'id_document';
    quality_score: number;
    image_url?: string;
    notes?: string;
  };
}

export interface FaceRecognitionLog {
  id: string;
  camera_id: string;
  person_id?: string;
  person_name?: string;
  confidence: number;
  timestamp: string;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  event_type: 'face_detected' | 'person_recognized' | 'person_entered' | 'person_left';
  frame_data?: string; // Base64 encoded frame (optional)
}

export interface FaceRecognitionSettings {
  id: string;
  detection_threshold: number;
  recognition_threshold: number;
  tracking_max_distance: number;
  tracking_max_age: number;
  min_detections_for_track: number;
  enable_logging: boolean;
  log_retention_days: number;
  enable_frame_capture: boolean;
  encryption_key_id: string;
  created_at: string;
  updated_at: string;
}

export class FaceDatabaseService {
  private encryptionKey: string;
  private readonly ENCRYPTION_KEY_STORAGE = 'face_recognition_key';

  constructor() {
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  private getOrCreateEncryptionKey(): string {
    let key = localStorage.getItem(this.ENCRYPTION_KEY_STORAGE);
    
    if (!key) {
      // Generate a new encryption key
      key = CryptoJS.lib.WordArray.random(256/8).toString();
      localStorage.setItem(this.ENCRYPTION_KEY_STORAGE, key);
    }
    
    return key;
  }

  private encryptFaceDescriptor(descriptor: Float32Array): string {
    const descriptorArray = Array.from(descriptor);
    const descriptorString = JSON.stringify(descriptorArray);
    return CryptoJS.AES.encrypt(descriptorString, this.encryptionKey).toString();
  }

  private decryptFaceDescriptor(encryptedDescriptor: string): Float32Array {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedDescriptor, this.encryptionKey);
    const descriptorString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    const descriptorArray = JSON.parse(descriptorString);
    return new Float32Array(descriptorArray);
  }

  async saveFaceProfile(
    personId: string,
    personName: string,
    faceDescriptor: Float32Array,
    metadata?: FaceProfile['metadata']
  ): Promise<FaceProfile> {
    try {
      const encryptedDescriptor = this.encryptFaceDescriptor(faceDescriptor);
      
      const faceProfile: Omit<FaceProfile, 'id' | 'created_at' | 'updated_at'> = {
        person_id: personId,
        person_name: personName,
        face_encoding: encryptedDescriptor,
        confidence_threshold: 0.6,
        is_active: true,
        metadata
      };

      const { data, error } = await supabase
        .from('face_profiles')
        .insert(faceProfile)
        .select()
        .single();

      if (error) throw error;

      return data as FaceProfile;
    } catch (error) {
      console.error('Failed to save face profile:', error);
      throw error;
    }
  }

  async getFaceProfile(personId: string): Promise<FaceProfile | null> {
    try {
      const { data, error } = await supabase
        .from('face_profiles')
        .select('*')
        .eq('person_id', personId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data as FaceProfile | null;
    } catch (error) {
      console.error('Failed to get face profile:', error);
      return null;
    }
  }

  async getAllFaceProfiles(): Promise<FaceProfile[]> {
    try {
      const { data, error } = await supabase
        .from('face_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as FaceProfile[];
    } catch (error) {
      console.error('Failed to get face profiles:', error);
      return [];
    }
  }

  async updateFaceProfile(
    personId: string,
    updates: Partial<Pick<FaceProfile, 'person_name' | 'confidence_threshold' | 'metadata'>>
  ): Promise<FaceProfile | null> {
    try {
      const { data, error } = await supabase
        .from('face_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('person_id', personId)
        .select()
        .single();

      if (error) throw error;

      return data as FaceProfile;
    } catch (error) {
      console.error('Failed to update face profile:', error);
      return null;
    }
  }

  async deleteFaceProfile(personId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('face_profiles')
        .update({ is_active: false })
        .eq('person_id', personId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to delete face profile:', error);
      return false;
    }
  }

  async getFaceDescriptor(personId: string): Promise<Float32Array | null> {
    try {
      const profile = await this.getFaceProfile(personId);
      if (!profile) return null;

      return this.decryptFaceDescriptor(profile.face_encoding);
    } catch (error) {
      console.error('Failed to get face descriptor:', error);
      return null;
    }
  }

  async logRecognitionEvent(event: Omit<FaceRecognitionLog, 'id'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('face_recognition_logs')
        .insert(event);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to log recognition event:', error);
    }
  }

  async getRecognitionLogs(
    filters?: {
      cameraId?: string;
      personId?: string;
      eventType?: FaceRecognitionLog['event_type'];
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<FaceRecognitionLog[]> {
    try {
      let query = supabase
        .from('face_recognition_logs')
        .select('*');

      if (filters?.cameraId) {
        query = query.eq('camera_id', filters.cameraId);
      }

      if (filters?.personId) {
        query = query.eq('person_id', filters.personId);
      }

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }

      query = query
        .order('timestamp', { ascending: false })
        .limit(filters?.limit || 100);

      const { data, error } = await query;

      if (error) throw error;

      return data as FaceRecognitionLog[];
    } catch (error) {
      console.error('Failed to get recognition logs:', error);
      return [];
    }
  }

  async getSettings(): Promise<FaceRecognitionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('face_recognition_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data as FaceRecognitionSettings | null;
    } catch (error) {
      console.error('Failed to get face recognition settings:', error);
      return null;
    }
  }

  async updateSettings(
    settings: Partial<Omit<FaceRecognitionSettings, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<FaceRecognitionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('face_recognition_settings')
        .upsert({
          id: '1', // Single settings record
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data as FaceRecognitionSettings;
    } catch (error) {
      console.error('Failed to update face recognition settings:', error);
      return null;
    }
  }

  async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await supabase
        .from('face_recognition_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
      return 0;
    }
  }

  async exportFaceProfiles(): Promise<Blob> {
    try {
      const profiles = await this.getAllFaceProfiles();
      
      // Remove encrypted face encodings for export (security)
      const exportData = profiles.map(profile => ({
        ...profile,
        face_encoding: '[ENCRYPTED]'
      }));

      const jsonData = JSON.stringify(exportData, null, 2);
      return new Blob([jsonData], { type: 'application/json' });
    } catch (error) {
      console.error('Failed to export face profiles:', error);
      throw error;
    }
  }

  async getStatistics(): Promise<{
    totalProfiles: number;
    activeProfiles: number;
    totalLogs: number;
    logsToday: number;
    recognitionAccuracy: number;
    topRecognizedPersons: Array<{
      person_name: string;
      recognition_count: number;
    }>;
  }> {
    try {
      const [profilesResult, logsResult, todayLogsResult, topPersonsResult] = await Promise.all([
        supabase.from('face_profiles').select('id, is_active'),
        supabase.from('face_recognition_logs').select('id, confidence'),
        supabase
          .from('face_recognition_logs')
          .select('id, confidence')
          .gte('timestamp', new Date().toISOString().split('T')[0]),
        supabase
          .from('face_recognition_logs')
          .select('person_name')
          .eq('event_type', 'person_recognized')
          .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .not('person_name', 'is', null)
      ]);

      const profiles = profilesResult.data || [];
      const logs = logsResult.data || [];
      const todayLogs = todayLogsResult.data || [];
      const topPersonsData = topPersonsResult.data || [];

      const totalProfiles = profiles.length;
      const activeProfiles = profiles.filter(p => p.is_active).length;
      const totalLogs = logs.length;
      const logsToday = todayLogs.length;

      // Calculate average recognition confidence as accuracy metric
      const recognitionAccuracy = logs.length > 0
        ? logs.reduce((sum, log) => sum + log.confidence, 0) / logs.length
        : 0;

      // Calculate top recognized persons
      const personCounts = topPersonsData.reduce((acc, log) => {
        const name = log.person_name;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topRecognizedPersons = Object.entries(personCounts)
        .map(([person_name, recognition_count]) => ({ person_name, recognition_count }))
        .sort((a, b) => b.recognition_count - a.recognition_count)
        .slice(0, 10);

      return {
        totalProfiles,
        activeProfiles,
        totalLogs,
        logsToday,
        recognitionAccuracy: Math.round(recognitionAccuracy * 100) / 100,
        topRecognizedPersons
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalProfiles: 0,
        activeProfiles: 0,
        totalLogs: 0,
        logsToday: 0,
        recognitionAccuracy: 0,
        topRecognizedPersons: []
      };
    }
  }

  // Static methods for easy access
  static async getStatistics(): Promise<{
    totalProfiles: number;
    activeProfiles: number;
    totalLogs: number;
    logsToday: number;
    recognitionAccuracy: number;
    topRecognizedPersons: Array<{
      person_name: string;
      recognition_count: number;
    }>;
  }> {
    console.log('FaceDatabaseService.getStatistics() called');
    return faceDatabaseService.getStatistics();
  }

  static async createProfile(profile: Omit<FaceProfile, 'id' | 'created_at' | 'updated_at'>): Promise<FaceProfile | null> {
    return faceDatabaseService.createProfile(profile);
  }

  static async getProfiles(filters?: { is_active?: boolean; person_name?: string }): Promise<FaceProfile[]> {
    return faceDatabaseService.getProfiles(filters);
  }

  static async updateProfile(id: string, updates: Partial<FaceProfile>): Promise<FaceProfile | null> {
    return faceDatabaseService.updateProfile(id, updates);
  }

  static async deleteProfile(id: string): Promise<boolean> {
    return faceDatabaseService.deleteProfile(id);
  }

  static async logRecognition(log: Omit<FaceRecognitionLog, 'id'>): Promise<FaceRecognitionLog | null> {
    return faceDatabaseService.logRecognition(log);
  }

  static async getLogs(filters?: {
    camera_id?: string;
    person_id?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<FaceRecognitionLog[]> {
    return faceDatabaseService.getLogs(filters);
  }

  static async getSettings(): Promise<FaceRecognitionSettings | null> {
    return faceDatabaseService.getSettings();
  }

  static async updateSettings(settings: Partial<FaceRecognitionSettings>): Promise<FaceRecognitionSettings | null> {
    return faceDatabaseService.updateSettings(settings);
  }
}

export const faceDatabaseService = new FaceDatabaseService();