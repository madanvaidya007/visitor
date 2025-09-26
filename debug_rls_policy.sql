-- Debug RLS Policy for Documents Table
-- This script helps debug the RLS policy violation

-- Check if user is authenticated
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Check profiles table for current user
SELECT 
  id as profile_id,
  user_id as auth_user_id,
  full_name,
  email,
  role
FROM public.profiles 
WHERE user_id = auth.uid();

-- Test the RLS policy condition
SELECT 
  'Policy Check Result' as test,
  EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  ) as user_has_profile,
  (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  ) as profile_id_for_documents;

-- Check existing documents for current user
SELECT 
  id,
  user_id,
  name,
  type,
  status,
  uploaded_at
FROM public.documents 
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
)
ORDER BY uploaded_at DESC
LIMIT 5;