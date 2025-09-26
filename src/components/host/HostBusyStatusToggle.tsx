import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  MessageSquare, 
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { format, addHours, addDays } from 'date-fns';

interface HostBusyStatusToggleProps {
  isBusy?: boolean;
  busyMessage?: string;
  busyUntil?: string;
  onStatusChange?: () => void;
}

export function HostBusyStatusToggle({ 
  isBusy = false, 
  busyMessage = '', 
  busyUntil,
  onStatusChange 
}: HostBusyStatusToggleProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localIsBusy, setLocalIsBusy] = useState(isBusy);
  const [localBusyMessage, setLocalBusyMessage] = useState(busyMessage);
  const [busyDuration, setBusyDuration] = useState('1'); // hours
  const [customDateTime, setCustomDateTime] = useState('');

  const handleToggleBusyStatus = async (checked: boolean) => {
    if (!profile) return;

    setLoading(true);
    try {
      let busyUntilDate = null;
      
      if (checked) {
        if (customDateTime) {
          busyUntilDate = new Date(customDateTime).toISOString();
        } else {
          busyUntilDate = addHours(new Date(), parseInt(busyDuration)).toISOString();
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          is_busy: checked,
          busy_message: checked ? localBusyMessage || null : null,
          busy_until: busyUntilDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      setLocalIsBusy(checked);
      
      toast({
        title: checked ? 'Status Updated' : 'Status Cleared',
        description: checked 
          ? `You are now marked as busy${busyUntilDate ? ` until ${format(new Date(busyUntilDate), 'MMM dd, yyyy HH:mm')}` : ''}`
          : 'Your busy status has been cleared',
      });

      onStatusChange?.();
    } catch (error) {
      console.error('Error updating busy status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update busy status. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const quickDurationOptions = [
    { label: '30 minutes', value: '0.5' },
    { label: '1 hour', value: '1' },
    { label: '2 hours', value: '2' },
    { label: '4 hours', value: '4' },
    { label: 'Rest of day', value: 'day' },
  ];

  const handleQuickDuration = (value: string) => {
    if (value === 'day') {
      const endOfDay = new Date();
      endOfDay.setHours(18, 0, 0, 0); // 6 PM
      setCustomDateTime(endOfDay.toISOString().slice(0, 16));
    } else {
      setBusyDuration(value);
      setCustomDateTime('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Availability Status
        </CardTitle>
        <CardDescription>
          Manage your availability for new visit requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${localIsBusy ? 'bg-red-500' : 'bg-green-500'}`} />
            <div>
              <p className="font-medium">
                {localIsBusy ? 'Currently Busy' : 'Available'}
              </p>
              {localIsBusy && busyUntil && (
                <p className="text-sm text-muted-foreground">
                  Until {format(new Date(busyUntil), 'MMM dd, yyyy HH:mm')}
                </p>
              )}
            </div>
          </div>
          <Badge variant={localIsBusy ? 'destructive' : 'default'}>
            {localIsBusy ? 'BUSY' : 'AVAILABLE'}
          </Badge>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
          <div className="flex flex-col">
            <Label htmlFor="busy-toggle" className="text-base font-medium text-gray-900">
              Mark as busy
            </Label>
            <span className="text-sm text-gray-500 mt-1">
              Toggle your availability status
            </span>
          </div>
          <Switch
            id="busy-toggle"
            checked={localIsBusy}
            onCheckedChange={handleToggleBusyStatus}
            disabled={loading}
            className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-gray-200"
          />
        </div>

        {/* Busy Configuration */}
        {localIsBusy && (
          <div className="space-y-4 p-4 border rounded-lg bg-red-50/50">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Busy Status Configuration</span>
            </div>

            {/* Busy Message */}
            <div className="space-y-2">
              <Label htmlFor="busy-message" className="text-sm">
                Message for visitors (optional)
              </Label>
              <Textarea
                id="busy-message"
                placeholder="e.g., In a meeting, will respond after 3 PM"
                value={localBusyMessage}
                onChange={(e) => setLocalBusyMessage(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            {/* Duration Selection */}
            <div className="space-y-3">
              <Label className="text-sm">How long will you be busy?</Label>
              
              {/* Quick Duration Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickDurationOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDuration(option.value)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Custom Date/Time */}
              <div className="space-y-2">
                <Label htmlFor="custom-datetime" className="text-sm">
                  Or set specific end time:
                </Label>
                <Input
                  id="custom-datetime"
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            {/* Update Button */}
            <Button
              onClick={() => handleToggleBusyStatus(true)}
              disabled={loading}
              className="w-full"
              size="sm"
            >
              {loading ? 'Updating...' : 'Update Busy Status'}
            </Button>
          </div>
        )}

        {/* Info Text */}
        <div className="text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-3 w-3 mt-0.5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900 mb-1">How this works:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• When busy, new visit requests will show your status to visitors</li>
                <li>• Visitors can still submit requests but will see your busy message</li>
                <li>• Your status will automatically clear at the specified time</li>
                <li>• You can manually clear your busy status anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}