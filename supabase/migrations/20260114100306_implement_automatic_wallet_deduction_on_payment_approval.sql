/*
  # Implement Automatic Wallet Deduction on Manual Payment Approval

  1. Problem
    - When admin approves manual payment, amount is credited to wallet
    - But if payment is for a subscription, the subscription amount should be automatically deducted
    - Currently admin has to manually adjust wallet after approval

  2. Changes
    - Update approve_manual_payment function to:
      a) Credit the manual payment amount to wallet (existing)
      b) If subscription_id exists:
         - Fetch subscription's final_price
         - Automatically debit that amount from wallet
         - Create wallet transaction for subscription charge
         - Keep any excess amount in wallet as balance
      c) Update subscription status to active (existing)
    
  3. Flow Example
    - User pays ₹1000 via manual payment for ₹800 subscription
    - System credits ₹1000 to wallet → Balance: ₹1000
    - System debits ₹800 for subscription → Balance: ₹200
    - Subscription becomes active
    - User retains ₹200 balance in wallet

  4. Impact
    - Complete automated payment flow
    - No manual wallet adjustment needed
    - Proper audit trail with two wallet transactions (credit + debit)
    - Excess payments stay in wallet for future use
*/

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
  v_subscription RECORD;
  v_subscription_amount numeric(10, 2);
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
    -- Update existing wallet - credit the manual payment amount
    v_new_balance := v_new_balance + v_transaction.amount;
    UPDATE wallets
    SET 
      balance = v_new_balance,
      updated_at = now()
    WHERE id = v_wallet_id;
  END IF;

  -- Log the credit wallet transaction
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
    'Manual payment approved - Amount credited',
    'manual_payment',
    p_transaction_id
  );

  -- If subscription is linked, deduct subscription amount from wallet
  IF v_transaction.subscription_id IS NOT NULL THEN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE id = v_transaction.subscription_id;

    IF FOUND THEN
      -- Use final_price (includes all discounts and taxes) or fall back to calculated_price
      v_subscription_amount := COALESCE(v_subscription.final_price, v_subscription.calculated_price);

      -- Check if wallet has sufficient balance
      IF v_new_balance >= v_subscription_amount THEN
        -- Deduct subscription amount from wallet
        v_new_balance := v_new_balance - v_subscription_amount;
        
        UPDATE wallets
        SET 
          balance = v_new_balance,
          updated_at = now()
        WHERE id = v_wallet_id;

        -- Log the debit wallet transaction for subscription
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
          'debit',
          v_subscription_amount,
          'Subscription payment deducted',
          'subscription_charge',
          v_transaction.subscription_id
        );

        -- Update subscription status to active
        UPDATE subscriptions
        SET 
          payment_status = 'paid',
          payment_method = 'manual',
          status = 'active',
          updated_at = now()
        WHERE id = v_transaction.subscription_id;
      ELSE
        -- Insufficient balance after credit (shouldn't happen normally)
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Insufficient wallet balance for subscription after crediting payment'
        );
      END IF;
    END IF;
  END IF;

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
    'Approved manual payment of ₹' || v_transaction.amount || ' for user',
    'approve',
    'manual_payment',
    p_transaction_id,
    jsonb_build_object(
      'amount', v_transaction.amount,
      'user_id', v_transaction.user_id,
      'notes', p_admin_notes,
      'final_balance', v_new_balance,
      'subscription_id', v_transaction.subscription_id,
      'subscription_amount_deducted', v_subscription_amount
    )
  );

  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id,
    'amount_credited', v_transaction.amount,
    'subscription_amount_deducted', v_subscription_amount,
    'final_wallet_balance', v_new_balance,
    'subscription_id', v_transaction.subscription_id
  );
END;
$$;