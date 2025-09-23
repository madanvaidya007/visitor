import { supabase } from '@/integrations/supabase/client';
import { 
  SecurityZone, 
  ZoneEntryPoint, 
  ZoneGuard, 
  ZoneAccessLog, 
  VisitorZoneRequest, 
  ZoneOccupancy, 
  ZoneSecurityAlert, 
  ZoneStatistics, 
  QRScanResult,
  RealtimeZoneUpdate
} from '@/types/zoneTypes';

export class ZoneSecurityService {
  private static instance: ZoneSecurityService;
  private realtimeSubscriptions: Map<string, any> = new Map();

  static getInstance(): ZoneSecurityService {
    if (!ZoneSecurityService.instance) {
      ZoneSecurityService.instance = new ZoneSecurityService();
    }
    return ZoneSecurityService.instance;
  }

  // Zone Management
  async createZone(zoneData: Omit<SecurityZone, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityZone> {
    const { data, error } = await supabase
      .from('security_zones')
      .insert([{
        ...zoneData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create zone: ${error.message}`);
    return this.mapZoneFromDB(data);
  }

  async getZones(): Promise<SecurityZone[]> {
    const { data, error } = await supabase
      .from('security_zones')
      .select(`
        *,
        zone_entry_points(*),
        zone_guards(*)
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw new Error(`Failed to fetch zones: ${error.message}`);
    return data.map(this.mapZoneFromDB);
  }

  async getZoneById(zoneId: string): Promise<SecurityZone | null> {
    const { data, error } = await supabase
      .from('security_zones')
      .select(`
        *,
        zone_entry_points(*),
        zone_guards(*)
      `)
      .eq('id', zoneId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch zone: ${error.message}`);
    }
    return this.mapZoneFromDB(data);
  }

  async updateZone(zoneId: string, updates: Partial<SecurityZone>): Promise<SecurityZone> {
    const { data, error } = await supabase
      .from('security_zones')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', zoneId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update zone: ${error.message}`);
    return this.mapZoneFromDB(data);
  }

  async deleteZone(zoneId: string): Promise<void> {
    const { error } = await supabase
      .from('security_zones')
      .update({ is_active: false })
      .eq('id', zoneId);

    if (error) throw new Error(`Failed to delete zone: ${error.message}`);
  }

  // Entry Point Management
  async createEntryPoint(entryPointData: Omit<ZoneEntryPoint, 'id' | 'createdAt'>): Promise<ZoneEntryPoint> {
    const qrCodeId = this.generateQRCode();
    
    const { data, error } = await supabase
      .from('zone_entry_points')
      .insert([{
        ...entryPointData,
        qr_code_id: qrCodeId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create entry point: ${error.message}`);
    return this.mapEntryPointFromDB(data);
  }

  async getEntryPointsByZone(zoneId: string): Promise<ZoneEntryPoint[]> {
    const { data, error } = await supabase
      .from('zone_entry_points')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true);

    if (error) throw new Error(`Failed to fetch entry points: ${error.message}`);
    return data.map(this.mapEntryPointFromDB);
  }

  // Guard Management
  async assignGuardToZone(guardData: Omit<ZoneGuard, 'id' | 'createdAt' | 'updatedAt'>): Promise<ZoneGuard> {
    const { data, error } = await supabase
      .from('zone_guards')
      .insert([{
        ...guardData,
        assigned_zones: guardData.assignedZones,
        is_on_duty: guardData.isOnDuty,
        shift_start: guardData.shiftStart,
        shift_end: guardData.shiftEnd,
        contact_info: guardData.contactInfo,
        permissions: guardData.permissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to assign guard: ${error.message}`);
    return this.mapGuardFromDB(data);
  }

  async getGuardsByZone(zoneId: string): Promise<ZoneGuard[]> {
    const { data, error } = await supabase
      .from('zone_guards')
      .select('*')
      .contains('assigned_zones', [zoneId])
      .eq('is_on_duty', true);

    if (error) throw new Error(`Failed to fetch guards: ${error.message}`);
    return data.map(this.mapGuardFromDB);
  }

  async updateGuardStatus(guardId: string, isOnDuty: boolean): Promise<void> {
    const { error } = await supabase
      .from('zone_guards')
      .update({ 
        is_on_duty: isOnDuty,
        updated_at: new Date().toISOString()
      })
      .eq('id', guardId);

    if (error) throw new Error(`Failed to update guard status: ${error.message}`);
  }

  async getGuardById(userId: string): Promise<ZoneGuard | null> {
    const { data, error } = await supabase
      .from('zone_guards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw new Error(`Failed to fetch guard: ${error.message}`);
    }
    
    return this.mapGuardFromDB(data);
  }

  // QR Code Scanning
  async scanQRCode(qrCodeId: string, guardId: string, entryPointId: string): Promise<QRScanResult> {
    try {
      // Verify QR code and get associated data
      const { data: entryPoint, error: entryError } = await supabase
        .from('zone_entry_points')
        .select(`
          *,
          security_zones(*)
        `)
        .eq('qr_code_id', qrCodeId)
        .eq('id', entryPointId)
        .single();

      if (entryError || !entryPoint) {
        return { success: false, error: 'Invalid QR code or entry point', requiresGuardVerification: false };
      }

      // Check if guard has permission for this zone
      const { data: guard } = await supabase
        .from('zone_guards')
        .select('*')
        .eq('id', guardId)
        .single();

      if (!guard || !guard.assigned_zones.includes(entryPoint.zone_id)) {
        return { success: false, error: 'Guard not authorized for this zone', requiresGuardVerification: false };
      }

      return {
        success: true,
        data: {
          visitorId: '', // Will be filled when visitor scans
          zoneId: entryPoint.zone_id,
          entryPointId: entryPoint.id,
          accessLevel: entryPoint.security_zones.access_level,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        },
        requiresGuardVerification: entryPoint.requires_guard_verification
      };
    } catch (error) {
      return { success: false, error: 'QR scan failed', requiresGuardVerification: false };
    }
  }

  async verifyVisitorAccess(visitorId: string, zoneId: string, guardId: string): Promise<boolean> {
    // Check if visitor has valid zone request
    const { data: request } = await supabase
      .from('visitor_zone_requests')
      .select('*')
      .eq('visitor_id', visitorId)
      .contains('requested_zones', [zoneId])
      .eq('status', 'approved')
      .gte('valid_until', new Date().toISOString())
      .single();

    if (!request) return false;

    // Log the access attempt
    await this.logZoneAccess({
      zoneId,
      entryPointId: '', // Will be provided by scanning
      visitorId,
      guardId,
      accessType: 'entry',
      timestamp: new Date().toISOString(),
      verificationStatus: 'approved'
    });

    return true;
  }

  // Access Logging
  async logZoneAccess(logData: Omit<ZoneAccessLog, 'id'>): Promise<ZoneAccessLog> {
    const { data, error } = await supabase
      .from('zone_access_logs')
      .insert([{
        zone_id: logData.zoneId,
        entry_point_id: logData.entryPointId,
        visitor_id: logData.visitorId,
        guard_id: logData.guardId,
        access_type: logData.accessType,
        timestamp: logData.timestamp,
        qr_code_scanned: logData.qrCodeScanned,
        verification_status: logData.verificationStatus,
        notes: logData.notes,
        metadata: logData.metadata
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to log access: ${error.message}`);
    return this.mapAccessLogFromDB(data);
  }

  async getAccessLogs(zoneId?: string, limit: number = 100): Promise<ZoneAccessLog[]> {
    let query = supabase
      .from('zone_access_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (zoneId) {
      query = query.eq('zone_id', zoneId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch access logs: ${error.message}`);
    return data.map(this.mapAccessLogFromDB);
  }

  // Zone Occupancy
  async getZoneOccupancy(zoneId: string): Promise<ZoneOccupancy> {
    const { data, error } = await supabase
      .from('zone_occupancy_view')
      .select('*')
      .eq('zone_id', zoneId)
      .single();

    if (error) throw new Error(`Failed to fetch occupancy: ${error.message}`);
    return this.mapOccupancyFromDB(data);
  }

  async updateZoneOccupancy(zoneId: string, visitorId: string, action: 'enter' | 'exit'): Promise<void> {
    const { error } = await supabase.rpc('update_zone_occupancy', {
      p_zone_id: zoneId,
      p_visitor_id: visitorId,
      p_action: action
    });

    if (error) throw new Error(`Failed to update occupancy: ${error.message}`);
  }

  // Statistics
  async getZoneStatistics(): Promise<ZoneStatistics> {
    const { data, error } = await supabase.rpc('get_zone_statistics');
    if (error) throw new Error(`Failed to fetch statistics: ${error.message}`);
    return data;
  }

  // Visitor Zone Requests
  async createZoneRequest(requestData: Omit<VisitorZoneRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<VisitorZoneRequest> {
    const qrCode = this.generateVisitorQRCode(requestData.visitorId, requestData.requestedZones);
    
    const { data, error } = await supabase
      .from('visitor_zone_requests')
      .insert([{
        ...requestData,
        qr_code: qrCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create zone request: ${error.message}`);
    return this.mapZoneRequestFromDB(data);
  }

  async approveZoneRequest(requestId: string, approvedBy: string): Promise<VisitorZoneRequest> {
    const { data, error } = await supabase
      .from('visitor_zone_requests')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new Error(`Failed to approve request: ${error.message}`);
    return this.mapZoneRequestFromDB(data);
  }

  // Real-time Subscriptions
  subscribeToZoneUpdates(zoneId: string, callback: (update: RealtimeZoneUpdate) => void): string {
    const subscriptionId = `zone_${zoneId}_${Date.now()}`;
    
    const subscription = supabase
      .channel(`zone_updates_${zoneId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'zone_access_logs', filter: `zone_id=eq.${zoneId}` },
        (payload) => {
          callback({
            type: payload.eventType === 'INSERT' ? 'zone_entry' : 'zone_exit',
            zoneId,
            data: payload.new,
            timestamp: new Date().toISOString()
          });
        }
      )
      .subscribe();

    this.realtimeSubscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  unsubscribeFromZoneUpdates(subscriptionId: string): void {
    const subscription = this.realtimeSubscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.realtimeSubscriptions.delete(subscriptionId);
    }
  }

  // Utility Methods
  private generateQRCode(): string {
    return `EP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVisitorQRCode(visitorId: string, zones: string[]): string {
    return `VZR_${visitorId}_${zones.join('_')}_${Date.now()}`;
  }

  // Mapping Methods
  private mapZoneFromDB(data: any): SecurityZone {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      location: data.location,
      floor: data.floor,
      building: data.building,
      capacity: data.capacity,
      currentOccupancy: data.current_occupancy || 0,
      isActive: data.is_active,
      accessLevel: data.access_level,
      entryPoints: data.zone_entry_points?.map(this.mapEntryPointFromDB) || [],
      assignedGuards: data.zone_guards?.map(this.mapGuardFromDB) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapEntryPointFromDB(data: any): ZoneEntryPoint {
    return {
      id: data.id,
      zoneId: data.zone_id,
      name: data.name,
      location: data.location,
      qrCodeId: data.qr_code_id,
      isActive: data.is_active,
      requiresGuardVerification: data.requires_guard_verification,
      allowedAccessLevels: data.allowed_access_levels || [],
      lastScanTime: data.last_scan_time,
      createdAt: data.created_at
    };
  }

  private mapGuardFromDB(data: any): ZoneGuard {
    return {
      id: data.id,
      userId: data.user_id,
      guardName: data.guard_name,
      employeeId: data.employee_id,
      assignedZones: data.assigned_zones || [],
      isOnDuty: data.is_on_duty,
      shiftStart: data.shift_start,
      shiftEnd: data.shift_end,
      contactInfo: data.contact_info || {},
      permissions: data.permissions || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapAccessLogFromDB(data: any): ZoneAccessLog {
    return {
      id: data.id,
      zoneId: data.zone_id,
      entryPointId: data.entry_point_id,
      visitorId: data.visitor_id,
      guardId: data.guard_id,
      accessType: data.access_type,
      timestamp: data.timestamp,
      qrCodeScanned: data.qr_code_scanned,
      verificationStatus: data.verification_status,
      notes: data.notes,
      metadata: data.metadata
    };
  }

  private mapZoneRequestFromDB(data: any): VisitorZoneRequest {
    return {
      id: data.id,
      visitorId: data.visitor_id,
      requestedZones: data.requested_zones || [],
      purpose: data.purpose,
      estimatedDuration: data.estimated_duration,
      hostId: data.host_id,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      validFrom: data.valid_from,
      validUntil: data.valid_until,
      qrCode: data.qr_code,
      accessPath: data.access_path || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapOccupancyFromDB(data: any): ZoneOccupancy {
    return {
      zoneId: data.zone_id,
      currentCount: data.current_count,
      maxCapacity: data.max_capacity,
      occupancyRate: data.occupancy_rate,
      visitors: data.visitors || [],
      lastUpdated: data.last_updated
    };
  }
}

export const zoneSecurityService = ZoneSecurityService.getInstance();