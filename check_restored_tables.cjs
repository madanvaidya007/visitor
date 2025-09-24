const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All expected tables
const expectedTables = [
  'profiles',
  'zones', 
  'visit_requests',
  'email_settings',
  'zone_occupancy',
  'zone_entry_logs',
  'zone_alerts',
  'zone_access_sessions',
  'face_recognition_logs',
  'email_logs'
];

async function checkRestoredTables() {
  console.log('🔍 Checking restored tables...\n');
  
  const existingTables = [];
  const missingTables = [];
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          missingTables.push(table);
          console.log(`❌ ${table} - NOT FOUND`);
        } else {
          console.log(`⚠️  ${table} - ERROR: ${error.message}`);
        }
      } else {
        existingTables.push(table);
        console.log(`✅ ${table} - EXISTS`);
      }
    } catch (err) {
      missingTables.push(table);
      console.log(`❌ ${table} - ERROR: ${err.message}`);
    }
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`✅ Restored tables (${existingTables.length}): ${existingTables.join(', ')}`);
  console.log(`❌ Missing tables (${missingTables.length}): ${missingTables.join(', ')}`);
  
  return { existingTables, missingTables };
}

checkRestoredTables()
  .then(({ existingTables, missingTables }) => {
    if (missingTables.length > 0) {
      console.log(`\n🔧 Need to restore ${missingTables.length} missing tables`);
    } else {
      console.log('\n🎉 All tables successfully restored!');
    }
  })
  .catch(console.error);