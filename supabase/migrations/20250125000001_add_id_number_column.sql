-- Add missing id_number column to visit_requests table
-- This migration adds the id_number column that the QuickRegistration component expects

ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN public.visit_requests.id_number IS 'Visitor ID number (passport, driver license, etc.)';

-- Create index for better performance when searching by ID number
CREATE INDEX IF NOT EXISTS idx_visit_requests_id_number ON public.visit_requests(id_number);