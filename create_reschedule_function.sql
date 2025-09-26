-- Create reschedule_visit function
-- This script creates the missing reschedule_visit function

-- First, ensure required columns exist in visit_requests table
ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS original_visit_date DATE,
ADD COLUMN IF NOT EXISTS original_start_time TIME,
ADD COLUMN IF NOT EXISTS original_end_time TIME,
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_by UUID,
ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP WITH TIME ZONE;

-- Create visit_reschedule_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.visit_reschedule_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visit_request_id UUID NOT NULL REFERENCES public.visit_requests(id) ON DELETE CASCADE,
    old_visit_date DATE NOT NULL,
    old_start_time TIME NOT NULL,
    old_end_time TIME NOT NULL,
    new_visit_date DATE NOT NULL,
    new_start_time TIME NOT NULL,
    new_end_time TIME NOT NULL,
    reason TEXT,
    rescheduled_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.reschedule_visit(UUID, DATE, TIME, TIME, TEXT, UUID);

-- Create the reschedule_visit function
CREATE OR REPLACE FUNCTION public.reschedule_visit(
    p_visit_request_id UUID,
    p_new_visit_date DATE,
    p_new_start_time TIME,
    p_new_end_time TIME,
    p_reason TEXT,
    p_rescheduled_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_visit_date DATE;
    v_old_start_time TIME;
    v_old_end_time TIME;
    v_current_count INTEGER;
BEGIN
    -- Get current visit details
    SELECT visit_date, start_time, end_time, COALESCE(reschedule_count, 0)
    INTO v_old_visit_date, v_old_start_time, v_old_end_time, v_current_count
    FROM public.visit_requests
    WHERE id = p_visit_request_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Store original dates if this is the first reschedule
    IF v_current_count = 0 THEN
        UPDATE public.visit_requests
        SET
            original_visit_date = v_old_visit_date,
            original_start_time = v_old_start_time,
            original_end_time = v_old_end_time
        WHERE id = p_visit_request_id;
    END IF;

    -- Insert reschedule history record (with error handling)
    BEGIN
        INSERT INTO public.visit_reschedule_history (
            visit_request_id,
            old_visit_date,
            old_start_time,
            old_end_time,
            new_visit_date,
            new_start_time,
            new_end_time,
            reason,
            rescheduled_by
        ) VALUES (
            p_visit_request_id,
            v_old_visit_date,
            v_old_start_time,
            v_old_end_time,
            p_new_visit_date,
            p_new_start_time,
            p_new_end_time,
            p_reason,
            p_rescheduled_by
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Continue even if history insert fails
            NULL;
    END;

    -- Update the visit request with new details
    UPDATE public.visit_requests
    SET
        visit_date = p_new_visit_date,
        start_time = p_new_start_time,
        end_time = p_new_end_time,
        reschedule_count = v_current_count + 1,
        reschedule_reason = p_reason,
        rescheduled_by = p_rescheduled_by,
        rescheduled_at = NOW(),
        updated_at = NOW(),
        status = CASE
            WHEN status = 'approved' THEN 'approved'
            ELSE 'pending'
        END
    WHERE id = p_visit_request_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reschedule_visit(UUID, DATE, TIME, TIME, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.reschedule_visit(UUID, DATE, TIME, TIME, TEXT, UUID) TO authenticated;

-- Enable RLS on visit_reschedule_history table
ALTER TABLE public.visit_reschedule_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for visit_reschedule_history
DROP POLICY IF EXISTS "Users can view reschedule history for their visits" ON public.visit_reschedule_history;
CREATE POLICY "Users can view reschedule history for their visits" ON public.visit_reschedule_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.visit_requests vr
            WHERE vr.id = visit_reschedule_history.visit_request_id
            AND (vr.visitor_id = auth.uid() OR vr.host_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert reschedule history for their visits" ON public.visit_reschedule_history;
CREATE POLICY "Users can insert reschedule history for their visits" ON public.visit_reschedule_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.visit_requests vr
            WHERE vr.id = visit_reschedule_history.visit_request_id
            AND (vr.visitor_id = auth.uid() OR vr.host_id = auth.uid())
        )
    );