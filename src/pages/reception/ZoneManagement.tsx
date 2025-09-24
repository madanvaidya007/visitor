import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Users, 
  Clock, 
  Building, 
  Search,
  Settings,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  description?: string;
  location: string;
  access_level: 'public' | 'restricted' | 'confidential' | 'top_secret';
  capacity: number;
  current_occupancy: number;
  is_active: boolean;
  requires_escort: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  created_at: string;
  updated_at: string;
}

interface ZoneFormData {
  name: string;
  description: string;
  location: string;
  access_level: 'public' | 'restricted' | 'confidential' | 'top_secret';
  capacity: number;
  is_active: boolean;
  requires_escort: boolean;
  working_hours_start: string;
  working_hours_end: string;
}

export default function ZoneManagement() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [filteredZones, setFilteredZones] = useState<Zone[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessLevelFilter, setAccessLevelFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<ZoneFormData>({
    name: '',
    description: '',
    location: '',
    access_level: 'public',
    capacity: 10,
    is_active: true,
    requires_escort: false,
    working_hours_start: '09:00',
    working_hours_end: '17:00'
  });

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    filterZones();
  }, [zones, searchTerm, accessLevelFilter]);

  const fetchZones = async () => {
    try {
      // TODO: Implement actual zone fetching from database
      // const { data, error } = await supabase
      //   .from('zones')
      //   .select('*')
      //   .order('created_at', { ascending: false });
      
      // if (error) throw error;
      // setZones(data || []);
      
      // For now, start with empty list until zones table is properly implemented
      setZones([]);
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch zones',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterZones = () => {
    let filtered = zones;

    if (searchTerm) {
      filtered = filtered.filter(zone =>
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (accessLevelFilter !== 'all') {
      filtered = filtered.filter(zone => zone.access_level === accessLevelFilter);
    }

    setFilteredZones(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      access_level: 'public',
      capacity: 10,
      is_active: true,
      requires_escort: false,
      working_hours_start: '09:00',
      working_hours_end: '17:00'
    });
  };

  const handleCreateZone = async () => {
    setIsSaving(true);
    try {
      // In a real application, this would save to the database
      const newZone: Zone = {
        id: Date.now().toString(),
        ...formData,
        current_occupancy: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setZones([...zones, newZone]);
      setShowCreateDialog(false);
      resetForm();

      toast({
        title: 'Zone Created',
        description: `Zone "${formData.name}" has been created successfully`,
      });
    } catch (error) {
      console.error('Error creating zone:', error);
      toast({
        title: 'Error',
        description: 'Failed to create zone',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditZone = async () => {
    if (!selectedZone) return;

    setIsSaving(true);
    try {
      const updatedZone: Zone = {
        ...selectedZone,
        ...formData,
        updated_at: new Date().toISOString()
      };

      setZones(zones.map(zone => zone.id === selectedZone.id ? updatedZone : zone));
      setShowEditDialog(false);
      setSelectedZone(null);
      resetForm();

      toast({
        title: 'Zone Updated',
        description: `Zone "${formData.name}" has been updated successfully`,
      });
    } catch (error) {
      console.error('Error updating zone:', error);
      toast({
        title: 'Error',
        description: 'Failed to update zone',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      setZones(zones.filter(zone => zone.id !== zoneId));
      toast({
        title: 'Zone Deleted',
        description: 'Zone has been deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete zone',
        variant: 'destructive',
      });
    }
  };

  const toggleZoneStatus = async (zoneId: string) => {
    try {
      setZones(zones.map(zone => 
        zone.id === zoneId 
          ? { ...zone, is_active: !zone.is_active, updated_at: new Date().toISOString() }
          : zone
      ));

      const zone = zones.find(z => z.id === zoneId);
      toast({
        title: 'Zone Status Updated',
        description: `Zone "${zone?.name}" is now ${zone?.is_active ? 'inactive' : 'active'}`,
      });
    } catch (error) {
      console.error('Error toggling zone status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update zone status',
        variant: 'destructive',
      });
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'restricted': return 'bg-yellow-100 text-yellow-800';
      case 'confidential': return 'bg-orange-100 text-orange-800';
      case 'top_secret': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'public': return <Unlock className="h-4 w-4" />;
      case 'restricted': return <Lock className="h-4 w-4" />;
      case 'confidential': return <Shield className="h-4 w-4" />;
      case 'top_secret': return <AlertTriangle className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  const getOccupancyColor = (current: number, capacity: number) => {
    const percentage = (current / capacity) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const openEditDialog = (zone: Zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      location: zone.location,
      access_level: zone.access_level,
      capacity: zone.capacity,
      is_active: zone.is_active,
      requires_escort: zone.requires_escort,
      working_hours_start: zone.working_hours_start || '09:00',
      working_hours_end: zone.working_hours_end || '17:00'
    });
    setShowEditDialog(true);
  };

  const ZoneCard = ({ zone }: { zone: Zone }) => (
    <Card className={`mb-4 ${!zone.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-semibold">{zone.name}</h3>
              <Badge className={getAccessLevelColor(zone.access_level)}>
                {getAccessLevelIcon(zone.access_level)}
                <span className="ml-1 capitalize">{zone.access_level}</span>
              </Badge>
              {!zone.is_active && (
                <Badge variant="secondary">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Inactive
                </Badge>
              )}
              {zone.requires_escort && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Users className="h-3 w-3 mr-1" />
                  Escort Required
                </Badge>
              )}
            </div>

            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{zone.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className={getOccupancyColor(zone.current_occupancy, zone.capacity)}>
                  {zone.current_occupancy} / {zone.capacity} occupancy
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{zone.working_hours_start} - {zone.working_hours_end}</span>
              </div>
            </div>

            {zone.description && (
              <p className="text-sm text-gray-600 mb-4">{zone.description}</p>
            )}

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  zone.current_occupancy / zone.capacity >= 0.9 ? 'bg-red-500' :
                  zone.current_occupancy / zone.capacity >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((zone.current_occupancy / zone.capacity) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-6">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditDialog(zone)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleZoneStatus(zone.id)}
            >
              {zone.is_active ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Deactivate
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Activate
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteZone(zone.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ZoneForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Zone Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter zone name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Enter location"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter zone description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="access_level">Access Level</Label>
          <Select 
            value={formData.access_level} 
            onValueChange={(value: any) => setFormData({ ...formData, access_level: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="top_secret">Top Secret</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
            placeholder="Enter capacity"
            min="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Working Hours Start</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.working_hours_start}
            onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">Working Hours End</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.working_hours_end}
            onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Zone is active</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="requires_escort"
            checked={formData.requires_escort}
            onCheckedChange={(checked) => setFormData({ ...formData, requires_escort: checked })}
          />
          <Label htmlFor="requires_escort">Requires escort</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zone Management</h1>
          <p className="text-muted-foreground">
            Manage access zones and security levels
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Zone</DialogTitle>
              <DialogDescription>
                Add a new security zone to the system
              </DialogDescription>
            </DialogHeader>
            <ZoneForm />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateZone} disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Zone'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search zones, locations, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={accessLevelFilter} onValueChange={setAccessLevelFilter}>
              <SelectTrigger className="w-48">
                <Shield className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
                <SelectItem value="top_secret">Top Secret</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Zones</p>
                <p className="text-2xl font-bold">{zones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Zones</p>
                <p className="text-2xl font-bold">{zones.filter(z => z.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Occupancy</p>
                <p className="text-2xl font-bold">{zones.reduce((sum, z) => sum + z.current_occupancy, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Restricted Zones</p>
                <p className="text-2xl font-bold">{zones.filter(z => z.access_level !== 'public').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading zones...</div>
        ) : filteredZones.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">No zones found</p>
            </CardContent>
          </Card>
        ) : (
          filteredZones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Zone</DialogTitle>
            <DialogDescription>
              Update zone information and settings
            </DialogDescription>
          </DialogHeader>
          <ZoneForm />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditZone} disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update Zone'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}