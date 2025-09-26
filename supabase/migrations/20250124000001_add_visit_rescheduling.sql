-- Add visit rescheduling functionality
-- This migration adds the ability to reschedule visits and track rescheduling history

-- Add rescheduling fields to visit_requests table
ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS original_visit_date DATE,
ADD COLUMN IF NOT EXISTS original_start_time TIME,
ADD COLUMN IF NOT EXISTS original_end_time TIME,
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
ADD COLUMN IF NOT EXISTS rescheduled_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMP WITH TIME ZONE;

-- Create visit_reschedule_history table to track all rescheduling events
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
    rescheduled_by UUID NOT NULL REFERENCES public.profiles(id),
    rescheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_visit_reschedule_history_visit_request_id ON public.visit_reschedule_history(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_visit_reschedule_history_rescheduled_by ON public.visit_reschedule_history(rescheduled_by);
CREATE INDEX IF NOT EXISTS idx_visit_reschedule_history_rescheduled_at ON public.visit_reschedule_history(rescheduled_at);

-- Enable RLS for visit_reschedule_history table
ALTER TABLE public.visit_reschedule_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for visit_reschedule_history
CREATE POLICY "Users can view reschedule history for their visits" ON public.visit_reschedule_history
    FOR SELECT USING (
        visit_request_id IN (
            SELECT id FROM public.visit_requests 
            WHERE visitor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            OR host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Hosts and visitors can insert reschedule history" ON public.visit_reschedule_history
    FOR INSERT WITH CHECK (
        rescheduled_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins and reception can view all reschedule history" ON public.visit_reschedule_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.role IN ('admin', 'reception')
        )
    );

-- Create function to handle visit rescheduling
CREATE OR REPLACE FUNCTION reschedule_visit(
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
    SELECT visit_date, start_time, end_time, reschedule_count
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
    
    -- Insert reschedule history record
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
$$ LANGUAGE plpgsql;

-- Add comments to document the new functionality
COMMENT ON COLUMN public.visit_requests.original_visit_date IS 'Original visit date before any rescheduling';
COMMENT ON COLUMN public.visit_requests.original_start_time IS 'Original start time before any rescheduling';
COMMENT ON COLUMN public.visit_requests.original_end_time IS 'Original end time before any rescheduling';
COMMENT ON COLUMN public.visit_requests.reschedule_count IS 'Number of times this visit has been rescheduled';
COMMENT ON COLUMN public.visit_requests.reschedule_reason IS 'Reason for the most recent rescheduling';
COMMENT ON COLUMN public.visit_requests.rescheduled_by IS 'Profile ID of the person who last rescheduled this visit';
COMMENT ON COLUMN public.visit_requests.rescheduled_at IS 'Timestamp of the most recent rescheduling';

COMMENT ON TABLE public.visit_reschedule_history IS 'Tracks the complete history of visit rescheduling events';
COMMENT ON FUNCTION reschedule_visit IS 'Function to reschedule a visit and maintain history';