-- Face Recognition Tables Migration

-- Face profiles table for storing encrypted face descriptors
CREATE TABLE IF NOT EXISTS face_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_id TEXT NOT NULL UNIQUE,
    person_name TEXT NOT NULL,
    face_encoding TEXT NOT NULL, -- Encrypted face descriptor
    confidence_threshold DECIMAL(3,2) DEFAULT 0.6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Face recognition logs table for audit trail
CREATE TABLE IF NOT EXISTS face_recognition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    camera_id TEXT NOT NULL,
    person_id TEXT,
    person_name TEXT,
    confidence DECIMAL(4,3) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bounding_box JSONB NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('face_detected', 'person_recognized', 'person_entered', 'person_left')),
    frame_data TEXT -- Base64 encoded frame (optional)
);

-- Face recognition settings table
CREATE TABLE IF NOT EXISTS face_recognition_settings (
    id TEXT PRIMARY KEY DEFAULT '1',
    detection_threshold DECIMAL(3,2) DEFAULT 0.5,
    recognition_threshold DECIMAL(3,2) DEFAULT 0.6,
    tracking_max_distance INTEGER DEFAULT 100,
    tracking_max_age INTEGER DEFAULT 3000,
    min_detections_for_track INTEGER DEFAULT 3,
    enable_logging BOOLEAN DEFAULT TRUE,
    log_retention_days INTEGER DEFAULT 30,
    enable_frame_capture BOOLEAN DEFAULT FALSE,
    encryption_key_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_face_profiles_person_id ON face_profiles(person_id);
CREATE INDEX IF NOT EXISTS idx_face_profiles_active ON face_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_camera_id ON face_recognition_logs(camera_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_person_id ON face_recognition_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_timestamp ON face_recognition_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_face_recognition_logs_event_type ON face_recognition_logs(event_type);

-- RLS Policies
ALTER TABLE face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_recognition_settings ENABLE ROW LEVEL SECURITY;

-- Face profiles policies
CREATE POLICY "Users can view face profiles" ON face_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Security and admin can manage face profiles" ON face_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('security', 'admin')
        )
    );

-- Face recognition logs policies
CREATE POLICY "Security and admin can view logs" ON face_recognition_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('security', 'admin')
        )
    );

CREATE POLICY "System can insert logs" ON face_recognition_logs
    FOR INSERT WITH CHECK (true);

-- Face recognition settings policies
CREATE POLICY "Security and admin can view settings" ON face_recognition_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('security', 'admin')
        )
    );

CREATE POLICY "Admin can manage settings" ON face_recognition_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_face_profiles_updated_at 
    BEFORE UPDATE ON face_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_face_recognition_settings_updated_at 
    BEFORE UPDATE ON face_recognition_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get face recognition statistics
CREATE OR REPLACE FUNCTION get_face_recognition_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_profiles', (SELECT COUNT(*) FROM face_profiles),
        'active_profiles', (SELECT COUNT(*) FROM face_profiles WHERE is_active = true),
        'total_logs', (SELECT COUNT(*) FROM face_recognition_logs),
        'logs_today', (
            SELECT COUNT(*) 
            FROM face_recognition_logs 
            WHERE timestamp >= CURRENT_DATE
        ),
        'recognition_accuracy', (
            SELECT COALESCE(AVG(confidence), 0) 
            FROM face_recognition_logs 
            WHERE event_type = 'person_recognized'
            AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
        ),
        'top_recognized_persons', (
            SELECT json_agg(
                json_build_object(
                    'person_name', person_name,
                    'recognition_count', recognition_count
                )
            )
            FROM (
                SELECT 
                    person_name,
                    COUNT(*) as recognition_count
                FROM face_recognition_logs 
                WHERE event_type = 'person_recognized'
                AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
                AND person_name IS NOT NULL
                GROUP BY person_name
                ORDER BY recognition_count DESC
                LIMIT 10
            ) top_persons
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default settings
INSERT INTO face_recognition_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON face_profiles TO authenticated;
GRANT ALL ON face_recognition_logs TO authenticated;
GRANT ALL ON face_recognition_settings TO authenticated;