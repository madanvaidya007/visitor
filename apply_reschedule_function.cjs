const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRescheduleFunction() {
  console.log('🔧 Applying reschedule_visit function...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_reschedule_function.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          // Use a simple query for DDL statements
          const { error } = await supabase
            .from('_dummy_table_that_does_not_exist')
            .select('*')
            .limit(0);
          
          // Since we can't execute DDL directly, we'll use the RPC approach
          // But first let's try a different approach - using the SQL editor endpoint
          
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify({ sql: statement })
          });
          
          if (!response.ok) {
            console.log(`⚠️ Statement ${i + 1} might have failed, continuing...`);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (error) {
          console.log(`⚠️ Statement ${i + 1} error (continuing):`, error.message);
        }
      }
    }
    
    console.log('🧪 Testing function availability...');
    
    // Test the function
    const { data, error } = await supabase.rpc('reschedule_visit', {
      p_visit_request_id: '00000000-0000-0000-0000-000000000000',
      p_new_visit_date: '2024-12-31',
      p_new_start_time: '10:00:00',
      p_new_end_time: '11:00:00',
      p_reason: 'Test call',
      p_rescheduled_by: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      if (error.code === 'PGRST202') {
        console.log('❌ Function still not found in schema cache');
        console.log('💡 You may need to run this SQL manually in Supabase Dashboard > SQL Editor');
        console.log('📄 SQL file created: create_reschedule_function.sql');
      } else {
        console.log('✅ Function exists and is callable (error expected with dummy data)');
      }
    } else {
      console.log('✅ Function test successful');
    }
    
  } catch (error) {
    console.error('💥 Error applying function:', error);
  }
}

// Run the function
applyRescheduleFunction().then(() => {
  console.log('🎉 Process completed!');
}).catch(error => {
  console.error('💥 Process failed:', error);
  process.exit(1);
});