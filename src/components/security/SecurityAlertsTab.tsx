import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock, Eye, CheckCircle } from 'lucide-react';

interface SecurityAlertsTabProps {
  alerts: any[];
}

export function SecurityAlertsTab({ alerts }: SecurityAlertsTabProps) {
  // Use real alerts data passed from parent component
  const realAlerts = alerts || [];

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 3: return 'destructive'; // High severity
      case 2: return 'default';     // Medium severity  
      case 1: return 'secondary';   // Low severity
      default: return 'secondary';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 3: return 'High';
      case 2: return 'Medium';
      case 1: return 'Low';
      default: return 'Unknown';
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'capacity_exceeded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'unauthorized_access':
        return <Shield className="h-4 w-4" />;
      case 'emergency':
        return <AlertTriangle className="h-4 w-4" />;
      case 'maintenance':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
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
              {realAlerts.filter(a => a.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realAlerts.filter(a => a.severity === 3).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {realAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All alerts today
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
            {realAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active security alerts</p>
              </div>
            ) : (
              realAlerts.map((alert) => (
                <Card key={alert.id} className={`${
                  alert.severity === 3 ? 'border-destructive/50' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          alert.severity === 3 
                            ? 'bg-destructive/10 text-destructive' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {getAlertTypeIcon(alert.alert_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {getSeverityText(alert.severity)}
                            </Badge>
                            {alert.is_active && (
                              <Badge variant="destructive">
                                ACTIVE
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Zone: {alert.zone?.name || 'Unknown'}</span>
                            <span>Time: {new Date(alert.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    
                      <div className="flex space-x-2">
                        {alert.is_active && (
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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