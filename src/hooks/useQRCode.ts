import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CryptoJS from 'crypto-js';

// Enhanced QR Code data structure
interface QRCodeData {
  version: string;
  visitRequestId: string;
  timestamp: number;
  expiresAt: number;
  checksum: string;
  securityLevel: 'standard' | 'high';
}

interface ScanResult {
  success: boolean;
  visitRequest?: any;
  error?: string;
  message?: string;
}

export function useQRCode() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Generate secure checksum for QR code validation
  const generateChecksum = (data: string): string => {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex).substring(0, 8);
  };

  // Create QR code data structure
  const createQRCodeData = (visitRequestId: string, securityLevel: 'standard' | 'high' = 'standard'): QRCodeData => {
    const timestamp = Date.now();
    const expirationHours = securityLevel === 'high' ? 2 : 24; // High security expires in 2 hours
    const expiresAt = timestamp + (expirationHours * 60 * 60 * 1000);
    
    const baseData = `${visitRequestId}-${timestamp}-${expiresAt}`;
    const checksum = generateChecksum(baseData);

    return {
      version: '2.0',
      visitRequestId,
      timestamp,
      expiresAt,
      checksum,
      securityLevel
    };
  };

  // Encode QR data to string format
  const encodeQRData = (qrData: QRCodeData): string => {
    return `VMS-v${qrData.version}-${qrData.visitRequestId}-${qrData.timestamp}-${qrData.expiresAt}-${qrData.checksum}-${qrData.securityLevel}`;
  };

  // Decode QR string to data structure
  const decodeQRData = (qrString: string): QRCodeData | null => {
    try {
      // Handle QR_ format (QR_{visitRequestId}_{timestamp})
      if (qrString.startsWith('QR_')) {
        const parts = qrString.split('_');
        if (parts.length >= 3) {
          const visitRequestId = parts[1];
          const timestamp = parseInt(parts[2]);
          
          return {
            version: '1.0',
            visitRequestId,
            timestamp,
            expiresAt: timestamp + (24 * 60 * 60 * 1000), // 24 hours from creation
            checksum: '',
            securityLevel: 'standard'
          };
        }
      }

      const parts = qrString.split('-');
      
      // Handle legacy format (VMS-{visitRequestId}-{timestamp})
      if (parts.length === 3 && parts[0] === 'VMS') {
        return {
          version: '1.0',
          visitRequestId: parts[1],
          timestamp: parseInt(parts[2]),
          expiresAt: parseInt(parts[2]) + (24 * 60 * 60 * 1000), // 24 hours from creation
          checksum: '',
          securityLevel: 'standard'
        };
      }

      // Handle UUID legacy format
      if (parts.length === 7 && parts[0] === 'VMS') {
        const visitRequestId = parts.slice(1, 6).join('-');
        return {
          version: '1.0',
          visitRequestId,
          timestamp: parseInt(parts[6]),
          expiresAt: parseInt(parts[6]) + (24 * 60 * 60 * 1000),
          checksum: '',
          securityLevel: 'standard'
        };
      }

      // Handle new format (VMS-v2.0-{visitRequestId}-{timestamp}-{expiresAt}-{checksum}-{securityLevel})
      if (parts.length >= 7 && parts[0] === 'VMS' && parts[1].startsWith('v')) {
        const version = parts[1].substring(1); // Remove 'v' prefix
        
        if (version === '2.0') {
          // For UUID visit request IDs, reconstruct them
          let visitRequestId: string;
          let timestampIndex: number;
          
          if (parts.length === 7) {
            // Simple ID format
            visitRequestId = parts[2];
            timestampIndex = 3;
          } else if (parts.length === 11) {
            // UUID format: VMS-v2.0-{uuid-part1}-{uuid-part2}-{uuid-part3}-{uuid-part4}-{uuid-part5}-{timestamp}-{expiresAt}-{checksum}-{securityLevel}
            // UUID is in parts 2-6 (5 parts total), timestamp starts at index 7
            visitRequestId = parts.slice(2, 7).join('-');
            timestampIndex = 7;
          } else {
            // Handle other UUID formats - try to find timestamp by looking for numeric values
            console.log('QR code parts:', parts);
            
            // Look for the first numeric timestamp (should be around index 7-8)
            let foundTimestampIndex = -1;
            for (let i = 2; i < parts.length - 3; i++) {
              const part = parts[i];
              if (/^\d{13}$/.test(part)) { // 13-digit timestamp
                foundTimestampIndex = i;
                break;
              }
            }
            
            if (foundTimestampIndex === -1) {
              throw new Error('Could not find timestamp in QR code');
            }
            
            // UUID is everything between index 2 and the timestamp
            visitRequestId = parts.slice(2, foundTimestampIndex).join('-');
            timestampIndex = foundTimestampIndex;
          }

          return {
            version,
            visitRequestId,
            timestamp: parseInt(parts[timestampIndex]),
            expiresAt: parseInt(parts[timestampIndex + 1]),
            checksum: parts[timestampIndex + 2],
            securityLevel: parts[timestampIndex + 3] as 'standard' | 'high'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Invalid QR code format:', error);
      return null;
    }
  };

  // Validate QR code integrity and expiration
  const validateQRCode = (qrData: QRCodeData): { valid: boolean; reason?: string } => {
    const now = Date.now();

    // Check expiration
    if (now > qrData.expiresAt) {
      return { valid: false, reason: 'QR code has expired' };
    }

    // Validate checksum for v2.0 codes
    if (qrData.version === '2.0' && qrData.checksum) {
      const baseData = `${qrData.visitRequestId}-${qrData.timestamp}-${qrData.expiresAt}`;
      const expectedChecksum = generateChecksum(baseData);
      
      if (qrData.checksum !== expectedChecksum) {
        return { valid: false, reason: 'QR code integrity check failed' };
      }
    }

    // Check if QR code is too old (beyond reasonable time window)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (now - qrData.timestamp > maxAge) {
      return { valid: false, reason: 'QR code is too old' };
    }

    return { valid: true };
  };

  const generateQRCode = async (visitRequestId: string, securityLevel: 'standard' | 'high' = 'standard'): Promise<string | null> => {
    setLoading(true);
    try {
      // Create enhanced QR code data
      const qrData = createQRCodeData(visitRequestId, securityLevel);
      const qrCodeString = encodeQRData(qrData);
      
      // Update the visit request with the QR code
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          qr_code: qrCodeString,
          updated_at: new Date().toISOString()
        })
        .eq('id', visitRequestId);

      if (error) throw error;

      toast({
        title: 'QR Code Generated',
        description: `Digital pass created with ${securityLevel} security level`,
        variant: 'default'
      });

      return qrCodeString;
    } catch (error: any) {
      console.error('QR generation failed:', error);
      toast({
        title: 'Failed to generate QR code',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const scanQRCode = async (qrCodeString: string, action: 'check_in' | 'check_out', scannedBy?: string): Promise<ScanResult> => {
    setLoading(true);
    try {
      // Decode QR code
      const qrData = decodeQRData(qrCodeString);
      if (!qrData) {
        throw new Error('Invalid QR code format. Please ensure you are scanning a valid digital visit pass.');
      }

      // Validate QR code
      const validation = validateQRCode(qrData);
      if (!validation.valid) {
        throw new Error(validation.reason || 'QR code validation failed');
      }

      // Fetch visit request with enhanced data
      const { data: visitRequest, error: fetchError } = await supabase
        .from('visit_requests')
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(full_name, email, phone),
          host:profiles!visit_requests_host_id_fkey(full_name, email, company)
        `)
        .eq('id', qrData.visitRequestId)
        .single();

      if (fetchError) {
        console.error('Database fetch failed during visit verification:', fetchError);
        throw new Error('Failed to verify visit request. Please contact support.');
      }

      if (!visitRequest) {
        throw new Error('Visit request not found. This QR code may be invalid or deleted.');
      }

      // Verify QR code matches the one in database (for v2.0 codes)
      if (qrData.version === '2.0' && visitRequest.qr_code !== qrCodeString) {
        throw new Error('QR code mismatch. This may be a counterfeit or outdated code.');
      }

      // Enhanced status validation
      const validStatuses = action === 'check_in' 
        ? ['approved'] 
        : ['checked_in'];

      if (!validStatuses.includes(visitRequest.status)) {
        const statusMessage = action === 'check_in' 
          ? 'Visit must be approved before check-in'
          : 'Visitor must be checked in before check-out';
        throw new Error(`${statusMessage}. Current status: ${visitRequest.status}`);
      }

      // Time window validation
      const visitDate = new Date(visitRequest.visit_date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const visitDay = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());

      if (visitDay.getTime() !== today.getTime()) {
        throw new Error(`This visit pass is only valid for ${visitDate.toLocaleDateString()}. Today is ${now.toLocaleDateString()}.`);
      }

      // Update visit status
      const newStatus = action === 'check_in' ? 'checked_in' : 'checked_out';
      
      const { error: updateError } = await supabase
        .from('visit_requests')
        .update({ 
          status: newStatus
        })
        .eq('id', qrData.visitRequestId);

      if (updateError) {
        console.error('Status update failed during QR processing:', updateError);
        throw new Error('Failed to update visit status. Please try again.');
      }

      // Enhanced logging with more details
      const { error: logError } = await supabase
        .from('visit_logs')
        .insert({
          visit_request_id: qrData.visitRequestId,
          action: action,
          scanned_by: scannedBy,
          timestamp: new Date().toISOString(),
          qr_version: qrData.version,
          security_level: qrData.securityLevel,
          scanner_notes: `QR v${qrData.version} scan successful`
        });

      if (logError) {
        console.error('Logging failed during QR processing (operation continues):', logError);
        // Don't fail the operation for logging errors
      }

      // Send host notification for check-in/check-out
      try {
        const { sendHostNotification } = await import('./useEmailService');
        
        const notificationType = action === 'check_in' ? 'visitor_checkin' : 'visitor_checkout';
        
        await sendHostNotification(visitRequest.host.email, {
          type: notificationType,
          visitorName: visitRequest.visitor.full_name,
          hostName: visitRequest.host.full_name,
          company: visitRequest.host.company || 'Company',
          visitDate: visitRequest.visit_date,
          startTime: visitRequest.start_time,
          endTime: visitRequest.end_time,
          purpose: visitRequest.purpose,
          zone: 'Main Building',
          message: action === 'check_in' 
            ? `${visitRequest.visitor.full_name} has checked in for their visit.`
            : `${visitRequest.visitor.full_name} has checked out.`,
        });
      } catch (emailError) {
        console.error('Email notification failed during QR processing (operation continues):', emailError);
        // Don't fail the check-in/out if email fails
      }

      // Fetch authorized zones for this visit request
      let authorizedZones = [];
      if (action === 'check_in') {
        try {
          const { data: zoneData, error: zoneError } = await supabase
            .from('zone_access')
            .select(`
              id,
              zone_id,
              granted_at,
              zone:zones(
                id,
                name,
                description,
                location,
                floor,
                building,
                access_level,
                requires_escort,
                is_active
              )
            `)
            .eq('visit_request_id', qrData.visitRequestId)
            .eq('zone.is_active', true);

          if (!zoneError && zoneData) {
            authorizedZones = zoneData;
          }
        } catch (zoneError) {
          console.error('Zone fetching failed during QR processing (operation continues):', zoneError);
          // Don't fail the check-in if zone fetching fails
        }
      }

      const successMessage = action === 'check_in' 
        ? `${visitRequest.visitor.full_name} successfully checked in`
        : `${visitRequest.visitor.full_name} successfully checked out`;

      toast({
        title: `${action.replace('_', ' ')} Successful`,
        description: successMessage,
        variant: 'default'
      });

      return { 
        success: true, 
        visitRequest,
        authorizedZones,
        message: successMessage
      };

    } catch (error: any) {
      console.error('QR scan operation failed:', error);
      const errorMessage = error.message || 'An unexpected error occurred during scanning';
      
      toast({
        title: `${action.replace('_', ' ')} Failed`,
        description: errorMessage,
        variant: 'destructive'
      });

      return { 
        success: false, 
        error: errorMessage,
        message: `${action.replace('_', ' ')} failed`
      };
    } finally {
      setLoading(false);
    }
  };

  // Regenerate QR code with new security level
  const regenerateQRCode = async (visitRequestId: string, newSecurityLevel: 'standard' | 'high' = 'standard'): Promise<string | null> => {
    return generateQRCode(visitRequestId, newSecurityLevel);
  };

  // Check QR code validity without scanning
  const validateQRCodeString = (qrCodeString: string): { valid: boolean; data?: QRCodeData; reason?: string } => {
    const qrData = decodeQRData(qrCodeString);
    if (!qrData) {
      return { valid: false, reason: 'Invalid QR code format' };
    }

    const validation = validateQRCode(qrData);
    return { valid: validation.valid, data: qrData, reason: validation.reason };
  };

  // Alias for backward compatibility
  const createQRCode = generateQRCode;

  return {
    generateQRCode,
    createQRCode,
    scanQRCode,
    regenerateQRCode,
    validateQRCodeString,
    loading
  };
}