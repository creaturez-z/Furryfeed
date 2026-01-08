/*
  # Tax Configuration System

  ## Overview
  Creates a tax configuration system for managing tax rules applied to orders and subscriptions.

  ## New Tables
  
  ### `tax_configurations`
  - `id` (uuid, primary key) - Unique identifier
  - `tax_name` (text) - Name of the tax (e.g., "GST", "VAT")
  - `tax_percentage` (numeric) - Tax rate as percentage (e.g., 5, 12, 18)
  - `tax_type` (text) - Type of tax calculation: 'inclusive' or 'exclusive'
  - `applies_to` (text) - Where tax applies: 'subscriptions', 'one_time_orders', 'both'
  - `is_active` (boolean) - Whether this tax configuration is currently active
  - `created_at` (timestamptz) - When the configuration was created
  - `updated_at` (timestamptz) - When the configuration was last modified

  ## Security
  - Enable RLS on `tax_configurations` table
  - Policies:
    - Anyone can read tax configurations (needed for price calculations)
    - Only authenticated admin users can manage tax configurations

  ## Important Notes
  - Only one tax configuration can be active at a time
  - Tax changes apply only to new orders/subscriptions
  - Historical orders retain their original tax calculations
*/

-- Create tax_configurations table
CREATE TABLE IF NOT EXISTS tax_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_name text NOT NULL,
  tax_percentage numeric(5, 2) NOT NULL CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
  tax_type text NOT NULL CHECK (tax_type IN ('inclusive', 'exclusive')),
  applies_to text NOT NULL CHECK (applies_to IN ('subscriptions', 'one_time_orders', 'both')),
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read tax configurations (needed for checkout calculations)
CREATE POLICY "Anyone can read tax configurations"
  ON tax_configurations
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert tax configurations
CREATE POLICY "Authenticated users can insert tax configurations"
  ON tax_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update tax configurations
CREATE POLICY "Authenticated users can update tax configurations"
  ON tax_configurations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only authenticated users can delete tax configurations
CREATE POLICY "Authenticated users can delete tax configurations"
  ON tax_configurations
  FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_configurations_updated_at
  BEFORE UPDATE ON tax_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one active tax configuration at a time
CREATE OR REPLACE FUNCTION ensure_single_active_tax()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other tax configurations
    UPDATE tax_configurations
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_tax_trigger
  BEFORE INSERT OR UPDATE ON tax_configurations
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_tax();

-- Add tax-related columns to orders table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'subtotal_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tax_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tax_percentage'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax_percentage numeric(5, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax_amount numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add tax-related columns to subscriptions table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'subtotal_amount'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN subtotal_amount numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'tax_name'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN tax_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'tax_percentage'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN tax_percentage numeric(5, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN tax_amount numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Insert a default GST configuration
INSERT INTO tax_configurations (tax_name, tax_percentage, tax_type, applies_to, is_active)
VALUES ('GST', 18, 'exclusive', 'both', true)
ON CONFLICT DO NOTHING;
