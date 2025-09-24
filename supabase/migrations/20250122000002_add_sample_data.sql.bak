-- Add sample data for real-time zone monitoring system
-- This migration adds realistic sample data to demonstrate the system

-- First, let's add some sample visitor profiles
INSERT INTO public.profiles (id, user_id, full_name, email, phone, company, photo_url, role, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john.smith@techcorp.com', '+1-555-0101', 'TechCorp Solutions', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '2 hours', NOW()),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah.johnson@innovate.io', '+1-555-0102', 'Innovate Labs', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '1 hour', NOW()),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Michael Chen', 'michael.chen@dataflow.com', '+1-555-0103', 'DataFlow Analytics', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '30 minutes', NOW()),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Emily Rodriguez', 'emily.rodriguez@cloudtech.net', '+1-555-0104', 'CloudTech Systems', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '45 minutes', NOW()),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'David Wilson', 'david.wilson@securebase.com', '+1-555-0105', 'SecureBase Inc', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '15 minutes', NOW()),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'Lisa Park', 'lisa.park@nexusgroup.org', '+1-555-0106', 'Nexus Group', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '1 hour 30 minutes', NOW()),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'Robert Taylor', 'robert.taylor@consultant.com', '+1-555-0107', 'Independent Consultant', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '20 minutes', NOW()),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'Amanda Foster', 'amanda.foster@designstudio.co', '+1-555-0108', 'Creative Design Studio', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face', 'visitor', NOW() - INTERVAL '10 minutes', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add some host profiles
INSERT INTO public.profiles (id, user_id, full_name, email, phone, company, photo_url, role, created_at, updated_at) VALUES
('host-001', 'host-001', 'Alex Thompson', 'alex.thompson@company.com', '+1-555-1001', 'Our Company', 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face', 'host', NOW() - INTERVAL '1 day', NOW()),
('host-002', 'host-002', 'Maria Garcia', 'maria.garcia@company.com', '+1-555-1002', 'Our Company', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face', 'host', NOW() - INTERVAL '1 day', NOW()),
('host-003', 'host-003', 'James Lee', 'james.lee@company.com', '+1-555-1003', 'Our Company', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'host', NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add some security alerts
INSERT INTO public.zone_alerts (id, zone_id, alert_type, severity, title, message, is_active, created_at, metadata) VALUES
('alert-001', (SELECT id FROM zones WHERE name = 'Office Floor 2' LIMIT 1), 'capacity_exceeded', 2, 'High Occupancy Alert', 'Office Floor 2 is at 82% capacity. Consider monitoring for overcrowding.', true, NOW() - INTERVAL '15 minutes', '{"current_count": 82, "max_capacity": 100, "threshold": 80}'),
('alert-002', (SELECT id FROM zones WHERE name = 'Conference Room A' LIMIT 1), 'capacity_exceeded', 3, 'Capacity Warning', 'Conference Room A is at 80% capacity. Room is nearly full.', true, NOW() - INTERVAL '10 minutes', '{"current_count": 16, "max_capacity": 20, "threshold": 80}'),
('alert-003', (SELECT id FROM zones WHERE name = 'Server Room' LIMIT 1), 'unauthorized_access', 1, 'Access Monitoring', 'Server Room access logged - normal operations.', false, NOW() - INTERVAL '1 hour', '{"access_count": 2, "authorized_personnel": ["tech-001", "admin-002"]}'),
('alert-004', (SELECT id FROM zones WHERE name = 'R&D Lab' LIMIT 1), 'maintenance', 1, 'Scheduled Maintenance', 'R&D Lab equipment maintenance scheduled.', true, NOW() - INTERVAL '2 hours', '{"maintenance_type": "equipment", "scheduled_date": "tomorrow", "current_occupancy": 12}')
ON CONFLICT (id) DO NOTHING;