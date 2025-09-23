import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Users,
  FileText,
  History,
  Star,
  RefreshCw,
  Copy,
  ExternalLink,
  QrCode,
  MessageSquare,
  Bell,
  Camera
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhotoCapture } from '@/components/visitor/PhotoCapture';
import { zoneSecurityService } from '@/services/zoneSecurityService';
import { SecurityZone } from '@/types/zoneTypes';

interface Visitor {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  photo_url?: string;
  created_at: string;
  is_active: boolean;
  last_visit_date?: string;
  total_visits?: number;
}

interface VisitRequest {
  id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out' | 'cancelled';
  notes?: string;
  qr_code?: string;
  created_at: string;
  visitor: Visitor;
}

interface InvitationForm {
  visitor_id: string;
  visitor_email: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_company: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  notes: string;
  send_notification: boolean;
  auto_approve: boolean;
  zone_id: string;
}

interface NewVisitorForm {
  full_name: string;
  email: string;
  phone: string;
  company: string;
  photo_url?: string;
}

export default function InviteVisitor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [recentInvitations, setRecentInvitations] = useState<VisitRequest[]>([]);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNewVisitorDialog, setShowNewVisitorDialog] = useState(false);
  const [showInvitationPreview, setShowInvitationPreview] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  
  const [invitationForm, setInvitationForm] = useState<InvitationForm>({
    visitor_id: '',
    visitor_email: '',
    visitor_name: '',
    visitor_phone: '',
    visitor_company: '',
    purpose: '',
    visit_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    notes: '',
    send_notification: true,
    auto_approve: false,
    zone_id: ''
  });

  const [newVisitorForm, setNewVisitorForm] = useState<NewVisitorForm>({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    photo_url: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchVisitors();
    } else {
      setVisitors([]);
    }
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchRecentInvitations(),
        fetchZones()
      ]);
    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const fetchZones = async () => {
    try {
      const zonesData = await zoneSecurityService.getZones();
      setZones(zonesData);
    } catch (error: any) {
      console.error('Error fetching zones:', error);
      toast({
        title: 'Error loading zones',
        description: 'Failed to load security zones',
        variant: 'destructive'
      });
    }
  };

  // Handle photo capture
  const handlePhotoCapture = (photoData: string, faceData?: any) => {
    console.log('📸 Photo captured for visitor:', newVisitorForm.full_name);
    console.log('🔍 Face data processed:', faceData ? 'Yes' : 'No');
    
    setNewVisitorForm(prev => ({ ...prev, photo_url: photoData }));
    setShowPhotoCapture(false);
    
    toast({
      title: 'Photo captured successfully',
      description: faceData 
        ? 'Photo captured and face recognition profile created.'
        : 'Photo captured. Face recognition data will be processed.'
    });
  };

  // Cancel photo capture
  const cancelPhotoCapture = () => {
    setShowPhotoCapture(false);
  };

  const searchVisitors = async () => {
    if (!profile || searchTerm.length < 2) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`)
        .neq('id', profile.id)
        .eq('role', 'visitor')
        .limit(10);

      if (error) throw error;
      setVisitors(data || []);
    } catch (error: any) {
      toast({
        title: 'Error searching visitors',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentInvitations = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('visit_requests')
      .select(`
        *,
        visitor:profiles!visit_requests_visitor_id_fkey(
          id,
          full_name,
          email,
          phone,
          company,
          photo_url,
          created_at,
          is_active
        )
      `)
      .eq('host_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    setRecentInvitations(data || []);
  };

  const selectVisitor = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setInvitationForm(prev => ({
      ...prev,
      visitor_id: visitor.id,
      visitor_email: visitor.email,
      visitor_name: visitor.full_name,
      visitor_phone: visitor.phone || '',
      visitor_company: visitor.company || ''
    }));
    setSearchTerm('');
    setVisitors([]);
  };

  const createNewVisitor = async () => {
    setSubmitting(true);
    try {
      // Validate form
      const newErrors: Record<string, string> = {};
      if (!newVisitorForm.full_name) newErrors.full_name = 'Name is required';
      if (!newVisitorForm.email) newErrors.email = 'Email is required';
      if (!/\S+@\S+\.\S+/.test(newVisitorForm.email)) newErrors.email = 'Invalid email format';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Check if visitor already exists
      const { data: existingVisitor } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newVisitorForm.email)
        .single();

      if (existingVisitor) {
        toast({
          title: 'Visitor already exists',
          description: 'A visitor with this email already exists in the system.',
          variant: 'destructive'
        });
        return;
      }

      // Create new visitor profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newVisitorForm.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
          data: {
            full_name: newVisitorForm.full_name,
            phone: newVisitorForm.phone,
            company: newVisitorForm.company,
            role: 'visitor'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const newVisitor: Visitor = {
          id: authData.user.id,
          full_name: newVisitorForm.full_name,
          email: newVisitorForm.email,
          phone: newVisitorForm.phone,
          company: newVisitorForm.company,
          photo_url: newVisitorForm.photo_url,
          created_at: new Date().toISOString(),
          is_active: true
        };

        selectVisitor(newVisitor);
        setShowNewVisitorDialog(false);
        setNewVisitorForm({ full_name: '', email: '', phone: '', company: '', photo_url: '' });
        setErrors({});

        toast({
          title: 'Visitor created successfully',
          description: 'New visitor has been added to the system with face recognition profile.'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error creating visitor',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sendInvitation = async () => {
    setSubmitting(true);
    try {
      // Validate form
      const newErrors: Record<string, string> = {};
      if (!invitationForm.visitor_id && !invitationForm.visitor_email) {
        newErrors.visitor = 'Please select a visitor or enter email';
      }
      if (!invitationForm.purpose) newErrors.purpose = 'Purpose is required';
      if (!invitationForm.zone_id) newErrors.zone_id = 'Destination zone is required';
      if (!invitationForm.visit_date) newErrors.visit_date = 'Visit date is required';
      if (!invitationForm.start_time) newErrors.start_time = 'Start time is required';
      if (!invitationForm.end_time) newErrors.end_time = 'End time is required';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Create visit request
      const visitData = {
        host_id: profile?.id,
        visitor_id: invitationForm.visitor_id || null,
        purpose: invitationForm.purpose,
        visit_date: invitationForm.visit_date,
        start_time: invitationForm.start_time,
        end_time: invitationForm.end_time,
        notes: invitationForm.notes,
        status: (invitationForm.auto_approve ? 'approved' : 'pending') as 'pending' | 'approved',
        zone_id: invitationForm.zone_id
      };

      const { data, error } = await supabase
        .from('visit_requests')
        .insert(visitData)
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(
            id,
            full_name,
            email,
            phone,
            company,
            photo_url,
            created_at,
            is_active
          )
        `)
        .single();

      if (error) throw error;

      // Send notification if requested
      if (invitationForm.send_notification) {
        // In a real app, you would send email/SMS here
        console.log('Sending invitation notification to:', invitationForm.visitor_email);
      }

      toast({
        title: 'Invitation sent successfully',
        description: `Visit request has been ${invitationForm.auto_approve ? 'created and approved' : 'sent for approval'}.`
      });

      // Reset form
      setInvitationForm({
        visitor_id: '',
        visitor_email: '',
        visitor_name: '',
        visitor_phone: '',
        visitor_company: '',
        purpose: '',
        visit_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        send_notification: true,
        auto_approve: false,
        zone_id: ''
      });
      setSelectedVisitor(null);
      setErrors({});

      // Refresh recent invitations
      await fetchRecentInvitations();
    } catch (error: any) {
      toast({
        title: 'Error sending invitation',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'checked_in': return <User className="h-4 w-4 text-blue-500" />;
      case 'checked_out': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'checked_out': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invite Visitor</h1>
          <p className="text-muted-foreground">Create visit requests and invite people to visit you</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invitation Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Invitation</CardTitle>
              <CardDescription>Send a visit request to someone you'd like to meet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visitor Selection */}
              <div className="space-y-4">
                <Label>Select or Add Visitor</Label>
                
                {selectedVisitor ? (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedVisitor.photo_url || ''} alt={selectedVisitor.full_name} />
                          <AvatarFallback>
                            {selectedVisitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{selectedVisitor.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{selectedVisitor.email}</p>
                          {selectedVisitor.company && (
                            <p className="text-sm text-muted-foreground">{selectedVisitor.company}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVisitor(null);
                          setInvitationForm(prev => ({
                            ...prev,
                            visitor_id: '',
                            visitor_email: '',
                            visitor_name: '',
                            visitor_phone: '',
                            visitor_company: ''
                          }));
                        }}
                        aria-label={`Change selected visitor from ${selectedVisitor.full_name}`}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for existing visitors by name, email, or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        aria-label="Search for existing visitors"
                        aria-describedby="search-help"
                      />
                      <div id="search-help" className="sr-only">
                        Type at least 2 characters to search for visitors by name, email, or company
                      </div>
                      {loading && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                      )}
                    </div>

                    {/* Search Results */}
                    {visitors.length > 0 && (
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {visitors.map((visitor) => (
                          <div
                            key={visitor.id}
                            className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectVisitor(visitor)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={visitor.photo_url || ''} alt={visitor.full_name} />
                                <AvatarFallback className="text-xs">
                                  {visitor.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{visitor.full_name}</p>
                                <p className="text-xs text-muted-foreground">{visitor.email}</p>
                                {visitor.company && (
                                  <p className="text-xs text-muted-foreground">{visitor.company}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1 border-t"></div>
                      <span className="text-sm text-muted-foreground">or</span>
                      <div className="flex-1 border-t"></div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShowNewVisitorDialog(true)}
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Visitor
                    </Button>
                  </div>
                )}
                {errors.visitor && <p className="text-sm text-red-500">{errors.visitor}</p>}
              </div>

              {/* Visit Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose of Visit *</Label>
                  <Input
                    id="purpose"
                    placeholder="e.g., Business meeting, Interview, Consultation"
                    value={invitationForm.purpose}
                    onChange={(e) => {
                      setInvitationForm(prev => ({ ...prev, purpose: e.target.value }));
                      if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' }));
                    }}
                    className={errors.purpose ? 'border-red-500' : ''}
                    aria-describedby={errors.purpose ? 'purpose-error' : undefined}
                    aria-invalid={!!errors.purpose}
                  />
                  {errors.purpose && <p id="purpose-error" className="text-sm text-red-500">{errors.purpose}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone">Destination Zone *</Label>
                  <Select
                    value={invitationForm.zone_id}
                    onValueChange={(value) => {
                      setInvitationForm(prev => ({ ...prev, zone_id: value }));
                      if (errors.zone_id) setErrors(prev => ({ ...prev, zone_id: '' }));
                    }}
                  >
                    <SelectTrigger className={errors.zone_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select destination zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{zone.name}</span>
                            {zone.description && (
                              <span className="text-xs text-muted-foreground">- {zone.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.zone_id && <p className="text-sm text-red-500">{errors.zone_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visit_date">Visit Date *</Label>
                  <Input
                    id="visit_date"
                    type="date"
                    value={invitationForm.visit_date}
                    onChange={(e) => {
                      setInvitationForm(prev => ({ ...prev, visit_date: e.target.value }));
                      if (errors.visit_date) setErrors(prev => ({ ...prev, visit_date: '' }));
                    }}
                    className={errors.visit_date ? 'border-red-500' : ''}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    aria-describedby={errors.visit_date ? 'visit-date-error' : undefined}
                    aria-invalid={!!errors.visit_date}
                  />
                  {errors.visit_date && <p id="visit-date-error" className="text-sm text-red-500">{errors.visit_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={invitationForm.start_time}
                    onChange={(e) => {
                      setInvitationForm(prev => ({ ...prev, start_time: e.target.value }));
                      if (errors.start_time) setErrors(prev => ({ ...prev, start_time: '' }));
                    }}
                    className={errors.start_time ? 'border-red-500' : ''}
                    aria-describedby={errors.start_time ? 'start-time-error' : undefined}
                    aria-invalid={!!errors.start_time}
                  />
                  {errors.start_time && <p id="start-time-error" className="text-sm text-red-500">{errors.start_time}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={invitationForm.end_time}
                    onChange={(e) => {
                      setInvitationForm(prev => ({ ...prev, end_time: e.target.value }));
                      if (errors.end_time) setErrors(prev => ({ ...prev, end_time: '' }));
                    }}
                    className={errors.end_time ? 'border-red-500' : ''}
                    aria-describedby={errors.end_time ? 'end-time-error' : undefined}
                    aria-invalid={!!errors.end_time}
                  />
                  {errors.end_time && <p id="end-time-error" className="text-sm text-red-500">{errors.end_time}</p>}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or additional information..."
                  value={invitationForm.notes}
                  onChange={(e) => setInvitationForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  aria-describedby="notes-help"
                />
                <div id="notes-help" className="sr-only">
                  Optional field for any additional information about the visit
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="send_notification"
                    checked={invitationForm.send_notification}
                    onChange={(e) => setInvitationForm(prev => ({ ...prev, send_notification: e.target.checked }))}
                    className="rounded"
                    aria-describedby="send-notification-help"
                  />
                  <Label htmlFor="send_notification" className="text-sm">
                    Send email notification to visitor
                  </Label>
                  <div id="send-notification-help" className="sr-only">
                    When checked, an email invitation will be sent to the visitor
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto_approve"
                    checked={invitationForm.auto_approve}
                    onChange={(e) => setInvitationForm(prev => ({ ...prev, auto_approve: e.target.checked }))}
                    className="rounded"
                    aria-describedby="auto-approve-help"
                  />
                  <Label htmlFor="auto_approve" className="text-sm">
                    Auto-approve this visit request
                  </Label>
                  <div id="auto-approve-help" className="sr-only">
                    When checked, the visit request will be automatically approved without manual review
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={sendInvitation}
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Invitations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Invitations</CardTitle>
              <CardDescription>Your latest visitor invitations</CardDescription>
            </CardHeader>
            <CardContent>
              {recentInvitations.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No invitations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentInvitations.slice(0, 5).map((invitation) => (
                    <div key={invitation.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{invitation.visitor.full_name}</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(invitation.status)}
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(invitation.status)}`}>
                            {invitation.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{invitation.purpose}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(invitation.visit_date), 'MMM dd')}</span>
                        <Clock className="h-3 w-3" />
                        <span>{invitation.start_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Bell className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-muted-foreground">Visitors will receive email invitations with visit details</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Auto-Approval</p>
                  <p className="text-muted-foreground">Skip approval process for trusted visitors</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <QrCode className="h-4 w-4 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Digital Passes</p>
                  <p className="text-muted-foreground">Approved visitors get QR codes for easy entry</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Visitor Dialog */}
      <Dialog open={showNewVisitorDialog} onOpenChange={setShowNewVisitorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Visitor</DialogTitle>
            <DialogDescription>
              Create a new visitor profile to send them an invitation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_full_name">Full Name *</Label>
              <Input
                id="new_full_name"
                placeholder="Enter visitor's full name"
                value={newVisitorForm.full_name}
                onChange={(e) => {
                  setNewVisitorForm(prev => ({ ...prev, full_name: e.target.value }));
                  if (errors.full_name) setErrors(prev => ({ ...prev, full_name: '' }));
                }}
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_email">Email Address *</Label>
              <Input
                id="new_email"
                type="email"
                placeholder="visitor@company.com"
                value={newVisitorForm.email}
                onChange={(e) => {
                  setNewVisitorForm(prev => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_phone">Phone Number</Label>
              <Input
                id="new_phone"
                placeholder="+1 (555) 123-4567"
                value={newVisitorForm.phone}
                onChange={(e) => setNewVisitorForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_company">Company</Label>
              <Input
                id="new_company"
                placeholder="Company name"
                value={newVisitorForm.company}
                onChange={(e) => setNewVisitorForm(prev => ({ ...prev, company: e.target.value }))}
              />
            </div>

            {/* Photo Capture Section */}
            <div className="space-y-3">
              <Label>Visitor Photo (Face Recognition)</Label>
              {newVisitorForm.photo_url ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                  <img 
                    src={newVisitorForm.photo_url} 
                    alt="Captured photo" 
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">Photo Captured</p>
                    <p className="text-sm text-green-600">Face recognition profile ready</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPhotoCapture(true)}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Retake
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPhotoCapture(true)}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo for Face Recognition
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Capturing a photo enables automatic visitor identification and enhances security.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewVisitorDialog(false);
                  setNewVisitorForm({ full_name: '', email: '', phone: '', company: '', photo_url: '' });
                  setErrors({});
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createNewVisitor}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Visitor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Capture Dialog */}
      <Dialog open={showPhotoCapture} onOpenChange={setShowPhotoCapture}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture Visitor Photo</DialogTitle>
            <DialogDescription>
              Take a photo for {newVisitorForm.full_name || 'the visitor'} to enable face recognition
            </DialogDescription>
          </DialogHeader>
          
          <PhotoCapture
            onPhotoCapture={handlePhotoCapture}
            onCancel={cancelPhotoCapture}
            visitorName={newVisitorForm.full_name}
            visitorEmail={newVisitorForm.email}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}