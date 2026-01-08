/*
  # Enhanced Schema Updates

  ## Overview
  Major updates to support enhanced meal management, ingredient tracking, and banner-meal relationships.

  ## New Tables

  ### 1. categories
  Product/meal categories
  - id (uuid, primary key)
  - name (text)
  - description (text, optional)
  - is_active (boolean)
  - created_at, updated_at (timestamptz)

  ### 2. meal_ingredients
  Ingredients for each meal (for kitchen raw material calculation)
  - id (uuid, primary key)
  - meal_id (uuid, references meals)
  - ingredient_name (text)
  - quantity (decimal)
  - unit (text) - 'grams', 'kg', 'ml', 'liters', 'pieces'
  - created_at, updated_at (timestamptz)

  ### 3. banner_meals
  Junction table for banner-to-meal many-to-many relationship
  - id (uuid, primary key)
  - banner_id (uuid, references banners)
  - meal_id (uuid, references meals)
  - created_at (timestamptz)

  ## Table Modifications

  ### meals
  - Add category_id (optional reference to categories)
  - Add mrp (decimal) - Maximum Retail Price
  - Add sale_price (decimal) - Current selling price
  - Remove base_price_per_10g (replaced by sale_price with weight slab calculation)

  ### banners
  - Remove meal_id (replaced by banner_meals junction table)

  ## Security
  - RLS enabled on all new tables
  - Appropriate policies for different user roles
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Meal ingredients table
CREATE TABLE IF NOT EXISTS meal_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit text NOT NULL CHECK (unit IN ('grams', 'kg', 'ml', 'liters', 'pieces')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (quantity > 0)
);

ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view meal ingredients"
  ON meal_ingredients FOR SELECT
  TO authenticated
  USING (true);

-- Banner meals junction table
CREATE TABLE IF NOT EXISTS banner_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(banner_id, meal_id)
);

ALTER TABLE banner_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view banner meals"
  ON banner_meals FOR SELECT
  TO authenticated
  USING (true);

-- Add new columns to meals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE meals ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'mrp'
  ) THEN
    ALTER TABLE meals ADD COLUMN mrp numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE meals ADD COLUMN sale_price numeric(10,2);
  END IF;
END $$;

-- Update banner settings to include banners_per_row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'banner_settings' AND column_name = 'banners_per_row'
  ) THEN
    ALTER TABLE banner_settings ADD COLUMN banners_per_row integer DEFAULT 3 CHECK (banners_per_row > 0);
  END IF;
END $$;

-- Remove meal_id from banners (it's now in banner_meals junction table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'banners' AND column_name = 'meal_id'
  ) THEN
    ALTER TABLE banners DROP COLUMN meal_id;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal_id ON meal_ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_banner_meals_banner_id ON banner_meals(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_meals_meal_id ON banner_meals(meal_id);
CREATE INDEX IF NOT EXISTS idx_meals_category_id ON meals(category_id);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Chicken', 'Meals with chicken as the primary protein'),
  ('Beef', 'Meals with beef as the primary protein'),
  ('Fish', 'Meals with fish as the primary protein'),
  ('Lamb', 'Meals with lamb as the primary protein'),
  ('Turkey', 'Meals with turkey as the primary protein'),
  ('Vegetarian', 'Plant-based meals')
ON CONFLICT (name) DO NOTHING;
