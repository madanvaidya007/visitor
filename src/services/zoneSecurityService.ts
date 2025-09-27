import { supabase } from '@/integrations/supabase/client';
import type { QRScanResult, ZoneVisitor, SecurityZone } from '@/types/faceRecognitionTypes';
import { 
  ZoneEntryPoint, 
  ZoneGuard, 
  ZoneAccessLog, 
  VisitorZoneRequest, 
  ZoneOccupancy, 
  ZoneSecurityAlert, 
  ZoneStatistics, 
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

  static async getAuthorizedZones(guardId: string) {
    // Mock implementation - replace with actual database query
    const { data, error } = await supabase
      .from('guard_zone_assignments')
      .select(`
        zone_id,
        zones (
          id,
          name,
          zone_type,
          is_active
        )
      `)
      .eq('guard_id', guardId)
      .eq('is_active', true);

    if (error) throw error;
    return data?.map(assignment => assignment.zones) || [];
  }

  static async validateZoneAccess(guardId: string, zoneId: string) {
    const authorizedZones = await this.getAuthorizedZones(guardId);
    return authorizedZones.some(zone => zone.id === zoneId);
  }

  static async processQRScan(qrData: string, guardId: string): Promise<QRScanResult> {
    try {
      // Extract visit request ID from QR code
      const parts = qrData.split('-');
      if (parts.length < 3 || parts[0] !== 'VIS') {
        return {
          success: false,
          error: 'Invalid QR code format'
        };
      }

      const visitRequestId = parts[2];

      // Get visit request details
      const { data: visitRequest, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          profiles!visitor_id (*)
        `)
        .eq('id', visitRequestId)
        .eq('status', 'approved')
        .single();

      if (error || !visitRequest) {
        return {
          success: false,
          error: 'Visit request not found or not approved'
        };
      }

      // Check if guard is authorized for the requested zones
      const authorizedZones = await this.getAuthorizedZones(guardId);
      const requestedZones = visitRequest.authorized_zones || [];
      
      const hasAccess = requestedZones.every((zoneId: string) =>
        authorizedZones.some(zone => zone.id === zoneId)
      );

      if (!hasAccess) {
        return {
          success: false,
          error: 'Guard not authorized for requested zones'
        };
      }

      // Transform data to match expected interface
      const visitor: ZoneVisitor = {
        id: visitRequest.id,
        full_name: visitRequest.profiles?.full_name || '',
        email: visitRequest.profiles?.email || '',
        phone: visitRequest.profiles?.phone,
        company: visitRequest.profiles?.company,
        photo_url: visitRequest.profiles?.photo_url,
        purpose: visitRequest.purpose,
        visit_date: visitRequest.visit_date,
        start_time: visitRequest.start_time,
        end_time: visitRequest.end_time,
        status: visitRequest.status,
        destination_zone: requestedZones[0] // First zone as default
      };

      return {
        success: true,
        visitor,
        zones: authorizedZones,
        message: 'QR scan successful'
      };

    } catch (error) {
      console.error('QR scan processing error:', error);
      return {
        success: false,
        error: 'Failed to process QR scan'
      };
    }
  }

  // Zone Management
  async createZone(zoneData: Omit<SecurityZone, 'id' | 'created_at' | 'updated_at'>): Promise<SecurityZone> {
    const { data, error } = await supabase
      .from('zones')
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
      .from('zones')
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
      .from('zones')
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
      .from('zones')
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
      .from('zones')
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

  async getEntryPoints(zoneId?: string): Promise<ZoneEntryPoint[]> {
    let query = supabase
      .from('zone_entry_points')
      .select('*')
      .eq('is_active', true);

    if (zoneId) {
      query = query.eq('zone_id', zoneId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch entry points: ${error.message}`);
    return data.map(this.mapEntryPointFromDB);
  }

  async getEntryPointsByZone(zoneId: string): Promise<ZoneEntryPoint[]> {
    return this.getEntryPoints(zoneId);
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

  async getGuards(zoneId?: string): Promise<ZoneGuard[]> {
    let query = supabase
      .from('zone_guards')
      .select('*')
      .eq('is_on_duty', true);

    if (zoneId) {
      query = query.contains('assigned_zones', [zoneId]);
    }

    const { data, error } = await query;
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
          zones(*)
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
          accessLevel: entryPoint.zones.access_level,
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
      .from('zone_entry_logs')
      .insert([{
        zone_id: logData.zoneId,
        visitor_id: logData.visitorId,
        visit_request_id: logData.visitRequestId,
        action: logData.accessType, // Map accessType to action
        timestamp: logData.timestamp,
        scanned_by: logData.guardId,
        notes: logData.notes,
        device_id: logData.metadata?.deviceId,
        location_details: logData.metadata
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to log access: ${error.message}`);
    return this.mapAccessLogFromDB(data);
  }

  async getAccessLogs(options?: { zone_id?: string; limit?: number } | string, limit?: number): Promise<ZoneAccessLog[]> {
    let zoneId: string | undefined;
    let queryLimit: number = 100;

    // Handle both old and new parameter formats
    if (typeof options === 'string') {
      zoneId = options;
      queryLimit = limit || 100;
    } else if (options && typeof options === 'object') {
      zoneId = options.zone_id;
      queryLimit = options.limit || 100;
    }

    let query = supabase
      .from('zone_entry_logs')
      .select(`
        *,
        visitor:profiles!zone_entry_logs_visitor_id_fkey(
          id,
          full_name,
          email,
          phone,
          company,
          photo_url
        ),
        zone:zones!zone_entry_logs_zone_id_fkey(
          id,
          name,
          zone_type,
          description
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(queryLimit);

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
  async getZoneStatistics(zoneId?: string): Promise<ZoneStatistics> {
    if (zoneId) {
      // Get statistics for specific zone
      const { data, error } = await supabase.rpc('get_zone_statistics_by_id', { p_zone_id: zoneId });
      if (error) throw new Error(`Failed to fetch zone statistics: ${error.message}`);
      return data;
    } else {
      // Get overall statistics
      const { data, error } = await supabase.rpc('get_zone_statistics');
      if (error) throw new Error(`Failed to fetch statistics: ${error.message}`);
      return data;
    }
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

  async getVisitorZoneRequests(options?: { zone_id?: string; limit?: number }): Promise<VisitorZoneRequest[]> {
    let query = supabase
      .from('visitor_zone_requests')
      .select(`
        *,
        visitor:profiles!visitor_zone_requests_visitor_id_fkey(
          id,
          full_name,
          email,
          phone,
          company,
          photo_url
        ),
        zones!inner(
          id,
          name,
          zone_type,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (options?.zone_id) {
      query = query.contains('requested_zones', [options.zone_id]);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch visitor zone requests: ${error.message}`);
    return data.map(this.mapZoneRequestFromDB);
  }

  async getSecurityAlerts(options?: { zone_id?: string; limit?: number }): Promise<ZoneSecurityAlert[]> {
    let query = supabase
      .from('zone_security_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.zone_id) {
      query = query.eq('zone_id', options.zone_id);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch security alerts: ${error.message}`);
    return data.map(this.mapSecurityAlertFromDB);
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
      entryPointId: null, // zone_entry_logs doesn't have entry_point_id
      visitorId: data.visitor_id,
      visitRequestId: data.visit_request_id,
      guardId: data.scanned_by,
      accessType: data.action,
      timestamp: data.timestamp,
      qrCodeScanned: true, // Assume true for zone_entry_logs
      verificationStatus: 'verified', // Assume verified for zone_entry_logs
      notes: data.notes,
      metadata: data.location_details || {},
      // Add joined data for compatibility
      visitor: data.visitor,
      zone: data.zone,
      // Add compatibility property for ZoneAccess.tsx
      action: data.action
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
      updatedAt: data.updated_at,
      // Add joined data
      visitor: data.visitor,
      zones: data.zones || [],
      // Add compatibility properties for ZoneAccess.tsx
      zone: data.zones?.[0] || null,
      entered_at: data.valid_from
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

  private mapSecurityAlertFromDB(data: any): ZoneSecurityAlert {
    return {
      id: data.id,
      zoneId: data.zone_id,
      alertType: data.alert_type,
      severity: data.severity,
      title: data.title,
      description: data.description,
      triggeredBy: data.triggered_by,
      isResolved: data.is_resolved,
      resolvedBy: data.resolved_by,
      resolvedAt: data.resolved_at,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const zoneSecurityService = ZoneSecurityService.getInstance();