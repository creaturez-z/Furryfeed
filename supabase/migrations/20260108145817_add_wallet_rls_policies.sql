/*
  # Add Wallet RLS Policies

  ## Summary
  This migration adds missing Row Level Security policies for the wallets and 
  wallet_transactions tables to allow customers to manage their own wallet data.

  ## Changes

  ### Wallets Table Policies
  1. **INSERT Policy**: Allows customers to create their own wallet
     - Policy name: "Customers can insert own wallet"
     - Allows authenticated users to insert a wallet record with their own customer_id
  
  2. **UPDATE Policy**: Allows customers to update their own wallet balance
     - Policy name: "Customers can update own wallet"
     - Allows authenticated users to update only their own wallet

  ### Wallet Transactions Table Policies
  1. **INSERT Policy**: Allows customers to create transactions for their own wallet
     - Policy name: "Customers can insert own transactions"
     - Allows authenticated users to insert transactions for their own wallet

  ## Security Notes
  - All policies check that the customer_id matches auth.uid()
  - This ensures users can only access and modify their own wallet data
  - The balance check constraint ensures wallet balance never goes negative
*/

-- Add INSERT policy for wallets table
CREATE POLICY "Customers can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Add UPDATE policy for wallets table
CREATE POLICY "Customers can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Add INSERT policy for wallet_transactions table
CREATE POLICY "Customers can insert own transactions"
  ON wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());
