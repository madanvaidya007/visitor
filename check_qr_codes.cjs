const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function checkQRCodes() {
  try {
    console.log('Checking QR code data in visit_requests table...');
    
    const { data, error } = await supabase
      .from('visit_requests')
      .select(`
        id, 
        qr_code, 
        status,
        visitor:profiles!visit_requests_visitor_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching data:', error);
      return;
    }
    
    console.log('Recent visit requests:');
    data.forEach((request, index) => {
      console.log(`${index + 1}. ID: ${request.id}`);
      console.log(`   Visitor: ${request.visitor?.full_name || 'N/A'}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   QR Code: ${request.qr_code ? 'Present (' + request.qr_code.length + ' chars)' : 'Missing'}`);
      if (request.qr_code) {
        console.log(`   QR Code starts with: ${request.qr_code.substring(0, 50)}...`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkQRCodes();