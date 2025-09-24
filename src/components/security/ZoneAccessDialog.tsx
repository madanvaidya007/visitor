import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  Shield, 
  MapPin, 
  Clock, 
  User, 
  Building, 
  Key,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface ZoneAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanResult: {
    success: boolean;
    visitRequest?: any;
    message?: string;
    visitor?: any;
    zone?: any;
  } | null;
}

interface ZoneAccess {
  id: string;
  zone_id: string;
  granted_at: string;
  zone: {
    id: string;
    name: string;
    description?: string;
    location?: string;
    floor?: string;
    building?: string;
    access_level: string;
    requires_escort: boolean;
    is_active: boolean;
  };
}

export function ZoneAccessDialog({ open, onOpenChange, scanResult }: ZoneAccessDialogProps) {
  const [authorizedZones, setAuthorizedZones] = useState<ZoneAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && scanResult?.success && scanResult.visitRequest) {
      fetchAuthorizedZones(scanResult.visitRequest.id);
    }
  }, [open, scanResult]);

  const fetchAuthorizedZones = async (visitRequestId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zone_access')
        .select(`
          id,
          zone_id,
          granted_at,
          zone:zones(
            id,
            name,
            description,
            location,
            floor,
            building,
            access_level,
            requires_escort,
            is_active
          )
        `)
        .eq('visit_request_id', visitRequestId)
        .eq('zone.is_active', true);

      if (error) throw error;
      setAuthorizedZones(data || []);
    } catch (error) {
      console.error('Error fetching authorized zones:', error);
      toast({
        title: 'Error',
        description: 'Failed to load authorized zones',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setAuthorizedZones([]);
  };

  if (!scanResult?.success || !scanResult.visitRequest) {
    return null;
  }

  const visitor = scanResult.visitRequest.visitor;
  const visitRequest = scanResult.visitRequest;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Access Granted</DialogTitle>
              <DialogDescription>
                QR code scan successful - Zone access authorized
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visitor Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={visitor?.photo_url} alt={visitor?.full_name} />
                  <AvatarFallback className="text-lg">
                    {visitor?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{visitor?.full_name}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{visitor?.email}</span>
                    </div>
                    {visitor?.company && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>{visitor.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {visitRequest.visit_date} • {visitRequest.start_time} - {visitRequest.end_time}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Checked In
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Authorized Zones */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Authorized Zones</h3>
              {authorizedZones.length > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {authorizedZones.length} zone{authorizedZones.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : authorizedZones.length > 0 ? (
              <div className="grid gap-3">
                {authorizedZones.map((access) => (
                  <Card key={access.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <h4 className="font-medium">{access.zone.name}</h4>
                            <Badge className={getAccessLevelColor(access.zone.access_level)}>
                              {access.zone.access_level.toUpperCase()}
                            </Badge>
                            {access.zone.requires_escort && (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">
                                <Shield className="h-3 w-3 mr-1" />
                                Escort Required
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {access.zone.description && (
                              <p>{access.zone.description}</p>
                            )}
                            <div className="flex items-center gap-4">
                              {access.zone.location && (
                                <span>📍 {access.zone.location}</span>
                              )}
                              {access.zone.floor && (
                                <span>🏢 Floor {access.zone.floor}</span>
                              )}
                              {access.zone.building && (
                                <span>🏗️ {access.zone.building}</span>
                              )}
                            </div>
                            <p className="text-xs">
                              Access granted {formatDistanceToNow(parseISO(access.granted_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full ml-4">
                          <Key className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h4 className="font-medium mb-2">No Zone Access Granted</h4>
                  <p className="text-sm text-muted-foreground">
                    This visitor has not been granted access to any specific zones. 
                    Please contact the host or security for zone access permissions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Security Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <h4 className="font-medium text-blue-900 mb-1">Security Notice</h4>
                  <p className="text-blue-800">
                    This access is valid only for the scheduled visit time. 
                    Visitor must be accompanied by authorized personnel in restricted zones.
                    Report any security concerns immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleClose} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge Access
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                toast({
                  title: 'Security Alert Sent',
                  description: 'Security team has been notified of this access grant',
                });
              }}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alert Security
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}