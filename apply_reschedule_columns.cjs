require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRescheduleColumns() {
  console.log('🔧 Adding reschedule columns to visit_requests table...\n');
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'add_reschedule_columns.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL content to execute:');
    console.log('=' .repeat(60));
    console.log(sqlContent);
    console.log('=' .repeat(60));
    console.log('');

    // Split SQL into individual statements (remove comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.startsWith('COMMENT')); // Skip comment statements for now

    console.log(`🚀 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`📝 Statement ${i + 1}/${statements.length}:`);
      console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          console.log(`   ❌ Failed: ${error.message}`);
          failureCount++;
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        failureCount++;
      }
      
      console.log('');
    }

    console.log('📊 Results Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log('');

    if (failureCount > 0) {
      console.log('⚠️  Some statements failed. You may need to run them manually in Supabase Dashboard.');
      console.log('📄 The SQL file has been created: add_reschedule_columns.sql');
    }

    // Test if columns were added successfully
    console.log('🧪 Testing if columns were added...');
    const { data: testData, error: testError } = await supabase
      .from('visit_requests')
      .select('reschedule_reason')
      .limit(1);
      
    if (testError) {
      if (testError.message.includes('reschedule_reason')) {
        console.log('❌ reschedule_reason column still missing - manual intervention required');
        console.log('');
        console.log('🔧 Manual Steps:');
        console.log('1. Open Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Run the contents of add_reschedule_columns.sql');
      } else {
        console.log('⚠️  Error testing column:', testError.message);
      }
    } else {
      console.log('✅ reschedule_reason column successfully added!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyRescheduleColumns();