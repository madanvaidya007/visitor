import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Users, 
  MapPin, 
  QrCode, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  UserCheck, 
  Clock,
  Building,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { SecurityZone, ZoneGuard, ZoneEntryPoint } from '@/types/zoneTypes';
import { zoneSecurityService } from '@/services/zoneSecurityService';
import { useToast } from '@/hooks/use-toast';

interface ZoneManagementProps {
  onZoneUpdate?: (zones: SecurityZone[]) => void;
}

export function ZoneManagement({ onZoneUpdate }: ZoneManagementProps) {
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [guards, setGuards] = useState<ZoneGuard[]>([]);
  const [selectedZone, setSelectedZone] = useState<SecurityZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('zones');
  const { toast } = useToast();

  // Zone form state
  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    location: '',
    floor: '',
    building: '',
    capacity: 0,
    accessLevel: 'public' as const
  });

  // Guard form state
  const [guardForm, setGuardForm] = useState({
    guardName: '',
    employeeId: '',
    contactPhone: '',
    contactEmail: '',
    assignedZones: [] as string[]
  });

  // Entry point form state
  const [entryPointForm, setEntryPointForm] = useState({
    name: '',
    location: '',
    requiresGuardVerification: true,
    allowedAccessLevels: ['public'] as string[]
  });

  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showGuardDialog, setShowGuardDialog] = useState(false);
  const [showEntryPointDialog, setShowEntryPointDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<SecurityZone | null>(null);
  const [editingGuard, setEditingGuard] = useState<ZoneGuard | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zonesData, guardsData] = await Promise.all([
        zoneSecurityService.getZones(),
        // We'll need to implement getGuards method
        Promise.resolve([]) // Placeholder for now
      ]);
      setZones(zonesData);
      setGuards(guardsData);
      onZoneUpdate?.(zonesData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load zone data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateZone = async () => {
    try {
      const newZone = await zoneSecurityService.createZone({
        ...zoneForm,
        currentOccupancy: 0,
        isActive: true,
        entryPoints: [],
        assignedGuards: []
      });
      
      setZones(prev => [...prev, newZone]);
      setZoneForm({
        name: '',
        description: '',
        location: '',
        floor: '',
        building: '',
        capacity: 0,
        accessLevel: 'public'
      });
      setShowZoneDialog(false);
      
      toast({
        title: "Success",
        description: "Zone created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create zone",
        variant: "destructive"
      });
    }
  };

  const handleUpdateZone = async () => {
    if (!editingZone) return;
    
    try {
      const updatedZone = await zoneSecurityService.updateZone(editingZone.id, zoneForm);
      setZones(prev => prev.map(z => z.id === editingZone.id ? updatedZone : z));
      setEditingZone(null);
      setShowZoneDialog(false);
      
      toast({
        title: "Success",
        description: "Zone updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update zone",
        variant: "destructive"
      });
    }
  };

  const handleAssignGuard = async () => {
    try {
      const newGuard = await zoneSecurityService.assignGuardToZone({
        userId: '', // This would come from user selection
        guardName: guardForm.guardName,
        employeeId: guardForm.employeeId,
        assignedZones: guardForm.assignedZones,
        isOnDuty: false,
        contactInfo: {
          phone: guardForm.contactPhone,
          email: guardForm.contactEmail
        },
        permissions: [
          { action: 'scan_qr', zones: guardForm.assignedZones, isActive: true },
          { action: 'verify_visitor', zones: guardForm.assignedZones, isActive: true }
        ]
      });
      
      setGuards(prev => [...prev, newGuard]);
      setGuardForm({
        guardName: '',
        employeeId: '',
        contactPhone: '',
        contactEmail: '',
        assignedZones: []
      });
      setShowGuardDialog(false);
      
      toast({
        title: "Success",
        description: "Guard assigned successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign guard",
        variant: "destructive"
      });
    }
  };

  const handleCreateEntryPoint = async () => {
    if (!selectedZone) return;
    
    try {
      const newEntryPoint = await zoneSecurityService.createEntryPoint({
        zoneId: selectedZone.id,
        ...entryPointForm,
        isActive: true
      });
      
      setZones(prev => prev.map(z => 
        z.id === selectedZone.id 
          ? { ...z, entryPoints: [...z.entryPoints, newEntryPoint] }
          : z
      ));
      
      setEntryPointForm({
        name: '',
        location: '',
        requiresGuardVerification: true,
        allowedAccessLevels: ['public']
      });
      setShowEntryPointDialog(false);
      
      toast({
        title: "Success",
        description: "Entry point created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create entry point",
        variant: "destructive"
      });
    }
  };

  const toggleGuardDuty = async (guardId: string, isOnDuty: boolean) => {
    try {
      await zoneSecurityService.updateGuardStatus(guardId, isOnDuty);
      setGuards(prev => prev.map(g => 
        g.id === guardId ? { ...g, isOnDuty } : g
      ));
      
      toast({
        title: "Success",
        description: `Guard ${isOnDuty ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update guard status",
        variant: "destructive"
      });
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'restricted': return 'bg-yellow-100 text-yellow-800';
      case 'high_security': return 'bg-red-100 text-red-800';
      case 'executive': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Zone Security Management</h2>
          <p className="text-muted-foreground">
            Manage security zones, assign guards, and configure entry points
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingZone ? 'Edit Zone' : 'Create New Zone'}</DialogTitle>
                <DialogDescription>
                  {editingZone ? 'Update zone information' : 'Add a new security zone to the system'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="zone-name">Zone Name</Label>
                  <Input
                    id="zone-name"
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter zone name"
                  />
                </div>
                <div>
                  <Label htmlFor="zone-description">Description</Label>
                  <Textarea
                    id="zone-description"
                    value={zoneForm.description}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter zone description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zone-location">Location</Label>
                    <Input
                      id="zone-location"
                      value={zoneForm.location}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zone-capacity">Capacity</Label>
                    <Input
                      id="zone-capacity"
                      type="number"
                      value={zoneForm.capacity}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                      placeholder="Max capacity"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zone-floor">Floor</Label>
                    <Input
                      id="zone-floor"
                      value={zoneForm.floor}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, floor: e.target.value }))}
                      placeholder="Floor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zone-building">Building</Label>
                    <Input
                      id="zone-building"
                      value={zoneForm.building}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, building: e.target.value }))}
                      placeholder="Building"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="zone-access-level">Access Level</Label>
                  <Select
                    value={zoneForm.accessLevel}
                    onValueChange={(value: any) => setZoneForm(prev => ({ ...prev, accessLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select access level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="high_security">High Security</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowZoneDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingZone ? handleUpdateZone : handleCreateZone}>
                    {editingZone ? 'Update' : 'Create'} Zone
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="zones">Security Zones</TabsTrigger>
          <TabsTrigger value="guards">Guards</TabsTrigger>
          <TabsTrigger value="entry-points">Entry Points</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => (
              <Card key={zone.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{zone.name}</CardTitle>
                    <Badge className={getAccessLevelColor(zone.accessLevel)}>
                      {zone.accessLevel.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription>{zone.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {zone.location}
                      {zone.floor && ` - Floor ${zone.floor}`}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span className={getOccupancyColor((zone.currentOccupancy / zone.capacity) * 100)}>
                        {zone.currentOccupancy}/{zone.capacity}
                      </span>
                      <span className="text-muted-foreground">
                        ({Math.round((zone.currentOccupancy / zone.capacity) * 100)}% occupied)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      {zone.assignedGuards.length} guards assigned
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <QrCode className="h-4 w-4" />
                      {zone.entryPoints.length} entry points
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedZone(zone);
                          setZoneForm({
                            name: zone.name,
                            description: zone.description,
                            location: zone.location,
                            floor: zone.floor || '',
                            building: zone.building || '',
                            capacity: zone.capacity,
                            accessLevel: zone.accessLevel
                          });
                          setEditingZone(zone);
                          setShowZoneDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedZone(zone)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guards" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Security Guards</h3>
            <Dialog open={showGuardDialog} onOpenChange={setShowGuardDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Guard
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Security Guard</DialogTitle>
                  <DialogDescription>
                    Assign a security guard to one or more zones
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="guard-name">Guard Name</Label>
                    <Input
                      id="guard-name"
                      value={guardForm.guardName}
                      onChange={(e) => setGuardForm(prev => ({ ...prev, guardName: e.target.value }))}
                      placeholder="Enter guard name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employee-id">Employee ID</Label>
                    <Input
                      id="employee-id"
                      value={guardForm.employeeId}
                      onChange={(e) => setGuardForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      placeholder="Enter employee ID"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="guard-phone">Phone</Label>
                      <Input
                        id="guard-phone"
                        value={guardForm.contactPhone}
                        onChange={(e) => setGuardForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guard-email">Email</Label>
                      <Input
                        id="guard-email"
                        type="email"
                        value={guardForm.contactEmail}
                        onChange={(e) => setGuardForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="Email address"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Assigned Zones</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {zones.map((zone) => (
                        <div key={zone.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`zone-${zone.id}`}
                            checked={guardForm.assignedZones.includes(zone.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGuardForm(prev => ({
                                  ...prev,
                                  assignedZones: [...prev.assignedZones, zone.id]
                                }));
                              } else {
                                setGuardForm(prev => ({
                                  ...prev,
                                  assignedZones: prev.assignedZones.filter(id => id !== zone.id)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`zone-${zone.id}`} className="text-sm">
                            {zone.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowGuardDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAssignGuard}>
                      Assign Guard
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guards.map((guard) => (
              <Card key={guard.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{guard.guardName}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={guard.isOnDuty}
                        onCheckedChange={(checked) => toggleGuardDuty(guard.id, checked)}
                      />
                      {guard.isOnDuty ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  <CardDescription>ID: {guard.employeeId}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Status:</span>{' '}
                      <Badge variant={guard.isOnDuty ? 'default' : 'secondary'}>
                        {guard.isOnDuty ? 'On Duty' : 'Off Duty'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium">Zones:</span>{' '}
                      {guard.assignedZones.length} assigned
                    </div>

                    {guard.contactInfo.phone && (
                      <div className="text-sm text-muted-foreground">
                        📞 {guard.contactInfo.phone}
                      </div>
                    )}

                    {guard.shiftStart && guard.shiftEnd && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(guard.shiftStart).toLocaleTimeString()} - {new Date(guard.shiftEnd).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="entry-points" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Entry Points</h3>
            <Dialog open={showEntryPointDialog} onOpenChange={setShowEntryPointDialog}>
              <DialogTrigger asChild>
                <Button disabled={!selectedZone}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry Point
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Entry Point</DialogTitle>
                  <DialogDescription>
                    Add a new entry point to {selectedZone?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="entry-name">Entry Point Name</Label>
                    <Input
                      id="entry-name"
                      value={entryPointForm.name}
                      onChange={(e) => setEntryPointForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter entry point name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="entry-location">Location</Label>
                    <Input
                      id="entry-location"
                      value={entryPointForm.location}
                      onChange={(e) => setEntryPointForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter location"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires-verification"
                      checked={entryPointForm.requiresGuardVerification}
                      onCheckedChange={(checked) => setEntryPointForm(prev => ({ ...prev, requiresGuardVerification: checked }))}
                    />
                    <Label htmlFor="requires-verification">Requires Guard Verification</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowEntryPointDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateEntryPoint}>
                      Create Entry Point
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!selectedZone && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Select a zone from the Zones tab to view and manage its entry points.
              </AlertDescription>
            </Alert>
          )}

          {selectedZone && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Entry Points for {selectedZone.name}</CardTitle>
                  <CardDescription>
                    Manage QR code entry points for this security zone
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedZone.entryPoints.map((entryPoint) => (
                      <Card key={entryPoint.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{entryPoint.name}</h4>
                              <Badge variant={entryPoint.isActive ? 'default' : 'secondary'}>
                                {entryPoint.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {entryPoint.location}
                            </div>
                            
                            <div className="text-sm">
                              <QrCode className="h-3 w-3 inline mr-1" />
                              QR: {entryPoint.qrCodeId}
                            </div>
                            
                            <div className="text-sm">
                              <Shield className="h-3 w-3 inline mr-1" />
                              {entryPoint.requiresGuardVerification ? 'Guard verification required' : 'Self-service entry'}
                            </div>

                            {entryPoint.lastScanTime && (
                              <div className="text-xs text-muted-foreground">
                                Last scan: {new Date(entryPoint.lastScanTime).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}