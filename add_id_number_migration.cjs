const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addIdNumberColumn() {
  console.log('🔧 Adding id_number column to visit_requests table...\n');
  
  try {
    // First, check if the column already exists by trying to select it
    console.log('🔍 Checking if id_number column already exists...');
    const { data: testData, error: testError } = await supabase
      .from('visit_requests')
      .select('id_number')
      .limit(1);
      
    if (!testError) {
      console.log('✅ id_number column already exists!');
      return;
    }
    
    if (testError && !testError.message.includes('id_number')) {
      console.error('❌ Unexpected error checking column:', testError);
      return;
    }
    
    console.log('📝 id_number column does not exist, adding it...');
    
    // Try to add the column using a direct approach
    // Since we can't use DDL directly, we'll use the approach from other migration scripts
    const addColumnSQL = `
      ALTER TABLE public.visit_requests 
      ADD COLUMN IF NOT EXISTS id_number TEXT;
    `;
    
    // Try using the rpc approach first
    try {
      const { error: rpcError } = await supabase.rpc('exec_sql', { 
        sql: addColumnSQL 
      });
      
      if (rpcError) {
        console.log('⚠️  RPC approach failed, this is expected for some Supabase setups');
        console.log('Error:', rpcError.message);
      } else {
        console.log('✅ Column added successfully via RPC');
      }
    } catch (rpcErr) {
      console.log('⚠️  RPC method not available, this is normal');
    }
    
    // Test if the column was added
    console.log('🧪 Testing if id_number column was added...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('visit_requests')
      .select('id_number')
      .limit(1);
      
    if (verifyError) {
      if (verifyError.message.includes('id_number')) {
        console.log('❌ id_number column still missing - manual intervention required');
        console.log('');
        console.log('🔧 Manual Steps:');
        console.log('1. Open Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Run this SQL command:');
        console.log('   ALTER TABLE public.visit_requests ADD COLUMN IF NOT EXISTS id_number TEXT;');
        console.log('');
        console.log('📄 Or run the SQL file: add_id_number_column.sql');
      } else {
        console.log('⚠️  Error testing column:', verifyError.message);
      }
    } else {
      console.log('✅ id_number column successfully added!');
      console.log('🎉 Registration should now work without schema errors');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('');
    console.log('🔧 Manual fallback required:');
    console.log('Please run the SQL file add_id_number_column.sql in Supabase Dashboard');
  }
}

addIdNumberColumn();