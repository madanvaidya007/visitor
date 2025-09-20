import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Host {
  id: string;
  full_name: string;
  company?: string;
  email: string;
}

interface NewVisitRequestDialogProps {
  onRequestCreated: () => void;
}

export function NewVisitRequestDialog({ onRequestCreated }: NewVisitRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [date, setDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    host_id: '',
    purpose: '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchHosts();
    }
  }, [open]);

  const fetchHosts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company, email')
        .eq('role', 'host')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setHosts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading hosts',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('visit_requests')
        .insert({
          visitor_id: profile.id,
          host_id: formData.host_id,
          purpose: formData.purpose,
          visit_date: format(date, 'yyyy-MM-dd'),
          start_time: formData.start_time,
          end_time: formData.end_time,
          notes: formData.notes,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Visit request submitted',
        description: 'Your visit request has been sent to the host for approval.'
      });

      // Reset form
      setFormData({
        host_id: '',
        purpose: '',
        start_time: '',
        end_time: '',
        notes: ''
      });
      setDate(undefined);
      setOpen(false);
      onRequestCreated();

    } catch (error: any) {
      toast({
        title: 'Error submitting request',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00'
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Visit Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Visit Request</DialogTitle>
          <DialogDescription>
            Fill out the details for your visit request
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Host Selection */}
          <div className="space-y-2">
            <Label htmlFor="host">Host *</Label>
            <Select value={formData.host_id} onValueChange={(value) => setFormData({...formData, host_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select your host" />
              </SelectTrigger>
              <SelectContent>
                {hosts.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{host.full_name}</span>
                      {host.company && <span className="text-muted-foreground">• {host.company}</span>}
                    </div>
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
              placeholder="e.g., Business meeting, Interview, Delivery"
              value={formData.purpose}
              onChange={(e) => setFormData({...formData, purpose: e.target.value})}
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
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Select value={formData.start_time} onValueChange={(value) => setFormData({...formData, start_time: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {time}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Select value={formData.end_time} onValueChange={(value) => setFormData({...formData, end_time: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {time}
                      </div>
                    </SelectItem>
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
              placeholder="Any special requirements or additional information..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.host_id || !formData.purpose || !date || !formData.start_time || !formData.end_time}
              className="flex-1"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}