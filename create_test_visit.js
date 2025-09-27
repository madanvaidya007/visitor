import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pitqelftjafwycbfecug.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdHFlbGZ0amFmd3ljYmZlY3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzIzMDYsImV4cCI6MjA3Mzk0ODMwNn0.btlHUn3Tp1R1DQqTlbq6GqlCwsLB7w70xHnZWOtfCn0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestVisit() {
  try {
    console.log('🔍 Checking current authentication...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      console.log('Please make sure you are logged in to the application first.');
      return;
    }
    
    console.log('✅ Current user ID:', user.id);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }
    
    console.log('✅ User profile:', {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role
    });
    
    // Check if there are any existing visit requests for this user
    const { data: existingVisits, error: existingError } = await supabase
      .from('visit_requests')
      .select('*')
      .eq('visitor_id', profile.id);
    
    if (existingError) {
      console.error('❌ Error checking existing visits:', existingError);
      return;
    }
    
    console.log('📋 Existing visits for user:', existingVisits?.length || 0);
    
    // Find a host user (someone with role 'host')
    const { data: hostProfile, error: hostError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'host')
      .limit(1)
      .single();
    
    if (hostError) {
      console.log('⚠️ No host found, creating a test host profile...');
      
      // Create a test host profile
      const { data: newHost, error: createHostError } = await supabase
        .from('profiles')
        .insert({
          user_id: 'test-host-' + Date.now(),
          full_name: 'Test Host',
          email: 'testhost@example.com',
          role: 'host',
          company: 'Test Company'
        })
        .select()
        .single();
      
      if (createHostError) {
        console.error('❌ Error creating test host:', createHostError);
        return;
      }
      
      console.log('✅ Created test host:', newHost);
      hostProfile = newHost;
    } else {
      console.log('✅ Found host:', hostProfile.full_name);
    }
    
    // Create a test visit request
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const visitData = {
      visitor_id: profile.id,
      host_id: hostProfile.id,
      purpose: 'Test Meeting - QR Code Generation',
      visit_date: tomorrow.toISOString().split('T')[0],
      start_time: '10:00:00',
      end_time: '11:00:00',
      status: 'approved',
      qr_code: `PASS-${Date.now()}-${profile.id.substring(0, 8)}`,
      pass_generated: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('🔧 Creating test visit request:', visitData);
    
    const { data: newVisit, error: visitError } = await supabase
      .from('visit_requests')
      .insert(visitData)
      .select(`
        *,
        host:profiles!visit_requests_host_id_fkey(full_name, company),
        visitor:profiles!visit_requests_visitor_id_fkey(full_name, company)
      `)
      .single();
    
    if (visitError) {
      console.error('❌ Error creating visit request:', visitError);
      return;
    }
    
    console.log('✅ Test visit request created successfully!');
    console.log('📋 Visit details:', {
      id: newVisit.id,
      visitor: newVisit.visitor.full_name,
      host: newVisit.host.full_name,
      purpose: newVisit.purpose,
      date: newVisit.visit_date,
      time: `${newVisit.start_time} - ${newVisit.end_time}`,
      status: newVisit.status,
      qr_code: newVisit.qr_code
    });
    
    console.log('🎉 You can now test the QR code generation in the application!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the function
createTestVisit();