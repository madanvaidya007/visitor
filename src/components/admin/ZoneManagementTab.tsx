import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeZoneData } from '@/hooks/useRealtimeZoneData';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  zone_type: string;
  max_capacity: number | null;
  requires_escort: boolean | null;
  is_active: boolean | null;
}

interface ZoneManagementTabProps {
  onZoneUpdate: () => void;
}

export function ZoneManagementTab({ onZoneUpdate }: ZoneManagementTabProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching zones',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleZoneStatus = async (zoneId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('zones')
        .update({ is_active: !currentStatus })
        .eq('id', zoneId);

      if (error) throw error;

      toast({
        title: `Zone ${!currentStatus ? 'activated' : 'deactivated'}`,
        description: 'Zone status updated successfully.'
      });

      fetchZones();
      onZoneUpdate();
    } catch (error: any) {
      toast({
        title: 'Error updating zone',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getZoneTypeColor = (type: string) => {
    switch (type) {
      case 'restricted': return 'destructive';
      case 'server_room': return 'destructive';
      case 'lab': return 'default';
      case 'office': return 'default';
      case 'meeting_room': return 'secondary';
      case 'lobby': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zone Management</CardTitle>
              <CardDescription>Configure access zones and permissions</CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Requires Escort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{zone.name}</div>
                        {zone.description && (
                          <div className="text-sm text-muted-foreground">{zone.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getZoneTypeColor(zone.zone_type)}>
                        {zone.zone_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {zone.max_capacity || 'Unlimited'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.requires_escort ? 'destructive' : 'secondary'}>
                        {zone.requires_escort ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={zone.is_active ? 'destructive' : 'default'}
                          onClick={() => handleToggleZoneStatus(zone.id, zone.is_active || false)}
                        >
                          {zone.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}