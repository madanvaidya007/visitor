import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface VisitorRegistration {
  id: string;
  full_name: string;
  company: string;
  phone: string;
  email: string;
  purpose: string;
  visiting_person: string;
  id_type: string;
  id_number: string;
  status: 'pending' | 'approved' | 'checked_in' | 'checked_out';
  created_at: string;
}

interface Host {
  id: string;
  full_name: string;
  email: string;
}

export default function QuickRegistration() {
  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    phone: '',
    email: '',
    purpose: '',
    visiting_person: '',
    host_id: '',
    id_type: '',
    id_number: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [recentRegistrations, setRecentRegistrations] = useState<VisitorRegistration[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentRegistrations();
    fetchHosts();
  }, []);

  const fetchHosts = async () => {
    setHostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'host')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setHosts(data || []);
    } catch (error: any) {
      console.error('Error fetching hosts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hosts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setHostsLoading(false);
    }
  };

  const fetchRecentRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching recent registrations:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      company: '',
      phone: '',
      email: '',
      purpose: '',
      visiting_person: '',
      host_id: '',
      id_type: '',
      id_number: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use the selected host_id directly from the dropdown
      const hostId = formData.host_id;

      // Create visitor registration
      const visitData: any = {
        visitor_name: formData.full_name,
        visitor_email: formData.email,
        visitor_phone: formData.phone,
        visitor_company: formData.company,
        purpose: formData.purpose,
        id_type: formData.id_type,
        id_number: formData.id_number,
        status: 'approved', // Quick registration auto-approves
        visit_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        end_time: '18:00' // Default end time
      };

      // Add host_id if selected
      if (hostId) {
        visitData.host_id = hostId;
      }

      const { data, error } = await supabase
        .from('visit_requests')
        .insert([visitData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Registration Successful',
        description: `${formData.full_name} has been registered successfully.`,
      });

      resetForm();
      fetchRecentRegistrations();
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register visitor. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'checked_in':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quick Registration</h1>
          <p className="text-muted-foreground">
            Register visitors quickly for immediate access
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              New Visitor Registration
            </CardTitle>
            <CardDescription>
              Fill out the form below to register a new visitor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visiting_person">Person to Visit *</Label>
                <Select 
                  value={formData.host_id} 
                  onValueChange={(value) => {
                    const selectedHost = hosts.find(host => host.id === value);
                    handleInputChange('host_id', value);
                    handleInputChange('visiting_person', selectedHost?.full_name || '');
                  }}
                  disabled={hostsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={hostsLoading ? "Loading hosts..." : "Select a host"} />
                  </SelectTrigger>
                  <SelectContent>
                    {hosts.map((host) => (
                      <SelectItem key={host.id} value={host.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{host.full_name}</span>
                          <span className="text-sm text-muted-foreground">{host.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit *</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                  placeholder="Enter purpose of visit"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id_type">ID Type *</Label>
                  <Select value={formData.id_type} onValueChange={(value) => handleInputChange('id_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_number">ID Number *</Label>
                  <Input
                    id="id_number"
                    value={formData.id_number}
                    onChange={(e) => handleInputChange('id_number', e.target.value)}
                    placeholder="Enter ID number"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register Visitor
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>
              Latest visitor registrations from today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRegistrations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No recent registrations found
                </p>
              ) : (
                recentRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{registration.visitor_name}</h4>
                        <Badge className={getStatusColor(registration.status)}>
                          {getStatusIcon(registration.status)}
                          <span className="ml-1 capitalize">{registration.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {registration.visitor_company && `${registration.visitor_company} • `}
                        Visiting: {registration.host_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(registration.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}