/*
  # Fix Profiles RLS Policies

  ## Summary
  Fixes profiles table RLS policies to use helper function instead of subquery.

  ## Changes
  1. Drop existing admin policies
  2. Recreate with helper function
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate policies with helper function
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins and users can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');
