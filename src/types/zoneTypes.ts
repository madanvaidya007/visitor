// Zone-based Security System Types

export interface SecurityZone {
  id: string;
  name: string;
  description: string;
  location: string;
  floor?: string;
  building?: string;
  capacity: number;
  currentOccupancy: number;
  isActive: boolean;
  accessLevel: 'public' | 'restricted' | 'high_security' | 'executive';
  entryPoints: ZoneEntryPoint[];
  assignedGuards: ZoneGuard[];
  createdAt: string;
  updatedAt: string;
}

export interface ZoneEntryPoint {
  id: string;
  zoneId: string;
  name: string;
  location: string;
  qrCodeId: string;
  isActive: boolean;
  requiresGuardVerification: boolean;
  allowedAccessLevels: string[];
  lastScanTime?: string;
  createdAt: string;
}

export interface ZoneGuard {
  id: string;
  userId: string;
  guardName: string;
  employeeId: string;
  assignedZones: string[];
  isOnDuty: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  contactInfo: {
    phone?: string;
    email?: string;
  };
  permissions: GuardPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface GuardPermission {
  action: 'scan_qr' | 'verify_visitor' | 'emergency_override' | 'zone_lockdown';
  zones: string[];
  isActive: boolean;
}

export interface ZoneAccessLog {
  id: string;
  zoneId: string;
  entryPointId: string;
  visitorId?: string;
  guardId?: string;
  accessType: 'entry' | 'exit' | 'denied' | 'emergency';
  timestamp: string;
  qrCodeScanned?: string;
  verificationStatus: 'pending' | 'approved' | 'denied' | 'expired';
  notes?: string;
  metadata?: {
    deviceInfo?: string;
    location?: { lat: number; lng: number };
    confidence?: number;
  };
  // Joined data for display
  visitor?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
    photo_url?: string;
  };
  zone?: {
    id: string;
    name: string;
    zone_type: string;
    description?: string;
  };
  // Compatibility property for ZoneAccess.tsx
  action?: 'entry' | 'exit' | 'denied' | 'emergency';
}

export interface VisitorZoneRequest {
  id: string;
  visitorId: string;
  requestedZones: string[];
  purpose: string;
  estimatedDuration: number; // in minutes
  hostId: string;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'active' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
  validFrom: string;
  validUntil: string;
  qrCode?: string;
  accessPath?: string[]; // ordered list of zones visitor can access
  createdAt: string;
  updatedAt: string;
  // Joined data from database
  visitor?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
    photo_url?: string;
  };
  zones?: {
    id: string;
    name: string;
    zone_type: string;
    description?: string;
  }[];
  // Compatibility properties for ZoneAccess.tsx
  zone?: {
    id: string;
    name: string;
    zone_type: string;
    description?: string;
  };
  entered_at?: string;
}

export interface ZoneOccupancy {
  zoneId: string;
  currentCount: number;
  maxCapacity: number;
  occupancyRate: number;
  visitors: ZoneVisitor[];
  lastUpdated: string;
}

export interface ZoneVisitor {
  visitorId: string;
  visitorName: string;
  entryTime: string;
  expectedExitTime?: string;
  currentStatus: 'checked_in' | 'in_zone' | 'checked_out' | 'overdue';
  hostId: string;
  hostName: string;
}

export interface ZoneSecurityAlert {
  id: string;
  zoneId: string;
  alertType: 'unauthorized_access' | 'capacity_exceeded' | 'guard_offline' | 'system_error' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ZoneStatistics {
  totalZones: number;
  activeZones: number;
  totalGuards: number;
  guardsOnDuty: number;
  totalVisitors: number;
  visitorsInZones: number;
  todayScans: number;
  pendingRequests: number;
  securityAlerts: number;
  averageOccupancy: number;
  // Add missing property for ZoneAccess.tsx compatibility
  restrictedZones?: number;
  zoneUtilization: Array<{
    zoneId: string;
    zoneName: string;
    occupancyRate: number;
    totalVisits: number;
  }>;
}

export interface QRScanResult {
  success: boolean;
  data?: {
    visitorId: string;
    zoneId: string;
    entryPointId: string;
    accessLevel: string;
    validUntil: string;
  };
  error?: string;
  requiresGuardVerification: boolean;
}

export interface RealtimeZoneUpdate {
  type: 'zone_entry' | 'zone_exit' | 'guard_status' | 'alert' | 'occupancy_change';
  zoneId: string;
  data: any;
  timestamp: string;
}