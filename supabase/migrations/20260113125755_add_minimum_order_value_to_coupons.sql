/*
  # Add Minimum Order Value to Coupons

  ## Summary
  Add minimum order/subscription value requirement to coupon system.

  ## Changes
  1. Add `minimum_order_value` column to coupons table
    - Optional field (nullable)
    - Numeric type with 2 decimal places
    - Default is null (no minimum requirement)
    - Must be greater than 0 if set

  ## Usage
  - Admins can set minimum order value for coupons (e.g., ₹499, ₹999)
  - Coupons only apply if cart/subscription total meets or exceeds minimum value
  - If null, no minimum value requirement

  ## Important Notes
  - This is a non-breaking change (existing coupons will have null value)
  - Validation logic will check this value before applying discount
*/

-- Add minimum_order_value column to coupons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'minimum_order_value'
  ) THEN
    ALTER TABLE coupons ADD COLUMN minimum_order_value numeric(10,2) CHECK (minimum_order_value IS NULL OR minimum_order_value > 0);
  END IF;
END $$;