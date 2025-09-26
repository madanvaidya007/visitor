import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestGuard() {
  try {
    console.log('Creating test guard record...');
    
    // First, get the current user (you'll need to authenticate first)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      console.log('Please make sure you are logged in to the application first.');
      return;
    }
    
    console.log('Current user ID:', user.id);
    
    // Check if guard record already exists
    const { data: existingGuard, error: checkError } = await supabase
      .from('zone_guards')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (existingGuard) {
      console.log('Guard record already exists:', existingGuard);
      return;
    }
    
    // Get user profile for name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }
    
    // Create a test guard record
    const guardData = {
      user_id: user.id,
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
      console.error('Error creating guard record:', insertError);
      return;
    }
    
    console.log('Test guard record created successfully:', newGuard);
    
    // Also create a test zone if none exists
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id')
      .limit(1);
    
    if (!zones || zones.length === 0) {
      console.log('Creating test zone...');
      
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
        console.log('Test zone created:', newZone);
        
        // Update guard to be assigned to this zone
        const { error: updateError } = await supabase
          .from('zone_guards')
          .update({ assigned_zones: [newZone.id] })
          .eq('id', newGuard.id);
        
        if (updateError) {
          console.error('Error assigning guard to zone:', updateError);
        } else {
          console.log('Guard assigned to test zone successfully');
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestGuard();