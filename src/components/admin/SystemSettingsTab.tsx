import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, Upload, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SystemSettingsTab() {
  const [settings, setSettings] = useState({
    company_name: 'Access Manager',
    company_logo: '',
    auto_approve_hosts: false,
    max_visit_duration: 8,
    require_id_upload: true,
    require_photo: false,
    notification_email: 'admin@company.com',
    sms_notifications: false,
    visitor_wifi_access: true,
    qr_code_expiry: 24,
    max_concurrent_visitors: 100,
    working_hours_start: '09:00',
    working_hours_end: '18:00'
  });
  const { toast } = useToast();

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to the database
    toast({
      title: 'Settings saved',
      description: 'System settings have been updated successfully.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Company Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Company Settings</CardTitle>
          <CardDescription>Configure your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={settings.company_name}
              onChange={(e) => handleSettingChange('company_name', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="company_logo">Company Logo</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="company_logo"
                value={settings.company_logo}
                placeholder="Logo URL or upload file"
                onChange={(e) => handleSettingChange('company_logo', e.target.value)}
              />
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="notification_email">Notification Email</Label>
            <Input
              id="notification_email"
              type="email"
              value={settings.notification_email}
              onChange={(e) => handleSettingChange('notification_email', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Visitor Management */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Management</CardTitle>
          <CardDescription>Configure visitor registration and approval settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-approve host requests</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve visit requests from verified hosts
              </p>
            </div>
            <Switch
              checked={settings.auto_approve_hosts}
              onCheckedChange={(checked) => handleSettingChange('auto_approve_hosts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require ID upload</Label>
              <p className="text-sm text-muted-foreground">
                Visitors must upload government-issued ID
              </p>
            </div>
            <Switch
              checked={settings.require_id_upload}
              onCheckedChange={(checked) => handleSettingChange('require_id_upload', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require photo</Label>
              <p className="text-sm text-muted-foreground">
                Visitors must upload a profile photo
              </p>
            </div>
            <Switch
              checked={settings.require_photo}
              onCheckedChange={(checked) => handleSettingChange('require_photo', checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_visit_duration">Max visit duration (hours)</Label>
              <Input
                id="max_visit_duration"
                type="number"
                value={settings.max_visit_duration}
                onChange={(e) => handleSettingChange('max_visit_duration', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="max_concurrent_visitors">Max concurrent visitors</Label>
              <Input
                id="max_concurrent_visitors"
                type="number"
                value={settings.max_concurrent_visitors}
                onChange={(e) => handleSettingChange('max_concurrent_visitors', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure security and access control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="qr_code_expiry">QR code expiry (hours)</Label>
            <Select 
              value={settings.qr_code_expiry.toString()} 
              onValueChange={(value) => handleSettingChange('qr_code_expiry', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="working_hours_start">Working hours start</Label>
              <Input
                id="working_hours_start"
                type="time"
                value={settings.working_hours_start}
                onChange={(e) => handleSettingChange('working_hours_start', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="working_hours_end">Working hours end</Label>
              <Input
                id="working_hours_end"
                type="time"
                value={settings.working_hours_end}
                onChange={(e) => handleSettingChange('working_hours_end', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>SMS notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send SMS alerts for important events
              </p>
            </div>
            <Switch
              checked={settings.sms_notifications}
              onCheckedChange={(checked) => handleSettingChange('sms_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Visitor WiFi access</Label>
              <p className="text-sm text-muted-foreground">
                Allow visitors to access guest WiFi network
              </p>
            </div>
            <Switch
              checked={settings.visitor_wifi_access}
              onCheckedChange={(checked) => handleSettingChange('visitor_wifi_access', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="w-full md:w-auto">
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}