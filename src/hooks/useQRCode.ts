import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useQRCode() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateQRCode = async (visitRequestId: string): Promise<string | null> => {
    setLoading(true);
    try {
      // Create a unique QR code string with visit request ID and timestamp
      const qrCodeData = `VMS-${visitRequestId}-${Date.now()}`;
      
      // Update the visit request with the QR code
      const { error } = await supabase
        .from('visit_requests')
        .update({ qr_code: qrCodeData })
        .eq('id', visitRequestId);

      if (error) throw error;

      return qrCodeData;
    } catch (error: any) {
      toast({
        title: 'Failed to generate QR code',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const scanQRCode = async (qrCode: string, action: 'check_in' | 'check_out', scannedBy?: string) => {
    setLoading(true);
    try {
      // Extract visit request ID from QR code
      const parts = qrCode.split('-');
      if (parts.length < 2 || parts[0] !== 'VMS') {
        throw new Error('Invalid QR code format');
      }
      
      const visitRequestId = parts[1];

      // Verify the visit request exists and is approved
      const { data: visitRequest, error: fetchError } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('id', visitRequestId)
        .eq('qr_code', qrCode)
        .single();

      if (fetchError) throw fetchError;
      if (!visitRequest) throw new Error('Invalid or expired QR code');

      if (visitRequest.status !== 'approved' && visitRequest.status !== 'checked_in') {
        throw new Error('Visit request is not approved for entry');
      }

      // Update visit status
      const newStatus = action === 'check_in' ? 'checked_in' : 'checked_out';
      const { error: updateError } = await supabase
        .from('visit_requests')
        .update({ status: newStatus })
        .eq('id', visitRequestId);

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase
        .from('visit_logs')
        .insert({
          visit_request_id: visitRequestId,
          action: action,
          scanned_by: scannedBy,
          timestamp: new Date().toISOString()
        });

      if (logError) throw logError;

      toast({
        title: `Successfully ${action.replace('_', ' ')}`,
        description: `Visitor has been ${action.replace('_', ' ')}ed.`
      });

      return { success: true, visitRequest };
    } catch (error: any) {
      toast({
        title: `${action.replace('_', ' ')} failed`,
        description: error.message,
        variant: 'destructive'
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    generateQRCode,
    scanQRCode,
    loading
  };
}