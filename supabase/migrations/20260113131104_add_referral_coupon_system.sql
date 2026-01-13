/*
  # Add Referral Coupon System with Stacking Controls

  ## Summary
  Enable referral coupons that can be stacked with admin-controlled limits.

  ## Changes
  
  ### 1. Coupons Table Updates
  - Add `is_referral` boolean field to identify referral coupons
  - Default is false for existing coupons
  
  ### 2. New Table: referral_coupon_settings
  - Stores global admin settings for referral coupon behavior
  - Fields:
    - `id` - Primary key
    - `max_coupons_per_order` - Maximum number of referral coupons allowed in one order (null = unlimited)
    - `max_discount_percentage` - Maximum % of order value that can be discounted (1-100, null = 100%)
    - `stacking_policy` - Enum: 'enabled', 'partial', 'disabled'
    - `updated_at` - Timestamp of last update
  
  ### 3. Security
  - Enable RLS on referral_coupon_settings
  - Admins can manage settings
  - All users can read settings (needed for validation)

  ## Default Settings
  - Stacking enabled
  - No limit on number of coupons
  - 100% discount allowed
*/

-- Add is_referral field to coupons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'is_referral'
  ) THEN
    ALTER TABLE coupons ADD COLUMN is_referral boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create referral_coupon_settings table
CREATE TABLE IF NOT EXISTS referral_coupon_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_coupons_per_order integer CHECK (max_coupons_per_order IS NULL OR max_coupons_per_order > 0),
  max_discount_percentage integer CHECK (max_discount_percentage IS NULL OR (max_discount_percentage >= 1 AND max_discount_percentage <= 100)),
  stacking_policy text DEFAULT 'enabled' CHECK (stacking_policy IN ('enabled', 'partial', 'disabled')),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE referral_coupon_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings (needed for validation)
CREATE POLICY "Anyone can read referral settings"
  ON referral_coupon_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete settings
CREATE POLICY "Admins can manage referral settings"
  ON referral_coupon_settings
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

-- Insert default settings if table is empty
INSERT INTO referral_coupon_settings (max_coupons_per_order, max_discount_percentage, stacking_policy)
SELECT NULL, 100, 'enabled'
WHERE NOT EXISTS (SELECT 1 FROM referral_coupon_settings);