import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, AlertTriangle, Shield, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmailService } from '@/hooks/useEmailService';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';

export function EmailTestPanel() {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testType, setTestType] = useState('visitor_invitation');
  const [customMessage, setCustomMessage] = useState('');
  const { toast } = useToast();
  const { 
    sendVisitorInvitation, 
    sendVisitApproval, 
    sendHostNotification, 
    sendTestEmail,
    isLoading 
  } = useEmailService();
  
  const {
    sendSecurityAlert,
    sendSystemAlert,
    sendEmergencyAlert,
    sendUnauthorizedAccessAlert,
    sendSystemErrorAlert,
    sendCapacityAlert,
    sendEvacuationAlert,
    sendOverdueVisitorAlert
  } = useAdminNotifications();

  const handleTestEmail = async () => {
    try {
      switch (testType) {
        case 'visitor_invitation':
          await sendVisitorInvitation({
            visitorName: 'John Doe',
            visitorEmail: testEmail,
            hostName: 'Jane Smith',
            visitDate: new Date().toISOString().split('T')[0],
            visitTime: '14:00',
            purpose: 'Business Meeting',
            location: 'Conference Room A',
            qrCode: 'TEST_QR_CODE_123',
            instructions: customMessage || 'Please arrive 10 minutes early and bring a valid ID.'
          });
          break;

        case 'visit_approval':
          await sendVisitApproval({
            visitorName: 'John Doe',
            visitorEmail: testEmail,
            hostName: 'Jane Smith',
            visitDate: new Date().toISOString().split('T')[0],
            visitTime: '14:00',
            purpose: 'Business Meeting',
            location: 'Conference Room A',
            qrCode: 'APPROVED_QR_CODE_456',
            instructions: customMessage || 'Your visit has been approved. Please show this QR code at reception.'
          });
          break;

        case 'host_notification':
          await sendHostNotification({
            hostName: 'Jane Smith',
            hostEmail: testEmail,
            visitorName: 'John Doe',
            action: 'checked_in',
            timestamp: new Date().toISOString(),
            location: 'Main Lobby',
            additionalInfo: customMessage || 'Visitor has arrived and checked in successfully.'
          });
          break;

        case 'security_alert':
          await sendSecurityAlert({
            alertType: 'unauthorized_access',
            severity: 'high',
            location: 'Secure Zone A',
            description: customMessage || 'Unauthorized access attempt detected',
            timestamp: new Date().toISOString(),
            actionRequired: 'Immediate security response required'
          });
          break;

        case 'system_alert':
          await sendSystemAlert({
            alertType: 'system_error',
            severity: 'medium',
            component: 'Email Service',
            description: customMessage || 'System performance degradation detected',
            timestamp: new Date().toISOString(),
            actionRequired: 'Monitor system performance'
          });
          break;

        case 'emergency_alert':
          await sendEmergencyAlert({
            alertType: 'evacuation',
            severity: 'critical',
            location: 'Building A',
            description: customMessage || 'Emergency evacuation required',
            timestamp: new Date().toISOString(),
            actionRequired: 'Immediate evacuation of all personnel'
          });
          break;

        case 'unauthorized_access':
          await sendUnauthorizedAccessAlert('Secure Zone B', 'Unknown Individual', customMessage);
          break;

        case 'system_error':
          await sendSystemErrorAlert('Database Connection', customMessage || 'Connection timeout error');
          break;

        case 'capacity_alert':
          await sendCapacityAlert('Conference Room A', 25, 30);
          break;

        case 'evacuation_alert':
          await sendEvacuationAlert('Building A', customMessage || 'Fire alarm activated');
          break;

        case 'overdue_visitor':
          await sendOverdueVisitorAlert('John Doe', 'Conference Room A', 'Jane Smith');
          break;

        case 'basic_test':
        default:
          await sendTestEmail(testEmail);
          break;
      }

      toast({
        title: 'Test email sent successfully',
        description: `${testType.replace('_', ' ')} email sent to ${testEmail}`,
      });
    } catch (error) {
      console.error('Test email failed:', error);
      toast({
        title: 'Test email failed',
        description: 'Failed to send test email. Please check your configuration.',
        variant: 'destructive'
      });
    }
  };

  const testOptions = [
    { value: 'basic_test', label: 'Basic Test Email', icon: Mail },
    { value: 'visitor_invitation', label: 'Visitor Invitation', icon: Users },
    { value: 'visit_approval', label: 'Visit Approval', icon: Users },
    { value: 'host_notification', label: 'Host Notification', icon: Users },
    { value: 'security_alert', label: 'Security Alert', icon: Shield },
    { value: 'system_alert', label: 'System Alert', icon: AlertTriangle },
    { value: 'emergency_alert', label: 'Emergency Alert', icon: AlertTriangle },
    { value: 'unauthorized_access', label: 'Unauthorized Access Alert', icon: Shield },
    { value: 'system_error', label: 'System Error Alert', icon: AlertTriangle },
    { value: 'capacity_alert', label: 'Capacity Alert', icon: Users },
    { value: 'evacuation_alert', label: 'Evacuation Alert', icon: AlertTriangle },
    { value: 'overdue_visitor', label: 'Overdue Visitor Alert', icon: Clock }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Testing Panel
        </CardTitle>
        <CardDescription>
          Test all email notification types to verify functionality and templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="test-email">Test Email Address</Label>
          <Input
            id="test-email"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter email address to receive test"
          />
        </div>

        <div>
          <Label htmlFor="test-type">Email Type</Label>
          <Select value={testType} onValueChange={setTestType}>
            <SelectTrigger>
              <SelectValue placeholder="Select email type to test" />
            </SelectTrigger>
            <SelectContent>
              {testOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="custom-message">Custom Message (Optional)</Label>
          <Textarea
            id="custom-message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add custom message or leave blank for default content"
            rows={3}
          />
        </div>

        <Button 
          onClick={handleTestEmail} 
          disabled={isLoading || !testEmail}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? 'Sending...' : 'Send Test Email'}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p><strong>Note:</strong> Make sure email configuration is properly set up in System Settings before testing.</p>
          <p>Different email types will use sample data for testing purposes.</p>
        </div>
      </CardContent>
    </Card>
  );
}