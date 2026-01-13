/*
  # Fix Inventory Unit Handling v3

  ## Changes Made
  
  1. **Fix Unit Storage**
     - Remove confusing auto-conversion trigger that was changing units
     - Keep the user-selected unit exactly as chosen
     - Store kg as 'kg' and g as 'g' for clarity
  
  2. **Update meal_inventory_mapping**
     - Add unit field to specify exact unit used per mapping
     - This ensures correct deduction even if inventory item unit changes
  
  3. **Simplified Unit System**
     - units: 'pieces', 'liters', 'g', 'kg', 'ml'
     - Display exactly what's stored
     - No auto-conversion that causes confusion
  
  ## Important Notes
  - Old data will be preserved and migrated
  - New entries will use the clearer unit system
  - Deduction logic updated to handle unit conversion properly
*/

-- Step 1: Drop the problematic trigger and function first
DROP TRIGGER IF EXISTS inventory_display_unit_trigger ON inventory_items;
DROP FUNCTION IF EXISTS update_inventory_display_unit();

-- Step 2: Drop the old constraint
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_unit_check;

-- Step 3: Update existing data to use simpler unit names
UPDATE inventory_items SET unit = 'kg', display_unit = 'kg' WHERE unit = 'kilograms';
UPDATE inventory_items SET unit = 'g', display_unit = 'g' WHERE unit = 'grams';
UPDATE inventory_items SET display_unit = unit WHERE display_unit IS NULL OR display_unit = '';

-- Step 4: Add new constraint
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_check 
  CHECK (unit IN ('pieces', 'liters', 'g', 'kg', 'ml'));

-- Step 5: Add unit field to meal_inventory_mapping
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_inventory_mapping' AND column_name = 'unit'
  ) THEN
    ALTER TABLE meal_inventory_mapping ADD COLUMN unit text DEFAULT 'g';
    
    -- Set default unit from the linked inventory item for existing mappings
    UPDATE meal_inventory_mapping mim
    SET unit = ii.unit
    FROM inventory_items ii
    WHERE mim.inventory_item_id = ii.id;
    
    -- Make it required going forward
    ALTER TABLE meal_inventory_mapping ALTER COLUMN unit SET NOT NULL;
    ALTER TABLE meal_inventory_mapping ADD CONSTRAINT meal_inventory_mapping_unit_check 
      CHECK (unit IN ('pieces', 'liters', 'g', 'kg', 'ml'));
  END IF;
END $$;

-- Step 6: Create simpler update trigger that only updates timestamp and display_unit
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  NEW.display_unit := NEW.unit;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_update_trigger
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_timestamp();

-- Step 7: Update the deduction function to handle unit conversion
CREATE OR REPLACE FUNCTION deduct_inventory_for_order(
  p_subscription_id uuid,
  p_order_date date,
  p_created_by uuid
)
RETURNS void AS $$
DECLARE
  v_meal_record RECORD;
  v_mapping_record RECORD;
  v_inventory_record RECORD;
  v_deduction_amount numeric;
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
      SELECT mim.inventory_item_id, mim.quantity_used, mim.unit as mapping_unit
      FROM meal_inventory_mapping mim
      WHERE mim.meal_id = v_meal_record.meal_id
    LOOP
      -- Get inventory item details
      SELECT * INTO v_inventory_record
      FROM inventory_items
      WHERE id = v_mapping_record.inventory_item_id;
      
      IF v_inventory_record.id IS NOT NULL THEN
        -- Calculate deduction with unit conversion
        v_deduction_amount := v_mapping_record.quantity_used * v_meal_record.quantity;
        
        -- Convert units if needed (kg to g or vice versa)
        IF v_mapping_record.mapping_unit = 'kg' AND v_inventory_record.unit = 'g' THEN
          v_deduction_amount := v_deduction_amount * 1000; -- kg to g
        ELSIF v_mapping_record.mapping_unit = 'g' AND v_inventory_record.unit = 'kg' THEN
          v_deduction_amount := v_deduction_amount / 1000; -- g to kg
        END IF;
        
        -- Deduct from inventory
        UPDATE inventory_items
        SET quantity = GREATEST(0, quantity - v_deduction_amount)
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
          -v_deduction_amount,
          p_subscription_id,
          p_created_by,
          'Auto-deduction for order on ' || p_order_date::text || ' (converted from ' || 
          v_mapping_record.quantity_used || v_mapping_record.mapping_unit || ')'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;