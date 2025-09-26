-- Add busy status and availability fields to profiles table
-- This migration adds functionality for hosts to mark themselves as busy and manage their availability

-- Add busy status field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS busy_message TEXT,
ADD COLUMN IF NOT EXISTS busy_until TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of busy hosts
CREATE INDEX IF NOT EXISTS idx_profiles_is_busy ON public.profiles(is_busy) WHERE role = 'host';

-- Create function to automatically clear busy status when busy_until expires
CREATE OR REPLACE FUNCTION clear_expired_busy_status()
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        is_busy = false,
        busy_message = NULL,
        busy_until = NULL
    WHERE 
        is_busy = true 
        AND busy_until IS NOT NULL 
        AND busy_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clear expired busy status (runs every 5 minutes)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('clear-expired-busy-status', '*/5 * * * *', 'SELECT clear_expired_busy_status();');

-- Add comment to document the new fields
COMMENT ON COLUMN public.profiles.is_busy IS 'Indicates if the host is currently marked as busy';
COMMENT ON COLUMN public.profiles.busy_message IS 'Optional message explaining why the host is busy';
COMMENT ON COLUMN public.profiles.busy_until IS 'Timestamp when the busy status should automatically expire';