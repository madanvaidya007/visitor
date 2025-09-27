const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pitqelftjafwycbfecug.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdHFlbGZ0amFmd3ljYmZlY3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzIzMDYsImV4cCI6MjA3Mzk0ODMwNn0.btlHUn3Tp1R1DQqTlbq6GqlCwsLB7w70xHnZWOtfCn0'
);

async function checkVisitStatus() {
  try {
    console.log('🔍 Checking visit requests for madan jagan vaidya...\n');
    
    const { data, error } = await supabase
      .from('visit_requests')
      .select('id, status, visitor_name, visit_date, qr_code, created_at')
      .eq('visitor_name', 'madan jagan vaidya')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (data.length === 0) {
      console.log('❌ No visit requests found for madan jagan vaidya');
      return;
    }
    
    console.log(`✅ Found ${data.length} visit request(s):\n`);
    
    data.forEach((visit, index) => {
      console.log(`${index + 1}. Visit Request:`);
      console.log(`   ID: ${visit.id}`);
      console.log(`   Status: ${visit.status}`);
      console.log(`   Date: ${visit.visit_date}`);
      console.log(`   Has QR Code: ${visit.qr_code ? 'Yes' : 'No'}`);
      console.log(`   Created: ${visit.created_at}`);
      console.log('');
    });
    
    // Check if any are approved
    const approvedVisits = data.filter(v => v.status === 'approved');
    console.log(`📊 Summary:`);
    console.log(`   Total visits: ${data.length}`);
    console.log(`   Approved visits: ${approvedVisits.length}`);
    console.log(`   Visits with QR codes: ${data.filter(v => v.qr_code).length}`);
    
    if (approvedVisits.length > 0) {
      console.log('\n✅ Approved visits should show "Generate Pass" button in reception panel');
    } else {
      console.log('\n⚠️  No approved visits found - need to approve visits first');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVisitStatus();