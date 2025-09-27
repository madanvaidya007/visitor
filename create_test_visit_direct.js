import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pitqelftjafwycbfecug.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdHFlbGZ0amFmd3ljYmZlY3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzIzMDYsImV4cCI6MjA3Mzk0ODMwNn0.btlHUn3Tp1R1DQqTlbq6GqlCwsLB7w70xHnZWOtfCn0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  try {
    console.log('🔍 Checking existing profiles...');
    
    // Check if there are any profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log('📋 Found profiles:', profiles?.length || 0);
    
    if (profiles && profiles.length > 0) {
      console.log('👥 Existing profiles:');
      profiles.forEach(p => {
        console.log(`  - ${p.full_name} (${p.email}) - Role: ${p.role}`);
      });
    }
    
    // Create test visitor profile if none exists
    let visitorProfile = profiles?.find(p => p.role === 'visitor');
    
    if (!visitorProfile) {
      console.log('🔧 Creating test visitor profile...');
      
      const { data: newVisitor, error: visitorError } = await supabase
        .from('profiles')
        .insert({
          user_id: 'test-visitor-' + Date.now(),
          full_name: 'Test Visitor',
          email: 'testvisitor@example.com',
          role: 'visitor',
          company: 'Test Visitor Company',
          phone: '+1234567890',
          is_active: true
        })
        .select()
        .single();
      
      if (visitorError) {
        console.error('❌ Error creating visitor:', visitorError);
        return;
      }
      
      visitorProfile = newVisitor;
      console.log('✅ Created visitor profile:', visitorProfile.full_name);
    } else {
      console.log('✅ Using existing visitor:', visitorProfile.full_name);
    }
    
    // Create test host profile if none exists
    let hostProfile = profiles?.find(p => p.role === 'host');
    
    if (!hostProfile) {
      console.log('🔧 Creating test host profile...');
      
      const { data: newHost, error: hostError } = await supabase
        .from('profiles')
        .insert({
          user_id: 'test-host-' + Date.now(),
          full_name: 'Test Host',
          email: 'testhost@example.com',
          role: 'host',
          company: 'Test Host Company',
          phone: '+0987654321',
          is_active: true
        })
        .select()
        .single();
      
      if (hostError) {
        console.error('❌ Error creating host:', hostError);
        return;
      }
      
      hostProfile = newHost;
      console.log('✅ Created host profile:', hostProfile.full_name);
    } else {
      console.log('✅ Using existing host:', hostProfile.full_name);
    }
    
    // Check existing visit requests
    const { data: existingVisits, error: existingError } = await supabase
      .from('visit_requests')
      .select('*')
      .eq('visitor_id', visitorProfile.id);
    
    if (existingError) {
      console.error('❌ Error checking existing visits:', existingError);
      return;
    }
    
    console.log('📋 Existing visits for visitor:', existingVisits?.length || 0);
    
    // Create test visit requests
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const visitRequests = [
      {
        visitor_id: visitorProfile.id,
        host_id: hostProfile.id,
        purpose: 'Business Meeting - QR Test',
        visit_date: tomorrow.toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '11:00:00',
        status: 'approved',
        qr_code: `PASS-${Date.now()}-${visitorProfile.id.substring(0, 8)}`
      },
      {
        visitor_id: visitorProfile.id,
        host_id: hostProfile.id,
        purpose: 'Project Discussion',
        visit_date: tomorrow.toISOString().split('T')[0],
        start_time: '14:00:00',
        end_time: '15:30:00',
        status: 'approved',
        qr_code: `PASS-${Date.now() + 1}-${visitorProfile.id.substring(0, 8)}`
      }
    ];
    
    console.log('🔧 Creating test visit requests...');
    
    for (const visitData of visitRequests) {
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
        console.error('Visit data:', visitData);
      } else {
        console.log('✅ Created visit request:', {
          id: newVisit.id,
          purpose: newVisit.purpose,
          date: newVisit.visit_date,
          time: `${newVisit.start_time} - ${newVisit.end_time}`,
          qr_code: newVisit.qr_code
        });
      }
    }
    
    console.log('🎉 Test data creation completed!');
    console.log('📝 Summary:');
    console.log(`  - Visitor: ${visitorProfile.full_name} (${visitorProfile.email})`);
    console.log(`  - Host: ${hostProfile.full_name} (${hostProfile.email})`);
    console.log(`  - Visit requests created: ${visitRequests.length}`);
    console.log('');
    console.log('🔑 To test QR generation:');
    console.log('1. Log in to the application as the visitor');
    console.log('2. Go to the visitor dashboard');
    console.log('3. Click "My Digital Pass"');
    console.log('4. The QR code should now generate successfully!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the function
createTestData();