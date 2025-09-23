-- Fix RLS issues for visit_logs table
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for visit_logs
CREATE POLICY "Reception, security, and admin can view all visit logs" ON public.visit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('reception', 'security', 'admin')
  )
);

CREATE POLICY "System can insert visit logs" ON public.visit_logs
FOR INSERT WITH CHECK (true);

-- Create policies for zone_entry_logs (ensure INSERT policy exists)
CREATE POLICY "System can insert zone entry logs" ON public.zone_entry_logs
FOR INSERT WITH CHECK (true);

-- Create policies for zone_access_sessions (ensure INSERT policy exists)  
CREATE POLICY "System can insert zone access sessions" ON public.zone_access_sessions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Security, reception, and admin can update sessions" ON public.zone_access_sessions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('security', 'reception', 'admin')
  )
);

-- Insert default face recognition settings
INSERT INTO public.face_recognition_settings (id) 
VALUES ('1') 
ON CONFLICT (id) DO NOTHING;