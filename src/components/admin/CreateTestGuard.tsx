import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, User, CheckCircle } from 'lucide-react';
import { CustomLogo } from '@/components/ui/CustomLogo';

export function CreateTestGuard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [guardCreated, setGuardCreated] = useState(false);

  const createTestGuard = async () => {
    if (!profile?.id) {
      toast({
        title: 'Error',
        description: 'User profile not found',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if guard record already exists
      const { data: existingGuard, error: checkError } = await supabase
        .from('zone_guards')
        .select('*')
        .eq('user_id', profile.user_id)
        .single();

      if (existingGuard) {
        toast({
          title: 'Guard Already Exists',
          description: 'A guard record already exists for this user',
        });
        setGuardCreated(true);
        return;
      }

      // Create a test guard record
      const guardData = {
        user_id: profile.user_id,
        guard_name: profile.full_name || 'Test Guard',
        employee_id: `GUARD-${Date.now()}`,
        assigned_zones: [], // Empty array for now
        is_on_duty: true,
        shift_start: '09:00:00',
        shift_end: '17:00:00',
        contact_info: {
          email: profile.email,
          phone: '+1234567890'
        },
        permissions: [
          {
            action: 'scan_qr',
            zones: [],
            isActive: true
          },
          {
            action: 'verify_visitor',
            zones: [],
            isActive: true
          }
        ]
      };

      const { data: newGuard, error: insertError } = await supabase
        .from('zone_guards')
        .insert([guardData])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Check if any zones exist, if not create a test zone
      const { data: zones, error: zonesError } = await supabase
        .from('zones')
        .select('id')
        .limit(1);

      if (!zones || zones.length === 0) {
        // Create a test zone
        const { data: newZone, error: zoneError } = await supabase
          .from('zones')
          .insert([{
            name: 'Test Security Zone',
            description: 'A test zone for guard dashboard',
            location: 'Building A, Floor 1',
            floor: '1',
            building: 'Building A',
            capacity: 50,
            current_occupancy: 0,
            is_active: true,
            access_level: 'restricted'
          }])
          .select()
          .single();

        if (zoneError) {
          console.error('Error creating test zone:', zoneError);
        } else {
          // Update guard to be assigned to this zone
          await supabase
            .from('zone_guards')
            .update({ assigned_zones: [newZone.id] })
            .eq('id', newGuard.id);
        }
      } else if (zones.length > 0) {
        // Assign guard to the first available zone
        await supabase
          .from('zone_guards')
          .update({ assigned_zones: [zones[0].id] })
          .eq('id', newGuard.id);
      }

      setGuardCreated(true);
      toast({
        title: 'Success',
        description: 'Test guard record created successfully! You can now access the guard dashboard.',
      });

    } catch (error: any) {
      console.error('Error creating guard record:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create guard record',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (guardCreated) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Guard Record Created
          </CardTitle>
          <CardDescription>
            Your guard record has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CustomLogo className="h-4 w-4" />
            <AlertDescription>
              You can now access the guard dashboard at <strong>/guard-dashboard</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Create Test Guard
        </CardTitle>
        <CardDescription>
          Create a test guard record to access the guard dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <CustomLogo className="h-4 w-4" />
          <AlertDescription>
            This will create a guard record for your current user account, allowing you to access the guard/security panel.
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={createTestGuard} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Creating...' : 'Create Guard Record'}
        </Button>
      </CardContent>
    </Card>
  );
}