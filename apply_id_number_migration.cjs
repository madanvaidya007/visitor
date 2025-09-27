const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyIdNumberMigration() {
  console.log('🔧 Applying id_number column migration...\n');
  
  try {
    // First, test if we can access the visit_requests table
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('visit_requests')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Cannot access visit_requests table:', testError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Check if id_number column already exists
    console.log('🔍 Checking if id_number column exists...');
    const { data: columnTest, error: columnError } = await supabase
      .from('visit_requests')
      .select('id_number')
      .limit(1);
      
    if (!columnError) {
      console.log('✅ id_number column already exists!');
      console.log('🎉 No migration needed - registration should work now');
      return;
    }
    
    if (!columnError.message.includes('id_number')) {
      console.error('❌ Unexpected error:', columnError.message);
      return;
    }
    
    console.log('📝 id_number column missing, attempting to add it...');
    
    // Since we can't execute DDL directly through the client, we'll provide instructions
    console.log('\n🔧 Manual Migration Required:');
    console.log('The id_number column needs to be added manually through Supabase Dashboard.');
    console.log('\nSteps:');
    console.log('1. Open your Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Run this SQL command:');
    console.log('\n' + '='.repeat(60));
    console.log('ALTER TABLE public.visit_requests');
    console.log('ADD COLUMN IF NOT EXISTS id_number TEXT;');
    console.log('\n-- Optional: Add index for better performance');
    console.log('CREATE INDEX IF NOT EXISTS idx_visit_requests_id_number');
    console.log('ON public.visit_requests(id_number);');
    console.log('='.repeat(60));
    
    console.log('\n📄 Alternative: The migration file has been created at:');
    console.log('   supabase/migrations/20250125000001_add_id_number_column.sql');
    console.log('\n💡 After adding the column, the registration error should be resolved.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

applyIdNumberMigration();