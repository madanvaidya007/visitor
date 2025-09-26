import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, UserPlus, Edit, Trash2, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { CustomLogo } from '@/components/ui/CustomLogo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeZoneData } from '@/hooks/useRealtimeZoneData';
import { ZoneGuard, SecurityZone } from '@/types/zoneTypes';

interface GuardFormData {
  guardName: string;
  employeeId: string;
  email: string;
  phone: string;
  assignedZones: string[];
  isOnDuty: boolean;
  shiftStart: string;
  shiftEnd: string;
}

export function GuardManagementTab() {
  const [guards, setGuards] = useState<ZoneGuard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuard, setEditingGuard] = useState<ZoneGuard | null>(null);
  const [formData, setFormData] = useState<GuardFormData>({
    guardName: '',
    employeeId: '',
    email: '',
    phone: '',
    assignedZones: [],
    isOnDuty: false,
    shiftStart: '',
    shiftEnd: ''
  });
  const { toast } = useToast();

  // Get real-time zone data
  const { data: realtimeData } = useRealtimeZoneData({
    enableZones: true,
    enableGuards: true
  });

  useEffect(() => {
    fetchGuards();
  }, []);

  useEffect(() => {
    if (realtimeData.guards.length > 0) {
      setGuards(realtimeData.guards);
      setIsLoading(false);
    }
  }, [realtimeData.guards]);

  const fetchGuards = async () => {
    try {
      const { data, error } = await supabase
        .from('zone_guards')
        .select(`
          *,
          user:auth.users(email)
        `)
        .order('guard_name');

      if (error) throw error;

      const mappedGuards: ZoneGuard[] = data.map(guard => ({
        id: guard.id,
        userId: guard.user_id,
        guardName: guard.guard_name,
        employeeId: guard.employee_id,
        assignedZones: guard.assigned_zones || [],
        isOnDuty: guard.is_on_duty,
        shiftStart: guard.shift_start,
        shiftEnd: guard.shift_end,
        contactInfo: guard.contact_info || {},
        permissions: guard.permissions || [],
        createdAt: guard.created_at,
        updatedAt: guard.updated_at
      }));

      setGuards(mappedGuards);
    } catch (error: any) {
      console.error('Error fetching guards:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch guards',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGuard = async () => {
    try {
      // First create the user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: 'TempPassword123!', // Temporary password - should be changed on first login
        email_confirm: true,
        user_metadata: {
          role: 'guard',
          full_name: formData.guardName
        }
      });

      if (authError) throw authError;

      // Then create the guard record
      const { data, error } = await supabase
        .from('zone_guards')
        .insert([{
          user_id: authData.user.id,
          guard_name: formData.guardName,
          employee_id: formData.employeeId,
          assigned_zones: formData.assignedZones,
          is_on_duty: formData.isOnDuty,
          shift_start: formData.shiftStart || null,
          shift_end: formData.shiftEnd || null,
          contact_info: {
            email: formData.email,
            phone: formData.phone
          },
          permissions: ['zone_access', 'qr_scan']
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Guard created successfully',
      });

      setIsDialogOpen(false);
      resetForm();
      fetchGuards();
    } catch (error: any) {
      console.error('Error creating guard:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create guard',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateGuard = async () => {
    if (!editingGuard) return;

    try {
      const { error } = await supabase
        .from('zone_guards')
        .update({
          guard_name: formData.guardName,
          employee_id: formData.employeeId,
          assigned_zones: formData.assignedZones,
          is_on_duty: formData.isOnDuty,
          shift_start: formData.shiftStart || null,
          shift_end: formData.shiftEnd || null,
          contact_info: {
            email: formData.email,
            phone: formData.phone
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', editingGuard.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Guard updated successfully',
      });

      setIsDialogOpen(false);
      setEditingGuard(null);
      resetForm();
      fetchGuards();
    } catch (error: any) {
      console.error('Error updating guard:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update guard',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteGuard = async (guardId: string) => {
    if (!confirm('Are you sure you want to delete this guard?')) return;

    try {
      const { error } = await supabase
        .from('zone_guards')
        .delete()
        .eq('id', guardId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Guard deleted successfully',
      });

      fetchGuards();
    } catch (error: any) {
      console.error('Error deleting guard:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete guard',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      guardName: '',
      employeeId: '',
      email: '',
      phone: '',
      assignedZones: [],
      isOnDuty: false,
      shiftStart: '',
      shiftEnd: ''
    });
  };

  const openEditDialog = (guard: ZoneGuard) => {
    setEditingGuard(guard);
    setFormData({
      guardName: guard.guardName,
      employeeId: guard.employeeId,
      email: guard.contactInfo.email || '',
      phone: guard.contactInfo.phone || '',
      assignedZones: guard.assignedZones,
      isOnDuty: guard.isOnDuty,
      shiftStart: guard.shiftStart || '',
      shiftEnd: guard.shiftEnd || ''
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingGuard(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getZoneName = (zoneId: string): string => {
    const zone = realtimeData.zones.find(z => z.id === zoneId);
    return zone?.name || 'Unknown Zone';
  };

  const handleZoneToggle = (zoneId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        assignedZones: [...prev.assignedZones, zoneId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        assignedZones: prev.assignedZones.filter(id => id !== zoneId)
      }));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading guards...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Guard Management</h2>
          <p className="text-muted-foreground">Manage security guards and their zone assignments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Guard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingGuard ? 'Edit Guard' : 'Create New Guard'}
              </DialogTitle>
              <DialogDescription>
                {editingGuard ? 'Update guard information and zone assignments' : 'Add a new security guard and assign zones'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardName">Guard Name</Label>
                <Input
                  id="guardName"
                  value={formData.guardName}
                  onChange={(e) => setFormData(prev => ({ ...prev, guardName: e.target.value }))}
                  placeholder="Enter guard name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                  placeholder="Enter employee ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shiftStart">Shift Start</Label>
                <Input
                  id="shiftStart"
                  type="time"
                  value={formData.shiftStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, shiftStart: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shiftEnd">Shift End</Label>
                <Input
                  id="shiftEnd"
                  type="time"
                  value={formData.shiftEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, shiftEnd: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Assigned Zones</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {realtimeData.zones.map((zone) => (
                  <div key={zone.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={zone.id}
                      checked={formData.assignedZones.includes(zone.id)}
                      onCheckedChange={(checked) => handleZoneToggle(zone.id, checked as boolean)}
                    />
                    <Label htmlFor={zone.id} className="text-sm">
                      {zone.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isOnDuty"
                checked={formData.isOnDuty}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOnDuty: checked as boolean }))}
              />
              <Label htmlFor="isOnDuty">Currently On Duty</Label>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingGuard ? handleUpdateGuard : handleCreateGuard}>
                {editingGuard ? 'Update Guard' : 'Create Guard'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CustomLogo className="h-5 w-5" />
            Security Guards ({guards.length})
          </CardTitle>
          <CardDescription>
            Manage guard assignments and monitor their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guard Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Zones</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guards.map((guard) => (
                <TableRow key={guard.id}>
                  <TableCell className="font-medium">{guard.guardName}</TableCell>
                  <TableCell>{guard.employeeId}</TableCell>
                  <TableCell>
                    <Badge variant={guard.isOnDuty ? "default" : "secondary"}>
                      {guard.isOnDuty ? 'On Duty' : 'Off Duty'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {guard.assignedZones.map((zoneId) => (
                        <Badge key={zoneId} variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {getZoneName(zoneId)}
                        </Badge>
                      ))}
                      {guard.assignedZones.length === 0 && (
                        <span className="text-muted-foreground text-sm">No zones assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {guard.shiftStart && guard.shiftEnd ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {guard.shiftStart} - {guard.shiftEnd}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {guard.contactInfo.email && (
                        <div className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" />
                          {guard.contactInfo.email}
                        </div>
                      )}
                      {guard.contactInfo.phone && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="h-3 w-3" />
                          {guard.contactInfo.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(guard)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGuard(guard.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}