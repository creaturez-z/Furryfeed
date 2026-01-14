/*
  # Fix Manual Payment Approval - Wallet Transaction Constraint

  1. Problem
    - The approve_manual_payment function tries to insert wallet_transactions with reference_type='manual_payment'
    - But the check constraint only allows: 'admin_adjustment', 'subscription_charge', 'recharge'
    - This causes approval to fail with constraint violation error

  2. Changes
    - Update wallet_transactions_reference_type_check constraint to include 'manual_payment'
    
  3. Impact
    - Allows manual payment approvals to create wallet transactions successfully
    - Maintains data integrity by only allowing valid reference types
*/

-- Drop the old constraint
ALTER TABLE wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_reference_type_check;

-- Add the updated constraint with 'manual_payment' included
ALTER TABLE wallet_transactions 
ADD CONSTRAINT wallet_transactions_reference_type_check 
CHECK (reference_type = ANY (ARRAY['admin_adjustment'::text, 'subscription_charge'::text, 'recharge'::text, 'manual_payment'::text]));