/*
  # Create User Role Helper Function

  ## Summary
  Creates a helper function to get user role without triggering RLS recursion.

  ## Changes
  1. Create helper function with SECURITY DEFINER
*/

-- Create helper function in public schema
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id
$$;
