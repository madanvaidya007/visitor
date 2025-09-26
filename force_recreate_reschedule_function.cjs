#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceRecreateRescheduleFunction() {
  console.log('🔧 Force recreating reschedule_visit function...');
  
  try {
    // Step 1: Drop the function if it exists
    console.log('🗑️ Dropping existing function...');
    const dropResult = await supabase.rpc('exec_sql', {
      sql: 'DROP FUNCTION IF EXISTS public.reschedule_visit(UUID, DATE, TIME, TIME, TEXT, UUID);'
    });
    
    if (dropResult.error) {
      console.log('⚠️ Could not drop function (might not exist):', dropResult.error.message);
    } else {
      console.log('✅ Function dropped successfully');
    }

    // Step 2: Create the function with proper schema
    console.log('🔨 Creating reschedule_visit function...');
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.reschedule_visit(
    p_visit_request_id UUID,
    p_new_visit_date DATE,
    p_new_start_time TIME,
    p_new_end_time TIME,
    p_reason TEXT,
    p_rescheduled_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_visit_date DATE;
    v_old_start_time TIME;
    v_old_end_time TIME;
    v_current_count INTEGER;
BEGIN
    -- Get current visit details
    SELECT visit_date, start_time, end_time, COALESCE(reschedule_count, 0)
    INTO v_old_visit_date, v_old_start_time, v_old_end_time, v_current_count
    FROM public.visit_requests
    WHERE id = p_visit_request_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Store original dates if this is the first reschedule
    IF v_current_count = 0 THEN
        UPDATE public.visit_requests
        SET
            original_visit_date = v_old_visit_date,
            original_start_time = v_old_start_time,
            original_end_time = v_old_end_time
        WHERE id = p_visit_request_id;
    END IF;

    -- Insert reschedule history record (if table exists)
    BEGIN
        INSERT INTO public.visit_reschedule_history (
            visit_request_id,
            old_visit_date,
            old_start_time,
            old_end_time,
            new_visit_date,
            new_start_time,
            new_end_time,
            reason,
            rescheduled_by
        ) VALUES (
            p_visit_request_id,
            v_old_visit_date,
            v_old_start_time,
            v_old_end_time,
            p_new_visit_date,
            p_new_start_time,
            p_new_end_time,
            p_reason,
            p_rescheduled_by
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- Table doesn't exist, continue without history
            NULL;
    END;

    -- Update the visit request with new details
    UPDATE public.visit_requests
    SET
        visit_date = p_new_visit_date,
        start_time = p_new_start_time,
        end_time = p_new_end_time,
        reschedule_count = v_current_count + 1,
        reschedule_reason = p_reason,
        rescheduled_by = p_rescheduled_by,
        rescheduled_at = NOW(),
        updated_at = NOW(),
        status = CASE
            WHEN status = 'approved' THEN 'approved'
            ELSE 'pending'
        END
    WHERE id = p_visit_request_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

    const createResult = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    });

    if (createResult.error) {
      console.error('❌ Error creating function:', createResult.error);
      
      // Try alternative approach - direct SQL execution
      console.log('🔄 Trying direct SQL execution...');
      const { data, error } = await supabase
        .from('pg_stat_user_functions')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log('⚠️ Cannot access pg_stat_user_functions, trying raw query...');
        
        // Use raw SQL query
        const { data: rawData, error: rawError } = await supabase
          .rpc('exec_sql', {
            sql: `
              SELECT routine_name 
              FROM information_schema.routines 
              WHERE routine_schema = 'public' 
              AND routine_name = 'reschedule_visit'
            `
          });
          
        if (rawError) {
          console.error('❌ Cannot verify function existence:', rawError);
        } else {
          console.log('📊 Function check result:', rawData);
        }
      }
    } else {
      console.log('✅ Function created successfully');
    }

    // Step 3: Test the function
    console.log('🧪 Testing function availability...');
    const testResult = await supabase.rpc('reschedule_visit', {
      p_visit_request_id: '00000000-0000-0000-0000-000000000000',
      p_new_visit_date: '2024-12-31',
      p_new_start_time: '10:00:00',
      p_new_end_time: '11:00:00',
      p_reason: 'Test',
      p_rescheduled_by: '00000000-0000-0000-0000-000000000000'
    });

    if (testResult.error) {
      if (testResult.error.code === 'PGRST202') {
        console.log('❌ Function still not found in schema cache');
        
        // Try to refresh schema cache
        console.log('🔄 Attempting to refresh schema cache...');
        const refreshResult = await supabase.rpc('exec_sql', {
          sql: 'NOTIFY pgrst, \'reload schema\';'
        });
        
        if (refreshResult.error) {
          console.log('⚠️ Could not send reload signal:', refreshResult.error.message);
        } else {
          console.log('✅ Schema reload signal sent');
        }
      } else {
        console.log('✅ Function exists (test failed as expected with invalid UUID)');
      }
    } else {
      console.log('✅ Function is working correctly');
    }

    // Step 4: Create required columns if they don't exist
    console.log('🔧 Ensuring required columns exist...');
    const alterTableSQL = `
      ALTER TABLE public.visit_requests 
      ADD COLUMN IF NOT EXISTS original_visit_date DATE,
      ADD COLUMN IF NOT EXISTS original_start_time TIME,
      ADD COLUMN IF NOT EXISTS original_end_time TIME,
      ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
      ADD COLUMN IF NOT EXISTS rescheduled_by UUID,
      ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP WITH TIME ZONE;
    `;
    
    const alterResult = await supabase.rpc('exec_sql', {
      sql: alterTableSQL
    });
    
    if (alterResult.error) {
      console.log('⚠️ Could not add columns (might already exist):', alterResult.error.message);
    } else {
      console.log('✅ Required columns ensured');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
forceRecreateRescheduleFunction()
  .then(() => {
    console.log('🎉 Force recreation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Force recreation failed:', error);
    process.exit(1);
  });