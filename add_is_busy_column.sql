-- Add is_busy column and related fields to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS busy_message TEXT,
ADD COLUMN IF NOT EXISTS busy_until TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of busy hosts
CREATE INDEX IF NOT EXISTS idx_profiles_is_busy ON public.profiles(is_busy) WHERE role = 'host';

-- Add comments to document the new fields
COMMENT ON COLUMN public.profiles.is_busy IS 'Indicates if the host is currently marked as busy';
COMMENT ON COLUMN public.profiles.busy_message IS 'Optional message explaining why the host is busy';
COMMENT ON COLUMN public.profiles.busy_until IS 'Timestamp when the busy status expires';