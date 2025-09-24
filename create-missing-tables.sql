-- Create missing zone_access_sessions table
CREATE TABLE IF NOT EXISTS public.zone_access_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_access_id UUID NOT NULL REFERENCES public.zone_access(id),
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  visitor_id UUID NOT NULL REFERENCES public.profiles(id),
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id),
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  escort_id UUID REFERENCES public.profiles(id), -- For zones requiring escortQ
  session_metadata JSONB
);

-- Enable Row Level Security
ALTER TABLE public.zone_access_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for zone_access_sessions
CREATE POLICY "Security, reception, and admin can view all sessions" ON public.zone_access_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('security', 'reception', 'admin')
    )
  );

CREATE POLICY "Visitors can view their own sessions" ON public.zone_access_sessions
  FOR SELECT USING (
    visitor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Hosts can view sessions for their visitors" ON public.zone_access_sessions
  FOR SELECT USING (
    visit_request_id IN (
      SELECT id FROM public.visit_requests WHERE host_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create INSERT policy for zone_access_sessions
CREATE POLICY "System can insert zone access sessions" ON public.zone_access_sessions
  FOR INSERT WITH CHECK (true);

-- Create UPDATE policy for zone_access_sessions  
CREATE POLICY "Security, reception, and admin can update sessions" ON public.zone_access_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('security', 'reception', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_zone_access_sessions_active ON public.zone_access_sessions(zone_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_zone_access_sessions_visitor ON public.zone_access_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_zone_access_sessions_visit_request ON public.zone_access_sessions(visit_request_id);

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.zone_access_sessions;

-- Verify the table was created
SELECT 'zone_access_sessions table created successfully' as status;