import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

interface QuickRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickRegistrationDialog({ open, onOpenChange, onSuccess }: QuickRegistrationDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    phone: '',
    email: '',
    purpose: '',
    visiting_person: '',
    id_type: '',
    id_number: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For quick registration, we create a temporary user/visitor
      const tempEmail = `temp_${Date.now()}@visitor.temp`;
      
      // Create a temporary user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: `temp_${Date.now()}`,
        options: {
          data: {
            full_name: formData.full_name,
            company: formData.company,
            phone: formData.phone,
            role: 'visitor'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            full_name: formData.full_name,
            email: formData.email || tempEmail,
            phone: formData.phone,
            company: formData.company,
            role: 'visitor'
          });

        if (profileError) throw profileError;

        // Find host by name (simplified - in real app, you'd have better host selection)
        const { data: hostData } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'host')
          .ilike('full_name', `%${formData.visiting_person}%`)
          .limit(1)
          .single();

        if (hostData) {
          // Create visit request for today
          const today = new Date().toISOString().split('T')[0];
          const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
          const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false });

          const { error: visitError } = await supabase
            .from('visit_requests')
            .insert({
              visitor_id: authData.user.id,
              host_id: hostData.id,
              purpose: formData.purpose,
              visit_date: today,
              start_time: currentTime,
              end_time: endTime,
              status: 'approved' // Auto-approve walk-ins
            });

          if (visitError) throw visitError;
        }

        toast({
          title: 'Visitor registered successfully',
          description: 'Walk-in visitor has been registered and approved.'
        });

        onSuccess();
        onOpenChange(false);
        
        // Reset form
        setFormData({
          full_name: '',
          company: '',
          phone: '',
          email: '',
          purpose: '',
          visiting_person: '',
          id_type: '',
          id_number: ''
        });
      }
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Quick Visitor Registration</DialogTitle>
          <DialogDescription>
            Register walk-in visitors quickly
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="id_type">ID Type</Label>
              <Select onValueChange={(value) => handleInputChange('id_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver_license">Driver's License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="id_number">ID Number</Label>
              <Input
                id="id_number"
                value={formData.id_number}
                onChange={(e) => handleInputChange('id_number', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="visiting_person">Person to Visit</Label>
            <Input
              id="visiting_person"
              value={formData.visiting_person}
              onChange={(e) => handleInputChange('visiting_person', e.target.value)}
              placeholder="Host name"
            />
          </div>

          <div>
            <Label htmlFor="purpose">Purpose of Visit *</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="Brief description of visit purpose"
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Visitor'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}