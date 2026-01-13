/*
  # Add Discount Fields to Invoices

  ## Summary
  Add discount tracking fields to invoices table to show manual and coupon discounts.

  ## Changes

  ### Invoices Table Updates
  - Add `manual_discount_amount` - Amount of manual discount applied
  - Add `coupon_discount_amount` - Amount of coupon discount applied
  - Add `discount_description` - Text description of discounts applied

  ## Important Notes
  - Discounts are stored as amounts, not percentages (already calculated)
  - These fields match the subscription discount tracking
  - Existing invoices will have NULL discount values
*/

-- Add discount fields to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'manual_discount_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN manual_discount_amount decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'coupon_discount_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN coupon_discount_amount decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'discount_description'
  ) THEN
    ALTER TABLE invoices ADD COLUMN discount_description text;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN invoices.manual_discount_amount IS 'Amount of manual discount applied by admin';
COMMENT ON COLUMN invoices.coupon_discount_amount IS 'Amount of coupon discount applied';
COMMENT ON COLUMN invoices.discount_description IS 'Description of discounts applied';