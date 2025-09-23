-- Create face_profiles table for face recognition
CREATE TABLE IF NOT EXISTS public.face_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  face_encoding TEXT NOT NULL, -- Encrypted face descriptor
  confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.6,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create face_recognition_logs table for activity tracking
CREATE TABLE IF NOT EXISTS public.face_recognition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id TEXT NOT NULL,
  person_id TEXT,
  person_name TEXT,
  confidence DECIMAL(5,4),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bounding_box JSONB, -- {x, y, width, height}
  event_type TEXT NOT NULL CHECK (event_type IN ('face_detected', 'person_recognized', 'person_entered', 'person_left')),
  frame_data TEXT -- Base64 encoded frame (optional)
);

-- Create face_recognition_settings table for configuration
CREATE TABLE IF NOT EXISTS public.face_recognition_settings (
  id TEXT NOT NULL DEFAULT '1' PRIMARY KEY,
  detection_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  recognition_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.6,
  tracking_max_distance INTEGER NOT NULL DEFAULT 100,
  tracking_max_age INTEGER NOT NULL DEFAULT 3000,
  min_detections_for_track INTEGER NOT NULL DEFAULT 3,
  enable_logging BOOLEAN NOT NULL DEFAULT true,
  log_retention_days INTEGER NOT NULL DEFAULT 30,
  enable_frame_capture BOOLEAN NOT NULL DEFAULT false,
  encryption_key_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for face_profiles
CREATE POLICY "Admins and security can manage face profiles" ON public.face_profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'security')
  )
);

-- Create policies for face_recognition_logs
CREATE POLICY "Admins and security can view face recognition logs" ON public.face_recognition_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'security')
  )
);

CREATE POLICY "System can insert face recognition logs" ON public.face_recognition_logs
FOR INSERT WITH CHECK (true);

-- Create policies for face_recognition_settings
CREATE POLICY "Admins can manage face recognition settings" ON public.face_recognition_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_face_profiles_person_id ON public.face_profiles(person_id);
CREATE INDEX IF NOT EXISTS idx_face_profiles_active ON public.face_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_camera_id ON public.face_recognition_logs(camera_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_person_id ON public.face_recognition_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_timestamp ON public.face_recognition_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_event_type ON public.face_recognition_logs(event_type);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_face_profiles_updated_at
  BEFORE UPDATE ON public.face_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_face_recognition_settings_updated_at
  BEFORE UPDATE ON public.face_recognition_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();