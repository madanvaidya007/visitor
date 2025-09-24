import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Shield, 
  ShieldX, 
  UserX, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar as CalendarIcon,
  User,
  Building,
  Phone,
  Mail,
  Clock,
  FileText,
  Eye,
  RefreshCw,
  Download,
  Upload,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface BlacklistEntry {
  id: string;
  visitor_name: string;
  visitor_email?: string;
  visitor_phone?: string;
  visitor_company?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  added_by: string;
  added_date: string;
  expiry_date?: string;
  is_active: boolean;
  notes?: string;
  incident_count: number;
  last_incident?: string;
}

interface BlacklistFormData {
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  visitor_company: string;
  reason: string;
  severity: string;
  expiry_date?: Date;
  notes: string;
  is_active: boolean;
}

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  { value: 'medium', label: 'Medium', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800', icon: XCircle },
  { value: 'critical', label: 'Critical', color: 'bg-red-200 text-red-900', icon: Ban }
];

const BLACKLIST_REASONS = [
  'Security Threat',
  'Inappropriate Behavior',
  'Unauthorized Access Attempt',
  'Harassment',
  'Theft/Vandalism',
  'Policy Violation',
  'Fraud/Deception',
  'Disruptive Conduct',
  'Safety Concern',
  'Other'
];

export default function Blacklist() {
  const [blacklistEntries, setBlacklistEntries] = useState<BlacklistEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<BlacklistEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<BlacklistEntry | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState<BlacklistFormData>({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    visitor_company: '',
    reason: '',
    severity: 'medium',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    fetchBlacklistEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [blacklistEntries, searchTerm, severityFilter, statusFilter]);

  const fetchBlacklistEntries = async () => {
    try {
      // TODO: Implement actual database fetching when blacklist table is created
      // const { data, error } = await supabase
      //   .from('blacklist_entries')
      //   .select('*')
      //   .order('added_date', { ascending: false });
      
      // if (error) throw error;
      // setBlacklistEntries(data || []);
      
      // For now, start with empty list until database table is implemented
      setBlacklistEntries([]);
    } catch (error) {
      console.error('Error fetching blacklist entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch blacklist entries',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = blacklistEntries;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.visitor_name.toLowerCase().includes(searchLower) ||
        entry.visitor_email?.toLowerCase().includes(searchLower) ||
        entry.visitor_phone?.includes(searchTerm) ||
        entry.visitor_company?.toLowerCase().includes(searchLower) ||
        entry.reason.toLowerCase().includes(searchLower)
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(entry => entry.severity === severityFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(entry => entry.is_active === isActive);
    }

    setFilteredEntries(filtered);
  };

  const handleAddEntry = async () => {
    try {
      const newEntry: BlacklistEntry = {
        id: Date.now().toString(),
        visitor_name: formData.visitor_name,
        visitor_email: formData.visitor_email,
        visitor_phone: formData.visitor_phone,
        visitor_company: formData.visitor_company,
        reason: formData.reason,
        severity: formData.severity as any,
        added_by: 'Current User', // In real app, get from auth
        added_date: new Date().toISOString(),
        expiry_date: formData.expiry_date?.toISOString(),
        is_active: formData.is_active,
        notes: formData.notes,
        incident_count: 1,
        last_incident: new Date().toISOString()
      };

      setBlacklistEntries([...blacklistEntries, newEntry]);
      setShowAddDialog(false);
      resetForm();

      toast({
        title: 'Success',
        description: 'Blacklist entry added successfully',
      });
    } catch (error) {
      console.error('Error adding blacklist entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to add blacklist entry',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return;

    try {
      const updatedEntry: BlacklistEntry = {
        ...selectedEntry,
        visitor_name: formData.visitor_name,
        visitor_email: formData.visitor_email,
        visitor_phone: formData.visitor_phone,
        visitor_company: formData.visitor_company,
        reason: formData.reason,
        severity: formData.severity as any,
        expiry_date: formData.expiry_date?.toISOString(),
        is_active: formData.is_active,
        notes: formData.notes
      };

      setBlacklistEntries(blacklistEntries.map(entry => 
        entry.id === selectedEntry.id ? updatedEntry : entry
      ));
      setShowEditDialog(false);
      setSelectedEntry(null);
      resetForm();

      toast({
        title: 'Success',
        description: 'Blacklist entry updated successfully',
      });
    } catch (error) {
      console.error('Error updating blacklist entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update blacklist entry',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      setBlacklistEntries(blacklistEntries.filter(entry => entry.id !== entryId));
      toast({
        title: 'Success',
        description: 'Blacklist entry deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting blacklist entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete blacklist entry',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (entryId: string) => {
    try {
      setBlacklistEntries(blacklistEntries.map(entry => 
        entry.id === entryId 
          ? { ...entry, is_active: !entry.is_active }
          : entry
      ));

      const entry = blacklistEntries.find(e => e.id === entryId);
      toast({
        title: 'Success',
        description: `Blacklist entry ${entry?.is_active ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling entry status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update entry status',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      visitor_name: '',
      visitor_email: '',
      visitor_phone: '',
      visitor_company: '',
      reason: '',
      severity: 'medium',
      notes: '',
      is_active: true
    });
  };

  const openEditDialog = (entry: BlacklistEntry) => {
    setSelectedEntry(entry);
    setFormData({
      visitor_name: entry.visitor_name,
      visitor_email: entry.visitor_email || '',
      visitor_phone: entry.visitor_phone || '',
      visitor_company: entry.visitor_company || '',
      reason: entry.reason,
      severity: entry.severity,
      expiry_date: entry.expiry_date ? new Date(entry.expiry_date) : undefined,
      notes: entry.notes || '',
      is_active: entry.is_active
    });
    setShowEditDialog(true);
  };

  const getSeverityInfo = (severity: string) => {
    return SEVERITY_LEVELS.find(s => s.value === severity) || SEVERITY_LEVELS[1];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const exportBlacklist = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Company', 'Reason', 'Severity', 'Added By', 'Added Date', 'Status', 'Notes'].join(','),
      ...filteredEntries.map(entry => [
        entry.visitor_name,
        entry.visitor_email || '',
        entry.visitor_phone || '',
        entry.visitor_company || '',
        entry.reason,
        entry.severity,
        entry.added_by,
        entry.added_date,
        entry.is_active ? 'Active' : 'Inactive',
        entry.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blacklist-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Blacklist exported to CSV',
    });
  };

  const BlacklistCard = ({ entry }: { entry: BlacklistEntry }) => {
    const severityInfo = getSeverityInfo(entry.severity);
    const expired = isExpired(entry.expiry_date);

    return (
      <Card className={`mb-4 hover:shadow-md transition-shadow ${
        !entry.is_active ? 'opacity-60' : ''
      } ${expired ? 'border-orange-200 bg-orange-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Avatar>
                <AvatarFallback className="bg-red-100 text-red-800">
                  {getInitials(entry.visitor_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{entry.visitor_name}</h3>
                  <Badge className={severityInfo.color}>
                    <severityInfo.icon className="h-3 w-3 mr-1" />
                    {severityInfo.label}
                  </Badge>
                  <Badge variant={entry.is_active ? 'destructive' : 'secondary'}>
                    {entry.is_active ? (
                      <>
                        <Ban className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  {expired && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Expired
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-1">
                    {entry.visitor_email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{entry.visitor_email}</span>
                      </div>
                    )}
                    {entry.visitor_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{entry.visitor_phone}</span>
                      </div>
                    )}
                    {entry.visitor_company && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>{entry.visitor_company}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{entry.reason}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Added by: {entry.added_by}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Incidents: {entry.incident_count}</span>
                    </div>
                  </div>
                </div>
                
                {entry.notes && (
                  <p className="text-sm mt-2 text-gray-600 line-clamp-2">{entry.notes}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setSelectedEntry(entry);
                  setShowDetailsDialog(true);
                }}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEditDialog(entry)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                size="sm" 
                variant={entry.is_active ? "secondary" : "default"}
                onClick={() => handleToggleStatus(entry.id)}
              >
                {entry.is_active ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-1" />
                    Activate
                  </>
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Blacklist Entry</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the blacklist entry for {entry.visitor_name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const BlacklistForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="visitor_name">Visitor Name *</Label>
          <Input
            id="visitor_name"
            value={formData.visitor_name}
            onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
            placeholder="Enter visitor name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visitor_email">Email</Label>
          <Input
            id="visitor_email"
            type="email"
            value={formData.visitor_email}
            onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
            placeholder="Enter email address"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="visitor_phone">Phone</Label>
          <Input
            id="visitor_phone"
            value={formData.visitor_phone}
            onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
            placeholder="Enter phone number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visitor_company">Company</Label>
          <Input
            id="visitor_company"
            value={formData.visitor_company}
            onChange={(e) => setFormData({ ...formData, visitor_company: e.target.value })}
            placeholder="Enter company name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reason">Reason *</Label>
          <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {BLACKLIST_REASONS.map(reason => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">Severity *</Label>
          <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center gap-2">
                    <level.icon className="h-4 w-4" />
                    {level.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.expiry_date ? format(formData.expiry_date, "PPP") : "Select expiry date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.expiry_date}
              onSelect={(date) => setFormData({ ...formData, expiry_date: date })}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter additional notes or details about the incident"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Active Entry</Label>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blacklist Management</h1>
          <p className="text-muted-foreground">
            Manage visitor blacklist and security restrictions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportBlacklist}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add to Blacklist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Blacklist Entry</DialogTitle>
                <DialogDescription>
                  Add a new visitor to the blacklist with security restrictions.
                </DialogDescription>
              </DialogHeader>
              <BlacklistForm />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEntry}>
                  Add to Blacklist
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldX className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{blacklistEntries.length}</p>
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{blacklistEntries.filter(e => e.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{blacklistEntries.filter(e => e.severity === 'critical' || e.severity === 'high').length}</p>
                <p className="text-sm text-muted-foreground">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{blacklistEntries.filter(e => isExpired(e.expiry_date)).length}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search blacklist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {SEVERITY_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSeverityFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blacklist Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Blacklist Entries ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading blacklist entries...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <ShieldX className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">No blacklist entries found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <BlacklistCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Blacklist Entry</DialogTitle>
            <DialogDescription>
              Update blacklist entry information and restrictions.
            </DialogDescription>
          </DialogHeader>
          <BlacklistForm isEdit />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEntry}>
              Update Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Blacklist Entry Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedEntry?.visitor_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg bg-red-100 text-red-800">
                    {getInitials(selectedEntry.visitor_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedEntry.visitor_name}</h3>
                  <p className="text-muted-foreground">{selectedEntry.visitor_email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getSeverityInfo(selectedEntry.severity).color}>
                      {getSeverityInfo(selectedEntry.severity).label}
                    </Badge>
                    <Badge variant={selectedEntry.is_active ? 'destructive' : 'secondary'}>
                      {selectedEntry.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {isExpired(selectedEntry.expiry_date) && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Expired
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Email:</strong> {selectedEntry.visitor_email || 'N/A'}</div>
                      <div><strong>Phone:</strong> {selectedEntry.visitor_phone || 'N/A'}</div>
                      <div><strong>Company:</strong> {selectedEntry.visitor_company || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Security Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Reason:</strong> {selectedEntry.reason}</div>
                      <div><strong>Severity:</strong> {getSeverityInfo(selectedEntry.severity).label}</div>
                      <div><strong>Incidents:</strong> {selectedEntry.incident_count}</div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedEntry.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedEntry.notes}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Record Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Added By:</strong><br />
                    {selectedEntry.added_by}
                  </div>
                  <div>
                    <strong>Added Date:</strong><br />
                    {new Date(selectedEntry.added_date).toLocaleString()}
                  </div>
                  {selectedEntry.expiry_date && (
                    <div>
                      <strong>Expiry Date:</strong><br />
                      {new Date(selectedEntry.expiry_date).toLocaleString()}
                    </div>
                  )}
                  {selectedEntry.last_incident && (
                    <div>
                      <strong>Last Incident:</strong><br />
                      {new Date(selectedEntry.last_incident).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}