const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabaseIssues() {
  console.log('🔧 Fixing database schema issues...');
  
  try {
    // 1. Create documents table if it doesn't exist
    console.log('📄 Creating documents table...');
    const { error: documentsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create document types enum (only if they don't exist)
        DO $$ BEGIN
            CREATE TYPE public.document_type AS ENUM ('id_proof', 'photo', 'nda', 'insurance', 'other');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
            CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
            CREATE TYPE public.document_category AS ENUM ('required', 'optional', 'archived');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;

        -- Create documents table
        CREATE TABLE IF NOT EXISTS public.documents (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          visit_request_id UUID REFERENCES public.visit_requests(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          type document_type NOT NULL,
          category document_category NOT NULL DEFAULT 'optional',
          status document_status NOT NULL DEFAULT 'pending',
          file_url TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type TEXT,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          expires_at TIMESTAMP WITH TIME ZONE,
          verified_by UUID REFERENCES public.profiles(id),
          verified_at TIMESTAMP WITH TIME ZONE,
          rejection_reason TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
        CREATE INDEX IF NOT EXISTS idx_documents_visit_request_id ON public.documents(visit_request_id);
        CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
        CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
        CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at);

        -- Enable Row Level Security
        ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
      `
    });

    if (documentsError) {
      console.error('❌ Error creating documents table:', documentsError);
    } else {
      console.log('✅ Documents table created successfully');
    }

    // 2. Create get_zone_statistics function
    console.log('📊 Creating get_zone_statistics function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION public.get_zone_statistics()
        RETURNS TABLE (
          total_zones INTEGER,
          active_zones INTEGER,
          restricted_zones INTEGER,
          current_visitors INTEGER,
          zones_at_capacity INTEGER,
          active_alerts INTEGER
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            (SELECT COUNT(*)::INTEGER FROM public.zones) as total_zones,
            (SELECT COUNT(*)::INTEGER FROM public.zones WHERE is_active = true) as active_zones,
            (SELECT COUNT(*)::INTEGER FROM public.zones WHERE zone_type IN ('restricted', 'server_room')) as restricted_zones,
            (SELECT COALESCE(SUM(current_count), 0)::INTEGER FROM public.zone_occupancy) as current_visitors,
            (SELECT COUNT(*)::INTEGER FROM public.zone_occupancy zo 
             JOIN public.zones z ON z.id = zo.zone_id 
             WHERE zo.current_count >= z.max_capacity AND z.max_capacity IS NOT NULL) as zones_at_capacity,
            (SELECT COUNT(*)::INTEGER FROM public.zone_alerts WHERE is_active = true) as active_alerts;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
      `
    });

    if (functionError) {
      console.error('❌ Error creating get_zone_statistics function:', functionError);
    } else {
      console.log('✅ get_zone_statistics function created successfully');
    }

    // 3. Check if visit_requests table has proper foreign key constraints
    console.log('🔗 Checking visit_requests foreign key constraints...');
    const { data: constraintData, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, table_name')
      .eq('table_name', 'visit_requests')
      .eq('constraint_type', 'FOREIGN KEY');

    if (constraintError) {
      console.error('❌ Error checking constraints:', constraintError);
    } else {
      console.log('✅ Foreign key constraints checked');
      console.log('Constraints found:', constraintData);
    }

    console.log('🎉 Database schema fixes completed!');
    
  } catch (error) {
    console.error('❌ Error fixing database issues:', error);
  }
}

// Alternative approach: Direct SQL execution without RPC
async function directSQLFix() {
  console.log('🔧 Attempting direct SQL fixes...');
  
  try {
    // Create documents table directly
    const { error: createTableError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (createTableError && createTableError.code === 'PGRST106') {
      console.log('📄 Documents table does not exist, this is expected');
    }

    // Test get_zone_statistics function
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_zone_statistics');
    
    if (statsError) {
      console.error('❌ get_zone_statistics function error:', statsError);
    } else {
      console.log('✅ get_zone_statistics function works:', statsData);
    }

    // Test basic zone query
    const { data: zonesData, error: zonesError } = await supabase
      .from('zones')
      .select('id, name')
      .limit(5);
    
    if (zonesError) {
      console.error('❌ Zones table error:', zonesError);
    } else {
      console.log('✅ Zones table accessible:', zonesData?.length || 0, 'zones found');
    }

  } catch (error) {
    console.error('❌ Direct SQL fix error:', error);
  }
}

// Run both approaches
async function main() {
  await fixDatabaseIssues();
  await directSQLFix();
}

main().catch(console.error);