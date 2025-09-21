import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock, Eye, CheckCircle } from 'lucide-react';

interface SecurityAlertsTabProps {
  alerts: any[];
}

export function SecurityAlertsTab({ alerts }: SecurityAlertsTabProps) {
  const mockAlerts = [
    {
      id: 1,
      type: 'unauthorized_access',
      title: 'Unauthorized Access Attempt',
      description: 'Invalid QR code scanned at Server Room entrance',
      severity: 'high',
      timestamp: new Date(Date.now() - 300000),
      status: 'active',
      zone: 'Server Room'
    },
    {
      id: 2,
      type: 'overstay',
      title: 'Visitor Overstay Alert',
      description: 'John Doe has exceeded maximum visit duration',
      severity: 'medium',
      timestamp: new Date(Date.now() - 600000),
      status: 'active',
      zone: 'Lab A'
    },
    {
      id: 3,
      type: 'tailgating',
      title: 'Potential Tailgating Detected',
      description: 'Multiple entries detected with single QR scan',
      severity: 'medium',
      timestamp: new Date(Date.now() - 900000),
      status: 'resolved',
      zone: 'Main Entrance'
    },
    {
      id: 4,
      type: 'zone_breach',
      title: 'Restricted Zone Entry',
      description: 'Visitor entered restricted area without proper authorization',
      severity: 'high',
      timestamp: new Date(Date.now() - 1200000),
      status: 'investigating',
      zone: 'Restricted Area'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'destructive';
      case 'investigating': return 'default';
      case 'resolved': return 'secondary';
      default: return 'secondary';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'unauthorized_access':
        return <Shield className="h-5 w-5" />;
      case 'overstay':
        return <Clock className="h-5 w-5" />;
      case 'tailgating':
        return <Eye className="h-5 w-5" />;
      case 'zone_breach':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const handleResolveAlert = (alertId: number) => {
    // In a real app, this would update the alert status in the database
    console.log('Resolving alert:', alertId);
  };

  const handleInvestigateAlert = (alertId: number) => {
    // In a real app, this would mark the alert as under investigation
    console.log('Investigating alert:', alertId);
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {mockAlerts.filter(a => a.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Investigation</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockAlerts.filter(a => a.status === 'investigating').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Being reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {mockAlerts.filter(a => a.status === 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully handled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
          <CardDescription>Real-time security alerts and incidents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAlerts.map((alert) => (
              <Card key={alert.id} className={`${
                alert.severity === 'high' ? 'border-destructive/50' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${
                        alert.severity === 'high' 
                          ? 'bg-destructive/10 text-destructive' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(alert.status)}>
                            {alert.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Zone: {alert.zone}</span>
                          <span>Time: {alert.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {alert.status === 'active' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleInvestigateAlert(alert.id)}
                          >
                            Investigate
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        </>
                      )}
                      {alert.status === 'investigating' && (
                        <Button 
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Emergency Actions</CardTitle>
          <CardDescription>Quick actions for emergency situations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="destructive" className="h-16">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Initiate Lockdown
            </Button>
            <Button variant="outline" className="h-16">
              <Shield className="mr-2 h-5 w-5" />
              Emergency Evacuation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}