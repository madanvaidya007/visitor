-- Sample visit requests with QR codes for testing
-- These will be used to test the complete QR code scanning and authentication flow

-- Insert sample visit requests with QR codes
INSERT INTO public.visit_requests (
  id, 
  visitor_id, 
  host_id, 
  purpose, 
  visit_date, 
  start_time, 
  end_time, 
  status, 
  qr_code,
  created_at, 
  updated_at
) VALUES 
-- Approved visit with QR code (ready for check-in)
(
  '550e8400-e29b-41d4-a716-446655440100',
  '550e8400-e29b-41d4-a716-446655440001', -- John Smith
  'host-001', -- Alex Thompson
  'Business Meeting - Project Discussion',
  CURRENT_DATE,
  '09:00',
  '11:00',
  'approved',
  'VMS-550e8400-e29b-41d4-a716-446655440100-1737550800000',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour'
),
-- Another approved visit with QR code
(
  '550e8400-e29b-41d4-a716-446655440101',
  '550e8400-e29b-41d4-a716-446655440002', -- Sarah Johnson
  'host-002', -- Maria Garcia
  'Technical Consultation',
  CURRENT_DATE,
  '14:00',
  '16:00',
  'approved',
  'VMS-550e8400-e29b-41d4-a716-446655440101-1737554400000',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '30 minutes'
),
-- Checked-in visit (ready for check-out)
(
  '550e8400-e29b-41d4-a716-446655440102',
  '550e8400-e29b-41d4-a716-446655440003', -- Michael Chen
  'host-003', -- James Lee
  'System Integration Review',
  CURRENT_DATE,
  '10:00',
  '12:00',
  'checked_in',
  'VMS-550e8400-e29b-41d4-a716-446655440102-1737551400000',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '1 hour'
),
-- Future visit with QR code
(
  '550e8400-e29b-41d4-a716-446655440103',
  '550e8400-e29b-41d4-a716-446655440004', -- Emily Rodriguez
  'host-001', -- Alex Thompson
  'Product Demo and Training',
  CURRENT_DATE + INTERVAL '1 day',
  '13:00',
  '15:00',
  'approved',
  'VMS-550e8400-e29b-41d4-a716-446655440103-1737640800000',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '15 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding visit logs for the checked-in visitor
INSERT INTO public.visit_logs (
  id,
  visit_request_id,
  action,
  timestamp,
  scanned_by,
  created_at
) VALUES 
(
  'log-001',
  '550e8400-e29b-41d4-a716-446655440102',
  'check_in',
  NOW() - INTERVAL '1 hour',
  'security-001',
  NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO NOTHING;