/*
  # Add INSERT Policy for Subscriptions

  ## Changes
  - Add INSERT policy to allow customers to create their own subscriptions
  - Allow admins to create subscriptions for any customer

  ## Security
  - Customers can only insert subscriptions where they are the customer_id
  - Admins can insert subscriptions for any customer
*/

-- Drop existing policy if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Customers can insert own subscriptions'
  ) THEN
    DROP POLICY "Customers can insert own subscriptions" ON subscriptions;
  END IF;
END $$;

-- Create INSERT policy for subscriptions
CREATE POLICY "Customers can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'
  );
