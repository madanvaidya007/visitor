-- Create enum types for the access management system
CREATE TYPE public.user_role AS ENUM ('visitor', 'host', 'reception', 'admin', 'security');
CREATE TYPE public.visit_status AS ENUM ('pending', 'approved', 'rejected', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE public.zone_type AS ENUM ('lobby', 'office', 'meeting_room', 'lab', 'server_room', 'parking', 'restricted');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  id_proof_url TEXT,
  photo_url TEXT,
  role user_role NOT NULL DEFAULT 'visitor',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create zones table for area management
CREATE TABLE public.zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  zone_type zone_type NOT NULL,
  max_capacity INTEGER,
  requires_escort BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create visit requests table
CREATE TABLE public.visit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES public.profiles(id),
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  purpose TEXT NOT NULL,
  visit_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status visit_status DEFAULT 'pending',
  notes TEXT,
  rejection_reason TEXT,
  qr_code TEXT,
  documents_uploaded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create zone access table for visit permissions
CREATE TABLE public.zone_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.zones(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id)
);

-- Create visit logs for check-in/check-out tracking
CREATE TABLE public.visit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id),
  zone_id UUID REFERENCES public.zones(id),
  action TEXT NOT NULL, -- 'check_in', 'check_out', 'zone_entry', 'zone_exit'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and reception can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'reception')
    )
  );

-- Create policies for zones
CREATE POLICY "All authenticated users can view zones" ON public.zones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage zones" ON public.zones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Create policies for visit requests
CREATE POLICY "Visitors can view their own requests" ON public.visit_requests
  FOR SELECT USING (
    visitor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can view requests assigned to them" ON public.visit_requests
  FOR SELECT USING (
    host_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Visitors can create requests" ON public.visit_requests
  FOR INSERT WITH CHECK (
    visitor_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update requests assigned to them" ON public.visit_requests
  FOR UPDATE USING (
    host_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Reception, security, and admin can view all requests" ON public.visit_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('reception', 'security', 'admin')
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visit_requests_updated_at
  BEFORE UPDATE ON public.visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default zones
INSERT INTO public.zones (name, description, zone_type, max_capacity) VALUES
  ('Main Lobby', 'Main entrance and waiting area', 'lobby', 50),
  ('Reception', 'Reception and front desk area', 'office', 10),
  ('Conference Room A', 'Large conference room', 'meeting_room', 20),
  ('Conference Room B', 'Small meeting room', 'meeting_room', 8),
  ('Office Floor 1', 'General office area - Floor 1', 'office', 100),
  ('Office Floor 2', 'General office area - Floor 2', 'office', 100),
  ('R&D Lab', 'Research and development laboratory', 'lab', 15),
  ('Server Room', 'Data center and server room', 'server_room', 5),
  ('Parking Garage', 'Underground parking facility', 'parking', 200);

-- Create function to generate QR code data
CREATE OR REPLACE FUNCTION public.generate_qr_code(visit_request_id UUID)
RETURNS TEXT AS $$
DECLARE
  qr_data TEXT;
BEGIN
  SELECT 
    'VIS-' || EXTRACT(EPOCH FROM now())::TEXT || '-' || visit_request_id::TEXT
  INTO qr_data;
  
  UPDATE public.visit_requests 
  SET qr_code = qr_data 
  WHERE id = visit_request_id;
  
  RETURN qr_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;