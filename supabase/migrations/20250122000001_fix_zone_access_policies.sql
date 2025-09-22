-- Fix missing RLS policies for zone_access table
-- This migration adds the missing policies that allow hosts and admins to grant zone access

-- Create policies for zone_access table
CREATE POLICY "Hosts can grant access to their visitors" ON public.zone_access
  FOR INSERT WITH CHECK (
    visit_request_id IN (
      SELECT id FROM public.visit_requests vr
      WHERE vr.host_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins and reception can grant any access" ON public.zone_access
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'reception')
    )
  );

CREATE POLICY "Hosts can view access they granted" ON public.zone_access
  FOR SELECT USING (
    granted_by IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    visit_request_id IN (
      SELECT id FROM public.visit_requests vr
      WHERE vr.host_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins and reception can view all access" ON public.zone_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'reception')
    )
  );

CREATE POLICY "Visitors can view their own access" ON public.zone_access
  FOR SELECT USING (
    visit_request_id IN (
      SELECT id FROM public.visit_requests vr
      WHERE vr.visitor_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Hosts can update access they granted" ON public.zone_access
  FOR UPDATE USING (
    granted_by IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and reception can update any access" ON public.zone_access
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'reception')
    )
  );

CREATE POLICY "Hosts can delete access they granted" ON public.zone_access
  FOR DELETE USING (
    granted_by IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and reception can delete any access" ON public.zone_access
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'reception')
    )
  );