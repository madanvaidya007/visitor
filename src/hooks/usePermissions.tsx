import { useMemo } from 'react';
import React from 'react';
import { useAuth } from './useAuth';
import { ZoneGuard } from '@/types/zoneTypes';

export interface ZonePermissions {
  canAccessZone: (zoneId: string) => boolean;
  canScanQR: (zoneId: string) => boolean;
  canVerifyVisitor: (zoneId: string) => boolean;
  canEmergencyOverride: (zoneId: string) => boolean;
  canLockdownZone: (zoneId: string) => boolean;
  canViewAccessLogs: (zoneId: string) => boolean;
  canManageGuards: boolean;
  canManageZones: boolean;
  assignedZones: string[];
  isOnDuty: boolean;
}

export function usePermissions(guardInfo?: ZoneGuard | null): ZonePermissions {
  const { profile } = useAuth();

  return useMemo(() => {
    // Admin and security manager have full access
    if (profile?.role === 'admin' || profile?.role === 'security') {
      return {
        canAccessZone: () => true,
        canScanQR: () => true,
        canVerifyVisitor: () => true,
        canEmergencyOverride: () => true,
        canLockdownZone: () => true,
        canViewAccessLogs: () => true,
        canManageGuards: true,
        canManageZones: true,
        assignedZones: [],
        isOnDuty: true
      };
    }

    // Guard permissions based on assigned zones and specific permissions
    if (guardInfo) {
      const hasPermission = (action: string, zoneId: string): boolean => {
        // Check if guard is on duty
        if (!guardInfo.isOnDuty) return false;
        
        // Check if zone is assigned to guard
        if (!guardInfo.assignedZones.includes(zoneId)) return false;
        
        // Check specific permission
        return guardInfo.permissions.some(perm => 
          perm.action === action && 
          perm.isActive && 
          (perm.zones.includes(zoneId) || perm.zones.includes('*'))
        );
      };

      return {
        canAccessZone: (zoneId: string) => guardInfo.assignedZones.includes(zoneId) && guardInfo.isOnDuty,
        canScanQR: (zoneId: string) => hasPermission('scan_qr', zoneId),
        canVerifyVisitor: (zoneId: string) => hasPermission('verify_visitor', zoneId),
        canEmergencyOverride: (zoneId: string) => hasPermission('emergency_override', zoneId),
        canLockdownZone: (zoneId: string) => hasPermission('zone_lockdown', zoneId),
        canViewAccessLogs: (zoneId: string) => guardInfo.assignedZones.includes(zoneId) && guardInfo.isOnDuty,
        canManageGuards: false,
        canManageZones: false,
        assignedZones: guardInfo.assignedZones,
        isOnDuty: guardInfo.isOnDuty
      };
    }

    // Default permissions for other roles
    return {
      canAccessZone: () => false,
      canScanQR: () => false,
      canVerifyVisitor: () => false,
      canEmergencyOverride: () => false,
      canLockdownZone: () => false,
      canViewAccessLogs: () => false,
      canManageGuards: false,
      canManageZones: false,
      assignedZones: [],
      isOnDuty: false
    };
  }, [profile, guardInfo]);
}

// Higher-order component for protecting routes based on permissions
export function withZonePermission<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: keyof ZonePermissions,
  zoneId?: string
) {
  return function PermissionProtectedComponent(props: T) {
    const permissions = usePermissions();
    
    if (typeof permissions[requiredPermission] === 'function') {
      const hasPermission = (permissions[requiredPermission] as Function)(zoneId);
      if (!hasPermission) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
              <p className="text-gray-600">You don't have permission to access this zone.</p>
            </div>
          </div>
        );
      }
    } else {
      const hasPermission = permissions[requiredPermission] as boolean;
      if (!hasPermission) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
              <p className="text-gray-600">You don't have permission to perform this action.</p>
            </div>
          </div>
        );
      }
    }
    
    return <Component {...props} />;
  };
}