require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVisitRequestsColumns() {
  console.log('🔍 Checking visit_requests table columns...\n');
  
  try {
    // Try to select all columns from the table with a limit of 0 to get column info
    const { data, error } = await supabase
      .from('visit_requests')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying visit_requests table:', error);
      return;
    }

    console.log('✅ Successfully accessed visit_requests table');
    
    if (data && data.length > 0) {
      console.log('\n📋 Available columns (from sample record):');
      console.log('=' .repeat(50));
      
      const columns = Object.keys(data[0]);
      columns.forEach((column, index) => {
        console.log(`${index + 1}. ${column}`);
      });
      
      // Check for specific reschedule columns
      const rescheduleColumns = [
        'original_visit_date',
        'original_start_time', 
        'original_end_time',
        'reschedule_count',
        'reschedule_reason',
        'rescheduled_by',
        'rescheduled_at'
      ];

      console.log('\n🔍 Checking for reschedule-related columns:');
      console.log('=' .repeat(50));
      
      rescheduleColumns.forEach(colName => {
        const exists = columns.includes(colName);
        console.log(`${exists ? '✅' : '❌'} ${colName}: ${exists ? 'EXISTS' : 'MISSING'}`);
      });

      const missingColumns = rescheduleColumns.filter(colName => 
        !columns.includes(colName)
      );

      if (missingColumns.length > 0) {
        console.log('\n🚨 Missing columns that need to be added:');
        missingColumns.forEach(col => console.log(`   - ${col}`));
        
        console.log('\n💡 These columns need to be added to support rescheduling functionality');
      } else {
        console.log('\n✅ All reschedule columns are present!');
      }
      
    } else {
      console.log('⚠️  No records found in visit_requests table, trying alternative method...');
      
      // Try to insert a test record to see what columns are available
      const testColumns = [
        'visitor_id', 'host_id', 'purpose', 'visit_date', 'start_time', 'end_time',
        'reschedule_reason' // This will fail if column doesn't exist
      ];
      
      console.log('\n🧪 Testing column existence by attempting operations...');
      
      // Test if reschedule_reason column exists by trying to select it
      const { data: testData, error: testError } = await supabase
        .from('visit_requests')
        .select('reschedule_reason')
        .limit(1);
        
      if (testError) {
        if (testError.message.includes('reschedule_reason')) {
          console.log('❌ reschedule_reason column does not exist');
        } else {
          console.log('❌ Error testing reschedule_reason column:', testError.message);
        }
      } else {
        console.log('✅ reschedule_reason column exists');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkVisitRequestsColumns();