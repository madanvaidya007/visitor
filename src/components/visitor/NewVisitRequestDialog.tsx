import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, MapPin, Users, AlertCircle, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { format, addDays, isBefore, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileUpload, UploadedFile } from '@/components/ui/FileUpload';

interface Host {
  id: string;
  full_name: string;
  company?: string;
  is_busy?: boolean;
  busy_message?: string;
  busy_until?: string;
}

interface NewVisitRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewVisitRequestDialog({ open, onOpenChange, onSuccess }: NewVisitRequestDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    host_id: '',
    purpose: '',
    start_time: '',
    end_time: '',
    notes: '',
    uploaded_files: [] as UploadedFile[]
  });

  useEffect(() => {
    if (open) {
      fetchHosts();
      // Reset form when dialog opens
      setFormData({
        host_id: '',
        purpose: '',
        start_time: '',
        end_time: '',
        notes: '',
        uploaded_files: []
      });
      setSelectedDate(undefined);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  const fetchHosts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company, is_busy, busy_message, busy_until')
        .eq('role', 'host')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setHosts(data || []);
    } catch (error) {
      console.error('Error fetching hosts:', error);
      toast({
        title: "Error",
        description: "Failed to load hosts. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getHostBusyStatus = (host: Host) => {
    if (!host.is_busy) return null;
    
    const now = new Date();
    const busyUntil = host.busy_until ? parseISO(host.busy_until) : null;
    const isExpired = busyUntil && busyUntil < now;
    
    if (isExpired) return null;
    
    return {
      isBusy: true,
      message: host.busy_message || 'Currently unavailable',
      until: busyUntil
    };
  };

  const selectedHost = hosts.find(h => h.id === formData.host_id);
  const selectedHostBusyStatus = selectedHost ? getHostBusyStatus(selectedHost) : null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.host_id) {
      newErrors.host_id = 'Please select a host';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    } else if (formData.purpose.trim().length < 3) {
      newErrors.purpose = 'Purpose must be at least 3 characters';
    }

    if (!selectedDate) {
      newErrors.date = 'Please select a visit date';
    } else if (isBefore(selectedDate, new Date())) {
      newErrors.date = 'Visit date cannot be in the past';
    } else if (isAfter(selectedDate, addDays(new Date(), 90))) {
      newErrors.date = 'Visit date cannot be more than 90 days in advance';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }

    if (formData.start_time && formData.end_time) {
      const startHour = parseInt(formData.start_time.split(':')[0]);
      const startMinute = parseInt(formData.start_time.split(':')[1]);
      const endHour = parseInt(formData.end_time.split(':')[0]);
      const endMinute = parseInt(formData.end_time.split(':')[1]);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      if (endTime <= startTime) {
        newErrors.end_time = 'End time must be after start time';
      }
      
      if (endTime - startTime < 30) {
        newErrors.end_time = 'Visit must be at least 30 minutes long';
      }
      
      if (endTime - startTime > 480) { // 8 hours
        newErrors.end_time = 'Visit cannot exceed 8 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('visit_requests')
        .insert({
          visitor_id: profile.id,
          host_id: formData.host_id,
          purpose: formData.purpose,
          visit_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: formData.start_time,
          end_time: formData.end_time,
          notes: formData.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Visit request submitted successfully. You'll be notified when the host responds."
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating visit request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit visit request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Visit Request</DialogTitle>
          <DialogDescription>
            Submit a request to visit a host. They will be notified and can approve or reject your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the following errors:
                <ul className="mt-2 list-disc list-inside">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Host Selection */}
          <div className="space-y-2">
            <Label htmlFor="host">Select Host *</Label>
            <Select 
              value={formData.host_id} 
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, host_id: value }));
                if (errors.host_id) {
                  setErrors(prev => ({ ...prev, host_id: '' }));
                }
              }}
            >
              <SelectTrigger className={errors.host_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Choose a host" />
              </SelectTrigger>
              <SelectContent>
                {hosts.length === 0 ? (
                  <SelectItem value="no-hosts" disabled>
                    No hosts available
                  </SelectItem>
                ) : (
                  hosts.map((host) => {
                    const busyStatus = getHostBusyStatus(host);
                    return (
                      <SelectItem key={host.id} value={host.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>{host.full_name}</span>
                            {host.company && <span className="text-muted-foreground">({host.company})</span>}
                          </div>
                          {busyStatus && (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs ml-2">
                              Busy
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {errors.host_id && <p className="text-sm text-red-500">{errors.host_id}</p>}
            
            {/* Busy Host Warning */}
            {selectedHostBusyStatus && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="space-y-1">
                    <p className="font-medium">Host is currently busy</p>
                    <p className="text-sm">{selectedHostBusyStatus.message}</p>
                    {selectedHostBusyStatus.until && (
                      <p className="text-sm">
                        Until: {format(selectedHostBusyStatus.until, 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                    <p className="text-sm">Your request can still be submitted, but the host may need to reschedule.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Visit *</Label>
            <Input
              id="purpose"
              placeholder="Meeting, Interview, Consultation, etc."
              value={formData.purpose}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, purpose: e.target.value }));
                if (errors.purpose) {
                  setErrors(prev => ({ ...prev, purpose: '' }));
                }
              }}
              className={errors.purpose ? 'border-red-500' : ''}
              required
            />
            {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Visit Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground",
                    errors.date && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (errors.date) {
                      setErrors(prev => ({ ...prev, date: '' }));
                    }
                  }}
                  disabled={(date) => 
                    isBefore(date, new Date()) || 
                    date.getDay() === 0 || 
                    date.getDay() === 6 ||
                    isAfter(date, addDays(new Date(), 90))
                  }
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Select 
                value={formData.start_time} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, start_time: value }));
                  if (errors.start_time) {
                    setErrors(prev => ({ ...prev, start_time: '' }));
                  }
                }}
                required
              >
                <SelectTrigger className={errors.start_time ? 'border-red-500' : ''}>
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.start_time && <p className="text-sm text-red-500">{errors.start_time}</p>}
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Select 
                value={formData.end_time} 
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, end_time: value }));
                  if (errors.end_time) {
                    setErrors(prev => ({ ...prev, end_time: '' }));
                  }
                }}
                required
              >
                <SelectTrigger className={errors.end_time ? 'border-red-500' : ''}>
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.end_time && <p className="text-sm text-red-500">{errors.end_time}</p>}
            </div>
          </div>

          {/* Photo and Document Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Photos & Documents
            </Label>
            <p className="text-sm text-muted-foreground">
              Upload your photo and any required documents (ID, insurance, etc.)
            </p>
            <FileUpload
              accept="image/*,.pdf,.doc,.docx"
              maxSize={10}
              maxFiles={5}
              allowedTypes={['image', 'document', 'pdf']}
              onFilesChange={(files) => {
                setFormData(prev => ({ ...prev, uploaded_files: files }));
              }}
              showPreview={true}
              className="border-dashed border-2 border-gray-300 rounded-lg p-4"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information for the host..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}