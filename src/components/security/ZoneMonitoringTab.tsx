import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, AlertTriangle, Eye, Activity } from 'lucide-react';

interface ZoneOccupancy {
  zone_name: string;
  current_count: number;
  max_capacity: number;
  zone_type: string;
}

interface ZoneMonitoringTabProps {
  zoneOccupancy: ZoneOccupancy[];
  onUpdate: () => void;
}

export function ZoneMonitoringTab({ zoneOccupancy, onUpdate }: ZoneMonitoringTabProps) {
  const getZoneStatusColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'default';
    return 'secondary';
  };

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case 'restricted':
      case 'server_room':
        return <AlertTriangle className="h-4 w-4" />;
      case 'lab':
        return <Activity className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zone Monitoring</CardTitle>
              <CardDescription>Real-time monitoring of all access zones</CardDescription>
            </div>
            <Button onClick={onUpdate} variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneOccupancy.map((zone) => (
              <Card key={zone.zone_name} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getZoneTypeIcon(zone.zone_type)}
                      <CardTitle className="text-base">{zone.zone_name}</CardTitle>
                    </div>
                    <Badge className="capitalize">
                      {zone.zone_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Occupancy</span>
                      </div>
                      <span className="text-lg font-bold">
                        {zone.current_count} / {zone.max_capacity}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Capacity</span>
                        <span>{Math.round((zone.current_count / zone.max_capacity) * 100)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            getZoneStatusColor(zone.current_count, zone.max_capacity) === 'destructive' 
                              ? 'bg-destructive' 
                              : getZoneStatusColor(zone.current_count, zone.max_capacity) === 'default'
                              ? 'bg-primary'
                              : 'bg-success'
                          }`}
                          style={{ width: `${Math.min((zone.current_count / zone.max_capacity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <Badge variant={getZoneStatusColor(zone.current_count, zone.max_capacity)}>
                        {zone.current_count >= zone.max_capacity ? 'Full' : 
                         zone.current_count >= zone.max_capacity * 0.9 ? 'Near Full' : 
                         zone.current_count > 0 ? 'Active' : 'Empty'}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>

                {/* Alert indicator for high-security zones */}
                {(zone.zone_type === 'restricted' || zone.zone_type === 'server_room') && zone.current_count > 0 && (
                  <div className="absolute top-2 right-2">
                    <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Zone Access Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Zone Access</CardTitle>
          <CardDescription>Latest zone entry and exit activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { visitor: 'John Doe', zone: 'Lab A', action: 'Entry', time: '14:32', status: 'Authorized' },
              { visitor: 'Jane Smith', zone: 'Server Room', action: 'Exit', time: '14:28', status: 'Authorized' },
              { visitor: 'Bob Johnson', zone: 'Meeting Room 1', action: 'Entry', time: '14:15', status: 'Authorized' },
              { visitor: 'Alice Brown', zone: 'Lobby', action: 'Entry', time: '14:10', status: 'Authorized' },
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    log.action === 'Entry' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {log.action === 'Entry' ? (
                      <MapPin className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.visitor}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.action} to {log.zone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={log.status === 'Authorized' ? 'default' : 'destructive'}>
                    {log.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}