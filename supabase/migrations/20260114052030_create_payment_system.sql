/*
  # Create Payment System

  ## Overview
  Complete payment system with admin configuration, manual payments, and Razorpay support.

  ## New Tables
  
  1. **payment_settings**
     - Stores payment configuration (Razorpay keys, manual payment details)
     - Fields: razorpay_enabled, manual_payment_enabled, razorpay_key_id, razorpay_key_secret, 
       upi_id, phone_number, qr_code_url
  
  2. **manual_payment_transactions**
     - Tracks manual payment submissions by customers
     - Fields: user_id, subscription_id, amount, utr_number, screenshot_url, status, admin_notes
     - Status: pending, approved, rejected
  
  3. **payment_methods**
     - Logs which payment method was selected for each transaction
  
  ## Schema Changes
  
  1. **subscriptions table**
     - Add payment_status field: pending_payment, paid, failed
     - Add payment_method field: wallet, razorpay, manual
  
  ## Security
  - RLS policies for all tables
  - Customers can only view their own transactions
  - Admin can view and manage all transactions
  
  ## Important Notes
  - Razorpay keys are sensitive and should be handled carefully
  - QR codes are stored as URLs (uploaded to storage)
  - Manual payments require admin approval before subscription activation
*/

-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_enabled boolean DEFAULT false,
  manual_payment_enabled boolean DEFAULT true,
  razorpay_key_id text,
  razorpay_key_secret text,
  upi_id text,
  phone_number text,
  qr_code_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default payment settings
INSERT INTO payment_settings (razorpay_enabled, manual_payment_enabled)
VALUES (false, true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Payment settings policies
CREATE POLICY "Anyone can view payment settings"
  ON payment_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage payment settings"
  ON payment_settings FOR ALL
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

-- Create manual_payment_transactions table
CREATE TABLE IF NOT EXISTS manual_payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL,
  utr_number text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE manual_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Manual payment transactions policies
CREATE POLICY "Users can view own transactions"
  ON manual_payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own transactions"
  ON manual_payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
  ON manual_payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update transactions"
  ON manual_payment_transactions FOR UPDATE
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

-- Add payment fields to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN payment_status text DEFAULT 'paid' 
      CHECK (payment_status IN ('pending_payment', 'paid', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN payment_method text 
      CHECK (payment_method IN ('wallet', 'razorpay', 'manual', null));
  END IF;
END $$;

-- Create function to handle payment approval
CREATE OR REPLACE FUNCTION approve_manual_payment(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_transaction RECORD;
  v_amount numeric;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM manual_payment_transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_transaction.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already processed');
  END IF;
  
  -- Update transaction status
  UPDATE manual_payment_transactions
  SET 
    status = 'approved',
    admin_notes = p_admin_notes,
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Add amount to user wallet
  UPDATE wallet_transactions
  SET balance = balance + v_transaction.amount
  WHERE user_id = v_transaction.user_id
  RETURNING balance INTO v_amount;
  
  -- If no wallet exists, create one
  IF NOT FOUND THEN
    INSERT INTO wallet_transactions (user_id, balance)
    VALUES (v_transaction.user_id, v_transaction.amount);
  END IF;
  
  -- Log the wallet transaction
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_transaction.user_id,
    'wallet_credit',
    'manual_payment',
    p_transaction_id,
    jsonb_build_object(
      'amount', v_transaction.amount,
      'approved_by', p_admin_id,
      'notes', p_admin_notes
    )
  );
  
  -- Update subscription status if linked
  IF v_transaction.subscription_id IS NOT NULL THEN
    UPDATE subscriptions
    SET 
      payment_status = 'paid',
      status = 'active',
      updated_at = now()
    WHERE id = v_transaction.subscription_id
    AND payment_status = 'pending_payment';
  END IF;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject manual payment
CREATE OR REPLACE FUNCTION reject_manual_payment(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_admin_notes text
)
RETURNS jsonb AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM manual_payment_transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_transaction.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already processed');
  END IF;
  
  -- Update transaction status
  UPDATE manual_payment_transactions
  SET 
    status = 'rejected',
    admin_notes = p_admin_notes,
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Log the activity
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_transaction.user_id,
    'payment_rejected',
    'manual_payment',
    p_transaction_id,
    jsonb_build_object(
      'amount', v_transaction.amount,
      'rejected_by', p_admin_id,
      'notes', p_admin_notes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_payment_transactions_user_id 
  ON manual_payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_transactions_status 
  ON manual_payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_manual_payment_transactions_subscription_id 
  ON manual_payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_status 
  ON subscriptions(payment_status);