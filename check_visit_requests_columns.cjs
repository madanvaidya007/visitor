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
    // Query the information_schema to get column details
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'visit_requests')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (error) {
      console.error('❌ Error querying columns:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ No columns found for visit_requests table');
      return;
    }

    console.log('📋 Current columns in visit_requests table:');
    console.log('=' .repeat(80));
    
    data.forEach((column, index) => {
      console.log(`${index + 1}. ${column.column_name}`);
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Nullable: ${column.is_nullable}`);
      console.log(`   Default: ${column.column_default || 'None'}`);
      console.log('');
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

    console.log('🔍 Checking for reschedule-related columns:');
    console.log('=' .repeat(50));
    
    rescheduleColumns.forEach(colName => {
      const exists = data.some(col => col.column_name === colName);
      console.log(`${exists ? '✅' : '❌'} ${colName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });

    const missingColumns = rescheduleColumns.filter(colName => 
      !data.some(col => col.column_name === colName)
    );

    if (missingColumns.length > 0) {
      console.log('\n🚨 Missing columns that need to be added:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      
      console.log('\n💡 Recommendation: Run the create_reschedule_function.sql script to add missing columns');
    } else {
      console.log('\n✅ All reschedule columns are present!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkVisitRequestsColumns();