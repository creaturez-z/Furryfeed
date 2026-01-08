/*
  # Fix Pets RLS Policies

  ## Summary
  Fixes pets table RLS policies to use helper function.

  ## Changes
  1. Drop existing admin policies
  2. Recreate with helper function
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all pets" ON pets;
DROP POLICY IF EXISTS "Admins can insert pets" ON pets;
DROP POLICY IF EXISTS "Admins can update all pets" ON pets;
DROP POLICY IF EXISTS "Admins can delete pets" ON pets;

-- Recreate with helper function
CREATE POLICY "All can view pets"
  ON pets FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can insert pets"
  ON pets FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can update pets"
  ON pets FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can delete pets"
  ON pets FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');
