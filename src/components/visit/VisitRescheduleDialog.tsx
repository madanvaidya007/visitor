import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { toast } from 'sonner';

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  visitor_id: string;
  reschedule_count?: number;
  visitor: {
    full_name: string;
    company?: string;
    phone?: string;
    email?: string;
  };
}

interface VisitRescheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visitRequest: VisitRequest | null;
  onRescheduleSuccess: () => void;
}

const RESCHEDULE_REASONS = [
  'Host schedule conflict',
  'Meeting room unavailable',
  'Emergency situation',
  'Technical issues',
  'Visitor request',
  'Other'
];

export function VisitRescheduleDialog({ 
  isOpen, 
  onClose, 
  visitRequest, 
  onRescheduleSuccess 
}: VisitRescheduleDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleReschedule = async () => {
    if (!visitRequest || !profile) return;

    if (!newDate || !newStartTime || !newEndTime || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate that new date is not in the past
    const newDateTime = new Date(`${newDate}T${newStartTime}`);
    if (isBefore(newDateTime, new Date())) {
      toast.error('Cannot reschedule to a past date/time');
      return;
    }

    // Validate that end time is after start time
    const startDateTime = new Date(`${newDate}T${newStartTime}`);
    const endDateTime = new Date(`${newDate}T${newEndTime}`);
    if (!isBefore(startDateTime, endDateTime)) {
      toast.error('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      const finalReason = reason === 'Other' ? customReason : reason;
      
      // Call the reschedule_visit function
      const { data, error } = await supabase.rpc('reschedule_visit', {
        p_visit_request_id: visitRequest.id,
        p_new_visit_date: newDate,
        p_new_start_time: newStartTime,
        p_new_end_time: newEndTime,
        p_reason: finalReason,
        p_rescheduled_by: profile.id
      });

      if (error) throw error;

      toast.success('Visit rescheduled successfully');
      onRescheduleSuccess();
      onClose();
      
      // Reset form
      setNewDate('');
      setNewStartTime('');
      setNewEndTime('');
      setReason('');
      setCustomReason('');
    } catch (error) {
      console.error('Error rescheduling visit:', error);
      toast.error('Failed to reschedule visit');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    return format(new Date(), 'yyyy-MM-dd');
  };

  const getMaxDate = () => {
    return format(addDays(new Date(), 90), 'yyyy-MM-dd'); // Allow scheduling up to 3 months ahead
  };

  if (!visitRequest) return null;

  const originalDate = parseISO(visitRequest.visit_date);
  const rescheduleCount = visitRequest.reschedule_count || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reschedule Visit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Visit Details */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Current Visit Details</h4>
                  {rescheduleCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Rescheduled {rescheduleCount} time{rescheduleCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{visitRequest.visitor.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{format(originalDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{visitRequest.start_time} - {visitRequest.end_time}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Purpose:</strong> {visitRequest.purpose}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reschedule Warning */}
          {rescheduleCount >= 2 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Multiple Reschedules</p>
                <p className="text-yellow-700">
                  This visit has been rescheduled {rescheduleCount} times. Consider if this meeting is still necessary.
                </p>
              </div>
            </div>
          )}

          {/* New Date and Time */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">New Date *</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-start-time">Start Time *</Label>
                <Input
                  id="new-start-time"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-end-time">End Time *</Label>
                <Input
                  id="new-end-time"
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Reschedule Reason */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rescheduling *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {RESCHEDULE_REASONS.map((reasonOption) => (
                    <SelectItem key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reason === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Please specify *</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Please provide details about the reason for rescheduling..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={loading || !newDate || !newStartTime || !newEndTime || !reason || (reason === 'Other' && !customReason)}
              className="flex-1"
            >
              {loading ? (
                'Rescheduling...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reschedule Visit
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}