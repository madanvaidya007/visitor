-- Fix RLS issues for visit_logs table
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for visit_logs
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_logs' AND policyname = 'Reception, security, and admin can view all visit logs') THEN
        CREATE POLICY "Reception, security, and admin can view all visit logs" ON public.visit_logs
        FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visit_logs' AND policyname = 'System can insert visit logs') THEN
        CREATE POLICY "System can insert visit logs" ON public.visit_logs
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create policies for zone_entry_logs (ensure INSERT policy exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zone_entry_logs' AND policyname = 'System can insert zone entry logs') THEN
        CREATE POLICY "System can insert zone entry logs" ON public.zone_entry_logs
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create policies for zone_access_sessions (ensure INSERT policy exists)  
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zone_access_sessions' AND policyname = 'System can insert zone access sessions') THEN
        CREATE POLICY "System can insert zone access sessions" ON public.zone_access_sessions
        FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'zone_access_sessions' AND policyname = 'Security, reception, and admin can update sessions') THEN
        CREATE POLICY "Security, reception, and admin can update sessions" ON public.zone_access_sessions
        FOR UPDATE USING (true);
    END IF;
END $$;

-- Insert default face recognition settings
INSERT INTO public.face_recognition_settings (id) 
VALUES ('1') 
ON CONFLICT (id) DO NOTHING;