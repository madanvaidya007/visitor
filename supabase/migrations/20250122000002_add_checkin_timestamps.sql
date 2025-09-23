-- Add missing timestamp columns for check-in/check-out tracking
-- This migration adds the checked_in_at and checked_out_at columns that the application expects

ALTER TABLE public.visit_requests 
ADD COLUMN checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN checked_out_at TIMESTAMP WITH TIME ZONE;

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN public.visit_requests.checked_in_at IS 'Timestamp when the visitor checked in';
COMMENT ON COLUMN public.visit_requests.checked_out_at IS 'Timestamp when the visitor checked out';