-- Add missing reschedule columns to visit_requests table
-- This script adds the columns needed for the reschedule functionality

-- Add reschedule-related columns to visit_requests table
ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS original_visit_date DATE,
ADD COLUMN IF NOT EXISTS original_start_time TIME,
ADD COLUMN IF NOT EXISTS original_end_time TIME,
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_by UUID,
ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP WITH TIME ZONE;

-- Add comments to document the new columns
COMMENT ON COLUMN public.visit_requests.original_visit_date IS 'Original visit date before any rescheduling';
COMMENT ON COLUMN public.visit_requests.original_start_time IS 'Original start time before any rescheduling';
COMMENT ON COLUMN public.visit_requests.original_end_time IS 'Original end time before any rescheduling';
COMMENT ON COLUMN public.visit_requests.reschedule_count IS 'Number of times this visit has been rescheduled';
COMMENT ON COLUMN public.visit_requests.reschedule_reason IS 'Reason for the most recent reschedule';
COMMENT ON COLUMN public.visit_requests.rescheduled_by IS 'User ID who performed the most recent reschedule';
COMMENT ON COLUMN public.visit_requests.rescheduled_at IS 'Timestamp of the most recent reschedule';