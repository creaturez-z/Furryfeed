/*
  # Add Foreign Key Relationship for Manual Payment Transactions

  1. Changes
    - Add foreign key constraint from `manual_payment_transactions.user_id` to `profiles.id`
    - This enables automatic joins in Supabase queries for better data relationships
  
  2. Security
    - No security changes, only adding referential integrity
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'manual_payment_transactions_user_id_fkey'
    AND table_name = 'manual_payment_transactions'
  ) THEN
    ALTER TABLE manual_payment_transactions
    ADD CONSTRAINT manual_payment_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
