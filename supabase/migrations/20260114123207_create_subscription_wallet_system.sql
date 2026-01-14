/*
  # Create Subscription Wallet System

  1. New Tables
    - `subscription_wallets`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, foreign key to profiles)
      - `balance` (numeric, default 0.00)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `subscription_wallet_transactions`
      - `id` (uuid, primary key)
      - `subscription_wallet_id` (uuid, foreign key to subscription_wallets)
      - `profile_id` (uuid, foreign key to profiles)
      - `subscription_id` (uuid, foreign key to subscriptions, nullable)
      - `transaction_type` (text: 'credit', 'debit')
      - `amount` (numeric)
      - `description` (text)
      - `balance_after` (numeric)
      - `created_at` (timestamptz)

  2. Modifications
    - Add `price_override` column to subscriptions table for admin price overrides
    - Add `allow_past_date` flag support (handled in application logic)

  3. Security
    - Enable RLS on all new tables
    - Add policies for admins to manage all data
    - Add policies for customers to view their own data

  4. Indexes
    - Add indexes for faster queries on wallet transactions
*/

-- Create subscription_wallets table
CREATE TABLE IF NOT EXISTS subscription_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance numeric(10,2) DEFAULT 0.00 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Create subscription_wallet_transactions table
CREATE TABLE IF NOT EXISTS subscription_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_wallet_id uuid NOT NULL REFERENCES subscription_wallets(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  balance_after numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add price_override column to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'price_override'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN price_override numeric(10,2);
  END IF;
END $$;

-- Add last_daily_deduction_date to track daily deductions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'last_daily_deduction_date'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN last_daily_deduction_date date;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE subscription_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_wallets
CREATE POLICY "Admins can view all subscription wallets"
  ON subscription_wallets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view own subscription wallet"
  ON subscription_wallets FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage subscription wallets"
  ON subscription_wallets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for subscription_wallet_transactions
CREATE POLICY "Admins can view all subscription wallet transactions"
  ON subscription_wallet_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view own subscription wallet transactions"
  ON subscription_wallet_transactions FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can manage subscription wallet transactions"
  ON subscription_wallet_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_wallets_profile_id 
  ON subscription_wallets(profile_id);

CREATE INDEX IF NOT EXISTS idx_subscription_wallet_transactions_wallet_id 
  ON subscription_wallet_transactions(subscription_wallet_id);

CREATE INDEX IF NOT EXISTS idx_subscription_wallet_transactions_profile_id 
  ON subscription_wallet_transactions(profile_id);

CREATE INDEX IF NOT EXISTS idx_subscription_wallet_transactions_subscription_id 
  ON subscription_wallet_transactions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_wallet_transactions_created_at 
  ON subscription_wallet_transactions(created_at DESC);

-- Create function to auto-create subscription wallet for new profiles
CREATE OR REPLACE FUNCTION create_subscription_wallet_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscription_wallets (profile_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create subscription wallet
DROP TRIGGER IF EXISTS trigger_create_subscription_wallet ON profiles;
CREATE TRIGGER trigger_create_subscription_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_wallet_for_profile();

-- Backfill subscription wallets for existing profiles
INSERT INTO subscription_wallets (profile_id, balance)
SELECT id, 0.00
FROM profiles
WHERE id NOT IN (SELECT profile_id FROM subscription_wallets)
ON CONFLICT (profile_id) DO NOTHING;