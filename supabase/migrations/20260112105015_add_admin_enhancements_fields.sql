/*
  # Admin Dashboard Enhancements - Phase 1

  ## Overview
  Adds fields needed for enhanced admin functionality including tax control per customer
  and delivery address tracking for subscriptions.

  ## Changes
  
  1. Profiles Table
    - Add `tax_enabled` (boolean, default true) - Controls whether tax applies to customer
  
  2. Subscriptions Table  
    - Add `delivery_address` (text) - Stores delivery address for each subscription
  
  ## Important Notes
  - Tax control is admin-only, hidden from customers
  - All existing customers will have tax enabled by default
  - Delivery address is mandatory for new subscriptions
  - Existing subscriptions will need address added by admin or customer
*/

-- Add tax_enabled field to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'tax_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tax_enabled boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Add delivery_address field to subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN delivery_address text;
  END IF;
END $$;

-- Add comment to document the field purpose
COMMENT ON COLUMN profiles.tax_enabled IS 'Admin-controlled setting to include/exclude tax for this customer';
COMMENT ON COLUMN subscriptions.delivery_address IS 'Delivery address for this subscription, can be updated by customer';
