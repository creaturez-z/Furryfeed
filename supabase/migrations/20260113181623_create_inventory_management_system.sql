/*
  # Inventory Management System

  ## Overview
  Complete inventory management system with automatic stock deduction, 
  low stock alerts, and product-to-inventory mapping.

  ## New Tables

  ### `inventory_items`
  Stores all inventory items with their quantities and units
  - `id` (uuid, primary key)
  - `name` (text) - Item name
  - `quantity` (numeric) - Available quantity
  - `unit` (text) - Unit type: 'pieces', 'liters', 'grams', 'kilograms'
  - `display_unit` (text) - Auto-calculated display unit (g/kg)
  - `custom_low_stock_threshold` (numeric, nullable) - Custom threshold for this item
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `inventory_settings`
  Global settings for inventory management
  - `id` (uuid, primary key)
  - `global_low_stock_threshold` (numeric) - Default threshold for all items
  - `updated_at` (timestamptz)

  ### `meal_inventory_mapping`
  Maps meals to inventory items with quantity used
  - `id` (uuid, primary key)
  - `meal_id` (uuid, foreign key to meals)
  - `inventory_item_id` (uuid, foreign key to inventory_items)
  - `quantity_used` (numeric) - Quantity of inventory item used per meal unit
  - `created_at` (timestamptz)

  ### `inventory_transactions`
  Audit trail for all inventory changes
  - `id` (uuid, primary key)
  - `inventory_item_id` (uuid, foreign key)
  - `transaction_type` (text) - 'order', 'subscription', 'manual_adjustment', 'restock'
  - `quantity_change` (numeric) - Positive for additions, negative for deductions
  - `reference_id` (uuid, nullable) - Order or subscription ID
  - `notes` (text, nullable)
  - `created_by` (uuid, foreign key to auth.users)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only authenticated admin users can manage inventory
  - Customers cannot access inventory data

  ## Important Notes
  1. Automatic unit conversion: values >= 1000g display as kg
  2. Low stock threshold: uses custom per item, falls back to global
  3. Stock deduction happens automatically on order/subscription creation
  4. Complete audit trail maintained in inventory_transactions
*/

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL CHECK (unit IN ('pieces', 'liters', 'grams', 'kilograms')),
  display_unit text,
  custom_low_stock_threshold numeric CHECK (custom_low_stock_threshold >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_settings table
CREATE TABLE IF NOT EXISTS inventory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_low_stock_threshold numeric NOT NULL DEFAULT 10 CHECK (global_low_stock_threshold >= 0),
  updated_at timestamptz DEFAULT now()
);

-- Create meal_inventory_mapping table
CREATE TABLE IF NOT EXISTS meal_inventory_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_used numeric NOT NULL CHECK (quantity_used > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(meal_id, inventory_item_id)
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('order', 'subscription', 'manual_adjustment', 'restock')),
  quantity_change numeric NOT NULL,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Insert default global settings
INSERT INTO inventory_settings (global_low_stock_threshold)
VALUES (10)
ON CONFLICT DO NOTHING;

-- Create function to auto-update display_unit based on quantity
CREATE OR REPLACE FUNCTION update_inventory_display_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit = 'grams' OR NEW.unit = 'kilograms' THEN
    IF NEW.quantity >= 1000 AND NEW.unit = 'grams' THEN
      NEW.display_unit := 'kilograms';
    ELSIF NEW.quantity < 1000 AND NEW.unit = 'kilograms' THEN
      NEW.display_unit := 'grams';
    ELSE
      NEW.display_unit := NEW.unit;
    END IF;
  ELSE
    NEW.display_unit := NEW.unit;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating display_unit
DROP TRIGGER IF EXISTS inventory_display_unit_trigger ON inventory_items;
CREATE TRIGGER inventory_display_unit_trigger
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_display_unit();

-- Create function to deduct inventory for an order
CREATE OR REPLACE FUNCTION deduct_inventory_for_order(
  p_subscription_id uuid,
  p_order_date date,
  p_created_by uuid
)
RETURNS void AS $$
DECLARE
  v_meal_record RECORD;
  v_mapping_record RECORD;
BEGIN
  -- Get all meals for this subscription on this date
  FOR v_meal_record IN
    SELECT sdi.meal_id, sdi.quantity
    FROM subscription_daily_items sdi
    WHERE sdi.subscription_id = p_subscription_id
      AND sdi.delivery_date = p_order_date
  LOOP
    -- For each meal, get inventory mappings and deduct
    FOR v_mapping_record IN
      SELECT mim.inventory_item_id, mim.quantity_used
      FROM meal_inventory_mapping mim
      WHERE mim.meal_id = v_meal_record.meal_id
    LOOP
      -- Calculate total quantity to deduct
      DECLARE
        v_total_deduction numeric;
      BEGIN
        v_total_deduction := v_mapping_record.quantity_used * v_meal_record.quantity;
        
        -- Deduct from inventory
        UPDATE inventory_items
        SET quantity = GREATEST(0, quantity - v_total_deduction)
        WHERE id = v_mapping_record.inventory_item_id;
        
        -- Log transaction
        INSERT INTO inventory_transactions (
          inventory_item_id,
          transaction_type,
          quantity_change,
          reference_id,
          created_by,
          notes
        ) VALUES (
          v_mapping_record.inventory_item_id,
          'order',
          -v_total_deduction,
          p_subscription_id,
          p_created_by,
          'Auto-deduction for order on ' || p_order_date::text
        );
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_inventory_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Admins can view all inventory items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'kitchen_staff', 'delivery_staff')
    )
  );

CREATE POLICY "Admins can insert inventory items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update inventory items"
  ON inventory_items FOR UPDATE
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

CREATE POLICY "Admins can delete inventory items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for inventory_settings
CREATE POLICY "Admins can view inventory settings"
  ON inventory_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update inventory settings"
  ON inventory_settings FOR UPDATE
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

-- RLS Policies for meal_inventory_mapping
CREATE POLICY "Admins can view meal inventory mappings"
  ON meal_inventory_mapping FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'kitchen_staff')
    )
  );

CREATE POLICY "Admins can insert meal inventory mappings"
  ON meal_inventory_mapping FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete meal inventory mappings"
  ON meal_inventory_mapping FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for inventory_transactions
CREATE POLICY "Admins can view inventory transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert inventory transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_quantity ON inventory_items(quantity);
CREATE INDEX IF NOT EXISTS idx_meal_inventory_mapping_meal_id ON meal_inventory_mapping(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_inventory_mapping_inventory_id ON meal_inventory_mapping(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);