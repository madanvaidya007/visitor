-- =====================================================
-- FIX DATABASE ISSUES SCRIPT
-- =====================================================
-- Execute this in Supabase SQL Editor to fix all reported errors

-- 1. Create document-related enums and tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE public.document_type AS ENUM ('id_proof', 'photo', 'nda', 'insurance', 'other');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE public.document_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category') THEN
        CREATE TYPE public.document_category AS ENUM ('required', 'optional', 'archived');
    END IF;
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

-- 2. Create missing zone_access table (referenced by foreign key constraint)
CREATE TABLE IF NOT EXISTS public.zone_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id)
);

-- 3. Create visit_logs table (may be referenced)
CREATE TABLE IF NOT EXISTS public.visit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id),
  zone_id UUID REFERENCES public.zones(id),
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

-- 4. Create the get_zone_statistics function
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

-- 5. Enable Row Level Security for new tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Create basic policies for new tables
-- Documents policies
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own documents" ON public.documents
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all documents" ON public.documents
  FOR SELECT USING (true);

-- Zone access policies
CREATE POLICY "Users can view zone access" ON public.zone_access
  FOR SELECT USING (true);

CREATE POLICY "Security can manage zone access" ON public.zone_access
  FOR ALL USING (true);

-- Visit logs policies
CREATE POLICY "Security can view visit logs" ON public.visit_logs
  FOR SELECT USING (true);

CREATE POLICY "Security can insert visit logs" ON public.visit_logs
  FOR INSERT WITH CHECK (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_visit_request_id ON public.documents(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

CREATE INDEX IF NOT EXISTS idx_zone_access_visit_request_id ON public.zone_access(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_zone_access_zone_id ON public.zone_access(zone_id);

CREATE INDEX IF NOT EXISTS idx_visit_logs_visit_request_id ON public.visit_logs(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_zone_id ON public.visit_logs(zone_id);

-- 8. Initialize zone occupancy for existing zones (if not already done)
INSERT INTO public.zone_occupancy (zone_id, current_count, max_capacity)
SELECT z.id, 0, z.max_capacity
FROM public.zones z
WHERE NOT EXISTS (
    SELECT 1 FROM public.zone_occupancy zo WHERE zo.zone_id = z.id
)
ON CONFLICT (zone_id) DO NOTHING;