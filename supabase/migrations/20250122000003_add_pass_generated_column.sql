-- Add missing pass_generated column to visit_requests table
-- This migration adds the pass_generated column that the application expects

ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS pass_generated BOOLEAN DEFAULT false;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN public.visit_requests.pass_generated IS 'Indicates whether a pass has been generated for this visit request';

-- Update existing records to set pass_generated = true where qr_code exists
UPDATE public.visit_requests 
SET pass_generated = true 
WHERE qr_code IS NOT NULL AND qr_code != '';