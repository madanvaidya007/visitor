import { useCallback } from 'react';
import { useEmailService } from './useEmailService';
import { AdminAlertData } from '@/services/emailApiService';

export interface SystemAlert {
  type: 'security' | 'system' | 'emergency';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  actionRequired?: boolean;
  metadata?: Record<string, any>;
}

export function useAdminNotifications() {
  const { sendAdminAlert } = useEmailService();

  const sendSecurityAlert = useCallback(async (
    adminEmails: string | string[],
    alert: Omit<SystemAlert, 'type'>
  ) => {
    const alertData: AdminAlertData = {
      alertType: 'security',
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      timestamp: new Date().toISOString(),
      location: alert.location,
      actionRequired: alert.actionRequired
    };

    try {
      const result = await sendAdminAlert(adminEmails, alertData);
      return result;
    } catch (error) {
      console.error('Failed to send security alert:', error);
      throw error;
    }
  }, [sendAdminAlert]);

  const sendSystemAlert = useCallback(async (
    adminEmails: string | string[],
    alert: Omit<SystemAlert, 'type'>
  ) => {
    const alertData: AdminAlertData = {
      alertType: 'system',
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      timestamp: new Date().toISOString(),
      location: alert.location,
      actionRequired: alert.actionRequired
    };

    try {
      const result = await sendAdminAlert(adminEmails, alertData);
      return result;
    } catch (error) {
      console.error('Failed to send system alert:', error);
      throw error;
    }
  }, [sendAdminAlert]);

  const sendEmergencyAlert = useCallback(async (
    adminEmails: string | string[],
    alert: Omit<SystemAlert, 'type'>
  ) => {
    const alertData: AdminAlertData = {
      alertType: 'emergency',
      title: alert.title,
      message: alert.message,
      severity: 'critical', // Emergency alerts are always critical
      timestamp: new Date().toISOString(),
      location: alert.location,
      actionRequired: true // Emergency alerts always require action
    };

    try {
      const result = await sendAdminAlert(adminEmails, alertData);
      return result;
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
      throw error;
    }
  }, [sendAdminAlert]);

  // Predefined alert scenarios
  const sendUnauthorizedAccessAlert = useCallback(async (
    adminEmails: string | string[],
    location: string,
    visitorName?: string,
    details?: string
  ) => {
    return sendSecurityAlert(adminEmails, {
      title: 'Unauthorized Access Attempt',
      message: `Unauthorized access attempt detected${visitorName ? ` by ${visitorName}` : ''} at ${location}. ${details || 'Immediate investigation required.'}`,
      severity: 'high',
      location,
      actionRequired: true
    });
  }, [sendSecurityAlert]);

  const sendSystemErrorAlert = useCallback(async (
    adminEmails: string | string[],
    errorType: string,
    errorMessage: string,
    component?: string
  ) => {
    return sendSystemAlert(adminEmails, {
      title: `System Error: ${errorType}`,
      message: `A system error has occurred${component ? ` in ${component}` : ''}: ${errorMessage}`,
      severity: 'medium',
      actionRequired: false
    });
  }, [sendSystemAlert]);

  const sendCapacityAlert = useCallback(async (
    adminEmails: string | string[],
    zoneName: string,
    currentCount: number,
    maxCapacity: number
  ) => {
    const percentage = (currentCount / maxCapacity) * 100;
    const severity = percentage >= 100 ? 'high' : percentage >= 90 ? 'medium' : 'low';

    return sendSystemAlert(adminEmails, {
      title: 'Zone Capacity Alert',
      message: `Zone "${zoneName}" is at ${percentage.toFixed(1)}% capacity (${currentCount}/${maxCapacity} visitors). ${percentage >= 100 ? 'Maximum capacity exceeded!' : 'Approaching maximum capacity.'}`,
      severity,
      location: zoneName,
      actionRequired: percentage >= 100
    });
  }, [sendSystemAlert]);

  const sendEvacuationAlert = useCallback(async (
    adminEmails: string | string[],
    location: string,
    visitorCount: number,
    reason?: string
  ) => {
    return sendEmergencyAlert(adminEmails, {
      title: 'Emergency Evacuation Required',
      message: `Emergency evacuation initiated for ${location}. ${visitorCount} visitors currently in the area. ${reason || 'Immediate evacuation required.'}`,
      severity: 'critical',
      location,
      actionRequired: true
    });
  }, [sendEmergencyAlert]);

  const sendOverdueVisitorAlert = useCallback(async (
    adminEmails: string | string[],
    visitorName: string,
    hostName: string,
    location: string,
    overdueHours: number
  ) => {
    return sendSecurityAlert(adminEmails, {
      title: 'Overdue Visitor Alert',
      message: `Visitor "${visitorName}" (hosted by ${hostName}) has been in ${location} for ${overdueHours} hours past their scheduled departure time. Please investigate.`,
      severity: overdueHours >= 4 ? 'high' : 'medium',
      location,
      actionRequired: overdueHours >= 4
    });
  }, [sendSecurityAlert]);

  return {
    sendSecurityAlert,
    sendSystemAlert,
    sendEmergencyAlert,
    sendUnauthorizedAccessAlert,
    sendSystemErrorAlert,
    sendCapacityAlert,
    sendEvacuationAlert,
    sendOverdueVisitorAlert
  };
}