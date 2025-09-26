-- Complete Reschedule Fix SQL Script
-- This script adds missing columns and creates the reschedule_visit function

-- Step 1: Add missing reschedule columns to visit_requests table
ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS original_visit_date DATE,
ADD COLUMN IF NOT EXISTS original_start_time TIME,
ADD COLUMN IF NOT EXISTS original_end_time TIME,
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_by UUID,
ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create the reschedule_visit function
CREATE OR REPLACE FUNCTION public.reschedule_visit(
    p_visit_request_id UUID,
    p_new_visit_date DATE,
    p_new_start_time TIME,
    p_new_end_time TIME,
    p_reason TEXT,
    p_rescheduled_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Store original values if this is the first reschedule
    UPDATE public.visit_requests
    SET
        original_visit_date = COALESCE(original_visit_date, visit_date),
        original_start_time = COALESCE(original_start_time, start_time),
        original_end_time = COALESCE(original_end_time, end_time)
    WHERE id = p_visit_request_id AND COALESCE(reschedule_count, 0) = 0;
    
    -- Update with new values
    UPDATE public.visit_requests
    SET
        visit_date = p_new_visit_date,
        start_time = p_new_start_time,
        end_time = p_new_end_time,
        reschedule_reason = p_reason,
        rescheduled_by = p_rescheduled_by,
        rescheduled_at = NOW(),
        reschedule_count = COALESCE(reschedule_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_visit_request_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.reschedule_visit(UUID, DATE, TIME, TIME, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.reschedule_visit(UUID, DATE, TIME, TIME, TEXT, UUID) TO authenticated;

-- Step 4: Add comments for documentation
COMMENT ON FUNCTION public.reschedule_visit IS 'Function to reschedule a visit request and track reschedule history';