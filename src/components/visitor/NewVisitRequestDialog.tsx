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
import { CalendarIcon, Clock, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Host {
  id: string;
  full_name: string;
  company?: string;
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
  
  const [formData, setFormData] = useState({
    host_id: '',
    purpose: '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchHosts();
    }
  }, [open]);

  const fetchHosts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !selectedDate) return;

    setLoading(true);
    
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

      // Reset form
      setFormData({
        host_id: '',
        purpose: '',
        start_time: '',
        end_time: '',
        notes: ''
      });
      setSelectedDate(undefined);
      
      onSuccess();
    } catch (error: any) {
      console.error('Error creating visit request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit visit request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Visit Request</DialogTitle>
          <DialogDescription>
            Submit a request to visit a host. They will be notified and can approve or reject your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Host Selection */}
          <div className="space-y-2">
            <Label htmlFor="host">Select Host *</Label>
            <Select 
              value={formData.host_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, host_id: value }))}
              required
            >
              <SelectTrigger>
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Choose a host to visit" />
              </SelectTrigger>
              <SelectContent>
                {hosts.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    {host.full_name}
                    {host.company && <span className="text-muted-foreground ml-2">({host.company})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Visit *</Label>
            <Input
              id="purpose"
              placeholder="Meeting, Interview, Consultation, etc."
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              required
            />
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
                    !selectedDate && "text-muted-foreground"
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
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Select 
                value={formData.start_time} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, start_time: value }))}
                required
              >
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Select 
                value={formData.end_time} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, end_time: value }))}
                required
              >
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedDate || !formData.host_id || !formData.purpose || !formData.start_time || !formData.end_time}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}