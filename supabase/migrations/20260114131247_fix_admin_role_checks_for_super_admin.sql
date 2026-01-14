/*
  # Fix Admin Role Checks for Super Admin

  ## Summary
  Updates RLS helper functions to properly recognize both 'admin' and 'super_admin' roles
  as having administrative privileges.

  ## Changes
  1. Create new helper function `is_admin(user_id)` that returns true for both admin and super_admin
  2. This ensures all administrative operations work correctly for both role types
  
  ## Security
  - Uses SECURITY DEFINER to bypass RLS when checking user roles
  - Maintains data security by properly checking authenticated user roles
*/

-- Create helper function to check if user is admin (either admin or super_admin)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('admin', 'super_admin') 
  FROM public.profiles 
  WHERE id = user_id
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
