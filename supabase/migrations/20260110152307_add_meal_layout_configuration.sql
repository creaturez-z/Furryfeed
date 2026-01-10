/*
  # Add Meal Layout Configuration

  1. Changes to meals table
    - Add `sort_order` column for custom meal ordering (default 0)
    - Lower sort_order values appear first
  
  2. New Tables
    - `meal_layout_config`
      - `id` (uuid, primary key)
      - `desktop_items_per_row` (integer, 1-6, default 3)
      - `mobile_items_per_row` (integer, 1-6, default 1)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  3. Security
    - Enable RLS on `meal_layout_config` table
    - Admins can read/write layout config
    - Authenticated users can read layout config
  
  4. Notes
    - Only one row should exist in meal_layout_config (singleton pattern)
    - Initial default configuration will be created
*/

-- Add sort_order to meals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE meals ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Create meal_layout_config table
CREATE TABLE IF NOT EXISTS meal_layout_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desktop_items_per_row integer DEFAULT 3 CHECK (desktop_items_per_row >= 1 AND desktop_items_per_row <= 6),
  mobile_items_per_row integer DEFAULT 1 CHECK (mobile_items_per_row >= 1 AND mobile_items_per_row <= 6),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meal_layout_config ENABLE ROW LEVEL SECURITY;

-- Create policies for meal_layout_config
CREATE POLICY "Admins can read layout config"
  ON meal_layout_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert layout config"
  ON meal_layout_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update layout config"
  ON meal_layout_config FOR UPDATE
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

CREATE POLICY "Customers can read layout config"
  ON meal_layout_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'customer'
    )
  );

-- Insert default configuration
INSERT INTO meal_layout_config (desktop_items_per_row, mobile_items_per_row)
SELECT 3, 1
WHERE NOT EXISTS (SELECT 1 FROM meal_layout_config);

-- Add index on sort_order for better performance
CREATE INDEX IF NOT EXISTS idx_meals_sort_order ON meals(sort_order, created_at);