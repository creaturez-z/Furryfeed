/*
  # Add SELECT Policy for Meals

  ## Summary
  Adds missing SELECT policy to allow users to view meals.

  ## Changes
  - Add policy for authenticated users to view active meals
  - Admins can view all meals (active and inactive)

  ## Security
  - Customers can only see active meals
  - Admins can see all meals
*/

-- Add SELECT policy for meals
CREATE POLICY "Users can view meals"
  ON meals FOR SELECT
  TO authenticated
  USING (is_active = true OR public.get_user_role(auth.uid()) = 'admin');
