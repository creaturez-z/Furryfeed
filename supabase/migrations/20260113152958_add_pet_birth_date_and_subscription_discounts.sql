/*
  # Add Pet Birth Date and Subscription Discounts

  ## Summary
  Add pet birth date field for automatic age calculation and subscription discount features for admin.

  ## Changes

  ### 1. Pets Table Updates
  - Add `birth_date` - Date field for pet's birth date
  - Age will be calculated from birth_date in the application layer

  ### 2. Subscriptions Table Updates
  - Add `manual_discount_type` - Type of manual discount ('percentage' | 'flat' | null)
  - Add `manual_discount_value` - Value of manual discount
  - Add `manual_discount_applies_to` - What discount applies to ('total' | 'specific_items')
  - Add `manual_discount_item_ids` - JSONB array of item IDs if applies to specific items
  - Add `applied_coupon_id` - UUID reference to coupons table
  - Add `coupon_discount_amount` - Calculated discount from coupon
  - Add `final_price` - Final price after all discounts

  ## Important Notes
  - Birth date is optional (existing pets may not have it)
  - Manual discounts are admin-only features
  - Coupon validation happens at application layer
  - Final price calculation includes all discounts
*/

-- Add birth_date to pets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE pets ADD COLUMN birth_date date;
  END IF;
END $$;

-- Add subscription discount fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'manual_discount_type'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN manual_discount_type text CHECK (manual_discount_type IN ('percentage', 'flat'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'manual_discount_value'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN manual_discount_value numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'manual_discount_applies_to'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN manual_discount_applies_to text CHECK (manual_discount_applies_to IN ('total', 'specific_items'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'manual_discount_item_ids'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN manual_discount_item_ids jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'applied_coupon_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN applied_coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'coupon_discount_amount'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN coupon_discount_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'final_price'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN final_price numeric(10, 2);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN pets.birth_date IS 'Pet birth date for automatic age calculation';
COMMENT ON COLUMN subscriptions.manual_discount_type IS 'Admin-only manual discount type: percentage or flat';
COMMENT ON COLUMN subscriptions.manual_discount_value IS 'Value of manual discount';
COMMENT ON COLUMN subscriptions.manual_discount_applies_to IS 'Whether discount applies to total or specific items';
COMMENT ON COLUMN subscriptions.manual_discount_item_ids IS 'Array of subscription item IDs for specific item discounts';
COMMENT ON COLUMN subscriptions.applied_coupon_id IS 'Reference to applied coupon if any';
COMMENT ON COLUMN subscriptions.coupon_discount_amount IS 'Calculated discount amount from applied coupon';
COMMENT ON COLUMN subscriptions.final_price IS 'Final price after all discounts applied';