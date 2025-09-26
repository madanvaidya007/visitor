import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addIsBusyColumn() {
  try {
    console.log('🔧 Adding is_busy column to profiles table...');
    
    // Add the columns using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add is_busy column and related fields to profiles table if they don't exist
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS busy_message TEXT,
        ADD COLUMN IF NOT EXISTS busy_until TIMESTAMP WITH TIME ZONE;

        -- Create index for efficient querying of busy hosts
        CREATE INDEX IF NOT EXISTS idx_profiles_is_busy ON public.profiles(is_busy) WHERE role = 'host';
      `
    });

    if (error) {
      // Try alternative approach using direct SQL execution
      console.log('Trying alternative approach...');
      
      const queries = [
        "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false",
        "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_message TEXT",
        "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_until TIMESTAMP WITH TIME ZONE",
        "CREATE INDEX IF NOT EXISTS idx_profiles_is_busy ON public.profiles(is_busy) WHERE role = 'host'"
      ];

      for (const query of queries) {
        try {
          const { error: queryError } = await supabase.from('profiles').select('id').limit(0);
          if (queryError) {
            console.log(`Executing: ${query}`);
            // This is a workaround - we'll need to use the Supabase dashboard or CLI
            console.log('⚠️  Cannot execute DDL statements with the current API key.');
            console.log('Please run the following SQL in your Supabase SQL Editor:');
            console.log('\n--- SQL to run in Supabase Dashboard ---');
            console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false;');
            console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_message TEXT;');
            console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_until TIMESTAMP WITH TIME ZONE;');
            console.log('CREATE INDEX IF NOT EXISTS idx_profiles_is_busy ON public.profiles(is_busy) WHERE role = \'host\';');
            console.log('--- End SQL ---\n');
            return;
          }
        } catch (err) {
          console.error(`Error executing query: ${query}`, err);
        }
      }
    } else {
      console.log('✅ Successfully added is_busy column to profiles table');
    }

    // Test if the column exists by trying to select it
    console.log('🧪 Testing if columns were added...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id, is_busy, busy_message, busy_until')
      .limit(1);

    if (testError) {
      console.error('❌ Column still missing:', testError.message);
      console.log('\n📋 Manual steps required:');
      console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the following SQL:');
      console.log('\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false;');
      console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_message TEXT;');
      console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_until TIMESTAMP WITH TIME ZONE;');
      console.log('CREATE INDEX IF NOT EXISTS idx_profiles_is_busy ON public.profiles(is_busy) WHERE role = \'host\';');
    } else {
      console.log('✅ Columns are now available in the profiles table');
      console.log('📊 Test query successful');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Manual steps required:');
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL:');
    console.log('\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false;');
    console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_message TEXT;');
    console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS busy_until TIMESTAMP WITH TIME ZONE;');
    console.log('CREATE INDEX IF NOT EXISTS idx_profiles_is_busy ON public.profiles(is_busy) WHERE role = \'host\';');
  }
}

addIsBusyColumn();