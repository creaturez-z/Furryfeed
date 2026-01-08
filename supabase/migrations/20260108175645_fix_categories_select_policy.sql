/*
  # Fix Categories SELECT Policy

  ## Summary
  Updates categories SELECT policy to allow admins to view all categories (including inactive).

  ## Changes
  - Drop existing category SELECT policy
  - Add new policy that allows admins to see all categories

  ## Security
  - Customers can only see active categories
  - Admins can see all categories (active and inactive)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;

-- Add new policy with admin access to all
CREATE POLICY "Users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_active = true OR public.get_user_role(auth.uid()) = 'admin');
