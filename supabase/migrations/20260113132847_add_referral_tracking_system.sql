/*
  # Add Referral Tracking System

  ## Summary
  Complete referral tracking system to monitor who referred whom and manage referral coupons.

  ## Changes
  
  ### 1. Profiles Table Updates
  - Add `referral_code` - Unique code each user gets to share
  - Add `referred_by_user_id` - UUID of user who referred them
  - Add `referral_date` - When they signed up using a referral
  
  ### 2. New Table: referral_coupons_earned
  - Tracks all referral coupons earned by customers
  - Links coupons to specific users
  - Fields:
    - `id` - Primary key
    - `customer_id` - User who earned the coupon
    - `coupon_id` - The referral coupon earned
    - `earned_date` - When they earned it
    - `earned_reason` - Why they earned it (e.g., "referred_friend", "signup_bonus")
    - `referred_user_id` - If earned by referring someone, who was referred
  
  ### 3. Security
  - Enable RLS on referral_coupons_earned
  - Users can view their own earned coupons
  - Admins can view and manage all referral coupons

  ## Default Behavior
  - Generate unique referral codes for existing users
  - Track all referral relationships
*/

-- Add referral tracking fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referred_by_user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by_user_id uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_date timestamptz;
  END IF;
END $$;

-- Generate unique referral codes for existing users without one
UPDATE profiles
SET referral_code = 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Create referral_coupons_earned table
CREATE TABLE IF NOT EXISTS referral_coupons_earned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  earned_date timestamptz DEFAULT now(),
  earned_reason text DEFAULT 'signup_bonus' CHECK (earned_reason IN ('signup_bonus', 'referred_friend', 'promotion', 'other')),
  referred_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, coupon_id)
);

-- Enable RLS
ALTER TABLE referral_coupons_earned ENABLE ROW LEVEL SECURITY;

-- Users can view their own earned coupons
CREATE POLICY "Users can view own earned referral coupons"
  ON referral_coupons_earned
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Admins can view all earned coupons
CREATE POLICY "Admins can view all earned referral coupons"
  ON referral_coupons_earned
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage earned coupons
CREATE POLICY "Admins can manage earned referral coupons"
  ON referral_coupons_earned
  FOR ALL
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_referral_coupons_customer ON referral_coupons_earned(customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_coupons_coupon ON referral_coupons_earned(coupon_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);