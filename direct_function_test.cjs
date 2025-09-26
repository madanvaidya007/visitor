#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRescheduleFunction() {
  console.log('🧪 Testing reschedule_visit function directly...');
  
  try {
    // Test the function with a dummy UUID that won't exist
    const testResult = await supabase.rpc('reschedule_visit', {
      p_visit_request_id: '00000000-0000-0000-0000-000000000000',
      p_new_visit_date: '2024-12-31',
      p_new_start_time: '10:00:00',
      p_new_end_time: '11:00:00',
      p_reason: 'Test call',
      p_rescheduled_by: '00000000-0000-0000-0000-000000000000'
    });

    if (testResult.error) {
      console.log('❌ Function call error:', testResult.error);
      
      if (testResult.error.code === 'PGRST202') {
        console.log('🔍 Function not found in schema cache');
        return false;
      } else {
        console.log('✅ Function exists but returned an error (expected with dummy data)');
        return true;
      }
    } else {
      console.log('✅ Function call successful:', testResult.data);
      return true;
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

// Test if we can access visit_requests table
async function testTableAccess() {
  console.log('🔍 Testing visit_requests table access...');
  
  try {
    const { data, error } = await supabase
      .from('visit_requests')
      .select('id')
      .limit(1);
      
    if (error) {
      console.log('❌ Cannot access visit_requests table:', error);
      return false;
    } else {
      console.log('✅ Can access visit_requests table');
      return true;
    }
  } catch (error) {
    console.error('💥 Unexpected error accessing table:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting function and table tests...\n');
  
  const tableAccess = await testTableAccess();
  console.log('');
  
  const functionExists = await testRescheduleFunction();
  console.log('');
  
  console.log('📊 Test Results:');
  console.log(`   Table Access: ${tableAccess ? '✅' : '❌'}`);
  console.log(`   Function Exists: ${functionExists ? '✅' : '❌'}`);
  
  if (!functionExists) {
    console.log('\n🔧 Recommendations:');
    console.log('   1. The reschedule_visit function is not available in the schema cache');
    console.log('   2. This might be due to:');
    console.log('      - Function not created in the database');
    console.log('      - Schema cache not refreshed');
    console.log('      - Permission issues');
    console.log('   3. Try running the migration manually in Supabase dashboard');
  }
}

runTests()
  .then(() => {
    console.log('\n🎉 Tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Tests failed:', error);
    process.exit(1);
  });