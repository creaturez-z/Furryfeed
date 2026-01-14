/*
  # Fix Manual Payment Approval/Rejection - Activity Logs Schema

  1. Problem
    - The approve_manual_payment and reject_manual_payment functions try to insert into activity_logs with column "user_id"
    - But activity_logs table uses "admin_id" and "admin_name" columns instead
    - This causes the functions to fail with "column user_id does not exist" error

  2. Changes
    - Update approve_manual_payment function to use correct activity_logs schema
    - Update reject_manual_payment function to use correct activity_logs schema
    - Both functions now fetch admin name from profiles and use proper columns
    
  3. Impact
    - Manual payment approval/rejection will work correctly
    - Activity logs will be properly recorded with admin information
*/

-- Drop and recreate approve_manual_payment function with correct activity_logs schema
CREATE OR REPLACE FUNCTION approve_manual_payment(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_admin_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_wallet_id uuid;
  v_new_balance numeric(10, 2);
  v_admin_name text;
BEGIN
  -- Get admin name
  SELECT name INTO v_admin_name
  FROM profiles
  WHERE id = p_admin_id;
  
  IF v_admin_name IS NULL THEN
    v_admin_name := 'Unknown Admin';
  END IF;

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

  -- Get or create wallet
  SELECT id, balance INTO v_wallet_id, v_new_balance
  FROM wallets
  WHERE customer_id = v_transaction.user_id;

  IF NOT FOUND THEN
    -- Create wallet if it doesn't exist
    INSERT INTO wallets (customer_id, balance)
    VALUES (v_transaction.user_id, v_transaction.amount)
    RETURNING id, balance INTO v_wallet_id, v_new_balance;
  ELSE
    -- Update existing wallet
    v_new_balance := v_new_balance + v_transaction.amount;
    UPDATE wallets
    SET 
      balance = v_new_balance,
      updated_at = now()
    WHERE id = v_wallet_id;
  END IF;

  -- Log the wallet transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    customer_id,
    type,
    amount,
    reason,
    reference_type,
    reference_id
  ) VALUES (
    v_wallet_id,
    v_transaction.user_id,
    'credit',
    v_transaction.amount,
    'Manual payment approved',
    'manual_payment',
    p_transaction_id
  );

  -- Log activity with correct schema
  INSERT INTO activity_logs (
    admin_id,
    admin_name,
    action,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_admin_id,
    v_admin_name,
    'Approved manual payment of ' || v_transaction.amount || ' for user',
    'approve',
    'manual_payment',
    p_transaction_id,
    jsonb_build_object(
      'amount', v_transaction.amount,
      'user_id', v_transaction.user_id,
      'notes', p_admin_notes,
      'new_balance', v_new_balance,
      'subscription_id', v_transaction.subscription_id
    )
  );

  -- Update subscription status if linked
  IF v_transaction.subscription_id IS NOT NULL THEN
    UPDATE subscriptions
    SET 
      payment_status = 'paid',
      payment_method = 'manual',
      status = 'active',
      updated_at = now()
    WHERE id = v_transaction.subscription_id
    AND payment_status = 'pending_payment';
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id,
    'new_balance', v_new_balance,
    'subscription_id', v_transaction.subscription_id
  );
END;
$$;

-- Drop and recreate reject_manual_payment function with correct activity_logs schema
CREATE OR REPLACE FUNCTION reject_manual_payment(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_admin_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_admin_name text;
BEGIN
  -- Get admin name
  SELECT name INTO v_admin_name
  FROM profiles
  WHERE id = p_admin_id;
  
  IF v_admin_name IS NULL THEN
    v_admin_name := 'Unknown Admin';
  END IF;

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

  -- Log the activity with correct schema
  INSERT INTO activity_logs (
    admin_id,
    admin_name,
    action,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_admin_id,
    v_admin_name,
    'Rejected manual payment of ' || v_transaction.amount || ' for user',
    'reject',
    'manual_payment',
    p_transaction_id,
    jsonb_build_object(
      'amount', v_transaction.amount,
      'user_id', v_transaction.user_id,
      'notes', p_admin_notes,
      'subscription_id', v_transaction.subscription_id
    )
  );

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$;