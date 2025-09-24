-- Zone-based Security System Migration
-- This migration creates all necessary tables for the zone-based security system

-- Security Zones Table
CREATE TABLE IF NOT EXISTS security_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    floor VARCHAR(50),
    building VARCHAR(100),
    capacity INTEGER NOT NULL DEFAULT 0,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    access_level VARCHAR(50) NOT NULL DEFAULT 'public' CHECK (access_level IN ('public', 'restricted', 'high_security', 'executive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zone Entry Points Table
CREATE TABLE IF NOT EXISTS zone_entry_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES security_zones(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    qr_code_id VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_guard_verification BOOLEAN NOT NULL DEFAULT true,
    allowed_access_levels TEXT[] DEFAULT ARRAY['public'],
    last_scan_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zone Guards Table
CREATE TABLE IF NOT EXISTS zone_guards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guard_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    assigned_zones UUID[] DEFAULT ARRAY[]::UUID[],
    is_on_duty BOOLEAN NOT NULL DEFAULT false,
    shift_start TIMESTAMPTZ,
    shift_end TIMESTAMPTZ,
    contact_info JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zone Access Logs Table
CREATE TABLE IF NOT EXISTS zone_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES security_zones(id) ON DELETE CASCADE,
    entry_point_id UUID REFERENCES zone_entry_points(id) ON DELETE SET NULL,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    guard_id UUID REFERENCES zone_guards(id) ON DELETE SET NULL,
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('entry', 'exit', 'denied', 'emergency')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qr_code_scanned VARCHAR(255),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'denied', 'expired')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Visitor Zone Requests Table
CREATE TABLE IF NOT EXISTS visitor_zone_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    requested_zones UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    purpose TEXT NOT NULL,
    estimated_duration INTEGER NOT NULL DEFAULT 60, -- in minutes
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'active', 'completed')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    qr_code VARCHAR(255) UNIQUE,
    access_path UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zone Security Alerts Table
CREATE TABLE IF NOT EXISTS zone_security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES security_zones(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN ('unauthorized_access', 'capacity_exceeded', 'guard_offline', 'system_error', 'emergency')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_security_zones_active ON security_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_security_zones_access_level ON security_zones(access_level);
CREATE INDEX IF NOT EXISTS idx_zone_entry_points_zone_id ON zone_entry_points(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_entry_points_qr_code ON zone_entry_points(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_zone_guards_user_id ON zone_guards(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_guards_on_duty ON zone_guards(is_on_duty);
CREATE INDEX IF NOT EXISTS idx_zone_guards_assigned_zones ON zone_guards USING GIN(assigned_zones);
CREATE INDEX IF NOT EXISTS idx_zone_access_logs_zone_id ON zone_access_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_access_logs_visitor_id ON zone_access_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_zone_access_logs_timestamp ON zone_access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_zone_requests_visitor_id ON visitor_zone_requests(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_zone_requests_status ON visitor_zone_requests(status);
CREATE INDEX IF NOT EXISTS idx_visitor_zone_requests_zones ON visitor_zone_requests USING GIN(requested_zones);
CREATE INDEX IF NOT EXISTS idx_zone_security_alerts_zone_id ON zone_security_alerts(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_security_alerts_resolved ON zone_security_alerts(is_resolved);

-- Create Views for Complex Queries
CREATE OR REPLACE VIEW zone_occupancy_view AS
SELECT 
    sz.id as zone_id,
    sz.name as zone_name,
    sz.capacity as max_capacity,
    COALESCE(sz.current_occupancy, 0) as current_count,
    CASE 
        WHEN sz.capacity > 0 THEN ROUND((COALESCE(sz.current_occupancy, 0)::DECIMAL / sz.capacity) * 100, 2)
        ELSE 0 
    END as occupancy_rate,
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'visitorId', v.id,
                'visitorName', v.full_name,
                'entryTime', zal.timestamp,
                'currentStatus', 'in_zone',
                'hostId', vzr.host_id,
                'hostName', u.email
            )
        )
        FROM zone_access_logs zal
        JOIN visitors v ON v.id = zal.visitor_id
        JOIN visitor_zone_requests vzr ON vzr.visitor_id = v.id
        JOIN auth.users u ON u.id = vzr.host_id
        WHERE zal.zone_id = sz.id 
        AND zal.access_type = 'entry'
        AND zal.verification_status = 'approved'
        AND NOT EXISTS (
            SELECT 1 FROM zone_access_logs zal2 
            WHERE zal2.visitor_id = zal.visitor_id 
            AND zal2.zone_id = zal.zone_id 
            AND zal2.access_type = 'exit' 
            AND zal2.timestamp > zal.timestamp
        )), '[]'::json
    ) as visitors,
    NOW() as last_updated
FROM security_zones sz
WHERE sz.is_active = true;

-- Create Functions for Business Logic
CREATE OR REPLACE FUNCTION update_zone_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.access_type = 'entry' AND NEW.verification_status = 'approved' THEN
        UPDATE security_zones 
        SET current_occupancy = current_occupancy + 1,
            updated_at = NOW()
        WHERE id = NEW.zone_id;
    ELSIF NEW.access_type = 'exit' AND NEW.verification_status = 'approved' THEN
        UPDATE security_zones 
        SET current_occupancy = GREATEST(current_occupancy - 1, 0),
            updated_at = NOW()
        WHERE id = NEW.zone_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic occupancy updates
DROP TRIGGER IF EXISTS trigger_update_zone_occupancy ON zone_access_logs;
CREATE TRIGGER trigger_update_zone_occupancy
    AFTER INSERT ON zone_access_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_zone_occupancy();

-- Function to get zone statistics
CREATE OR REPLACE FUNCTION get_zone_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalZones', (SELECT COUNT(*) FROM security_zones WHERE is_active = true),
        'activeZones', (SELECT COUNT(*) FROM security_zones WHERE is_active = true AND current_occupancy > 0),
        'totalGuards', (SELECT COUNT(*) FROM zone_guards),
        'guardsOnDuty', (SELECT COUNT(*) FROM zone_guards WHERE is_on_duty = true),
        'totalVisitors', (SELECT COUNT(DISTINCT visitor_id) FROM zone_access_logs WHERE DATE(timestamp) = CURRENT_DATE),
        'visitorsInZones', (SELECT SUM(current_occupancy) FROM security_zones WHERE is_active = true),
        'todayScans', (SELECT COUNT(*) FROM zone_access_logs WHERE DATE(timestamp) = CURRENT_DATE),
        'pendingRequests', (SELECT COUNT(*) FROM visitor_zone_requests WHERE status = 'pending'),
        'securityAlerts', (SELECT COUNT(*) FROM zone_security_alerts WHERE is_resolved = false),
        'averageOccupancy', (
            SELECT COALESCE(AVG(
                CASE 
                    WHEN capacity > 0 THEN (current_occupancy::DECIMAL / capacity) * 100
                    ELSE 0 
                END
            ), 0)
            FROM security_zones 
            WHERE is_active = true
        ),
        'zoneUtilization', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'zoneId', id,
                    'zoneName', name,
                    'occupancyRate', CASE 
                        WHEN capacity > 0 THEN ROUND((current_occupancy::DECIMAL / capacity) * 100, 2)
                        ELSE 0 
                    END,
                    'totalVisits', (
                        SELECT COUNT(*) 
                        FROM zone_access_logs 
                        WHERE zone_id = sz.id 
                        AND DATE(timestamp) = CURRENT_DATE
                        AND access_type = 'entry'
                    )
                )
            ), '[]'::json)
            FROM security_zones sz
            WHERE is_active = true
            ORDER BY name
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function for RPC call to update occupancy manually
CREATE OR REPLACE FUNCTION update_zone_occupancy(p_zone_id UUID, p_visitor_id UUID, p_action TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO zone_access_logs (
        zone_id, 
        visitor_id, 
        access_type, 
        verification_status,
        timestamp
    ) VALUES (
        p_zone_id, 
        p_visitor_id, 
        CASE WHEN p_action = 'enter' THEN 'entry' ELSE 'exit' END,
        'approved',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE security_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_entry_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_zone_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_security_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Security Zones - Readable by authenticated users, writable by admins
CREATE POLICY "security_zones_read" ON security_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "security_zones_write" ON security_zones FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'security_manager');

-- Zone Entry Points - Readable by authenticated users, writable by admins and guards
CREATE POLICY "zone_entry_points_read" ON zone_entry_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "zone_entry_points_write" ON zone_entry_points FOR ALL TO authenticated 
USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'security_manager' OR
    EXISTS (SELECT 1 FROM zone_guards WHERE user_id = auth.uid() AND zone_id = ANY(assigned_zones))
);

-- Zone Guards - Guards can read their own data, admins can manage all
CREATE POLICY "zone_guards_read" ON zone_guards FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'security_manager');
CREATE POLICY "zone_guards_write" ON zone_guards FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'security_manager');

-- Zone Access Logs - Readable by guards and admins, writable by guards for their zones
CREATE POLICY "zone_access_logs_read" ON zone_access_logs FOR SELECT TO authenticated 
USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'security_manager' OR
    EXISTS (SELECT 1 FROM zone_guards WHERE user_id = auth.uid() AND zone_id = ANY(assigned_zones))
);
CREATE POLICY "zone_access_logs_write" ON zone_access_logs FOR INSERT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM zone_guards WHERE user_id = auth.uid() AND zone_id = ANY(assigned_zones)) OR
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'security_manager'
);

-- Visitor Zone Requests - Visitors can read their own, hosts can read their invitations
CREATE POLICY "visitor_zone_requests_read" ON visitor_zone_requests FOR SELECT TO authenticated 
USING (
    host_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'security_manager'
);
CREATE POLICY "visitor_zone_requests_write" ON visitor_zone_requests FOR ALL TO authenticated 
USING (
    host_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'security_manager'
);

-- Zone Security Alerts - Readable by guards and admins
CREATE POLICY "zone_security_alerts_read" ON zone_security_alerts FOR SELECT TO authenticated 
USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'security_manager' OR
    EXISTS (SELECT 1 FROM zone_guards WHERE user_id = auth.uid() AND zone_id = ANY(assigned_zones))
);
CREATE POLICY "zone_security_alerts_write" ON zone_security_alerts FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'security_manager');

-- Grant necessary permissions
GRANT ALL ON security_zones TO authenticated;
GRANT ALL ON zone_entry_points TO authenticated;
GRANT ALL ON zone_guards TO authenticated;
GRANT ALL ON zone_access_logs TO authenticated;
GRANT ALL ON visitor_zone_requests TO authenticated;
GRANT ALL ON zone_security_alerts TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert default security zones for demonstration
INSERT INTO security_zones (name, description, location, capacity, access_level) VALUES
('Main Lobby', 'Primary entrance and reception area', 'Ground Floor - Main Entrance', 50, 'public'),
('Executive Floor', 'Executive offices and meeting rooms', '10th Floor', 20, 'executive'),
('IT Department', 'Information Technology department', '5th Floor - East Wing', 30, 'restricted'),
('Server Room', 'Critical infrastructure and servers', 'Basement Level B1', 5, 'high_security'),
('Conference Center', 'Large meeting and event spaces', '2nd Floor', 100, 'restricted');

-- Insert default entry points
INSERT INTO zone_entry_points (zone_id, name, location, qr_code_id, requires_guard_verification, allowed_access_levels)
SELECT 
    sz.id,
    sz.name || ' - Main Entry',
    sz.location || ' - Entry Point 1',
    'EP_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || substr(md5(random()::text), 1, 8),
    CASE WHEN sz.access_level IN ('high_security', 'executive') THEN true ELSE false END,
    ARRAY[sz.access_level]
FROM security_zones sz;