/*
  # Multi-Item and Multi-Pet Subscription Support

  ## Overview
  This migration adds support for subscriptions with multiple pets and multiple meal items.
  
  ## Changes

  1. New Tables
    - `subscription_pets` - Links subscriptions to multiple pets
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `pet_id` (uuid, references pets)
      - `created_at` (timestamptz)
    
    - `subscription_items` - Links subscriptions to multiple meals with pricing per pet
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `subscription_pet_id` (uuid, references subscription_pets)
      - `meal_id` (uuid, references meals)
      - `quantity` (integer) - calculated food quantity in grams
      - `price_per_day` (numeric) - daily price for this item for this pet
      - `created_at` (timestamptz)

  2. Schema Design
    - A subscription can have multiple pets via `subscription_pets`
    - Each pet can have multiple meals via `subscription_items`
    - Pricing is calculated per pet per meal
    - Weight slabs are applied per pet
    - Final subscription price = sum of all items across all pets × number of days

  3. Security
    - Enable RLS on both new tables
    - Customers can view their own subscription details
    - Admins have full access
    - Kitchen and delivery staff can view active subscriptions

  4. Backward Compatibility
    - Existing subscriptions with `pet_id` and `meal_id` continue to work
    - New multi-item subscriptions use the junction tables
    - Application code handles both patterns
*/

-- Create subscription_pets table
CREATE TABLE IF NOT EXISTS subscription_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subscription_id, pet_id)
);

-- Create subscription_items table
CREATE TABLE IF NOT EXISTS subscription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  subscription_pet_id uuid NOT NULL REFERENCES subscription_pets(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  price_per_day numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subscription_pet_id, meal_id)
);

-- Enable RLS on subscription_pets
ALTER TABLE subscription_pets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subscription_items
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_pets

-- Customers can view their own subscription pets
CREATE POLICY "Customers can view own subscription pets"
  ON subscription_pets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_pets.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Customers can insert subscription pets for their own subscriptions
CREATE POLICY "Customers can insert own subscription pets"
  ON subscription_pets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_pets.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Admins can manage all subscription pets
CREATE POLICY "Admins can manage all subscription pets"
  ON subscription_pets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Kitchen staff can view subscription pets
CREATE POLICY "Kitchen staff can view subscription pets"
  ON subscription_pets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'kitchen'
    )
  );

-- Delivery staff can view subscription pets
CREATE POLICY "Delivery staff can view subscription pets"
  ON subscription_pets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'delivery'
    )
  );

-- RLS Policies for subscription_items

-- Customers can view their own subscription items
CREATE POLICY "Customers can view own subscription items"
  ON subscription_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_items.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Customers can insert subscription items for their own subscriptions
CREATE POLICY "Customers can insert own subscription items"
  ON subscription_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_items.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Admins can manage all subscription items
CREATE POLICY "Admins can manage all subscription items"
  ON subscription_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Kitchen staff can view subscription items
CREATE POLICY "Kitchen staff can view subscription items"
  ON subscription_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'kitchen'
    )
  );

-- Delivery staff can view subscription items
CREATE POLICY "Delivery staff can view subscription items"
  ON subscription_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'delivery'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_pets_subscription_id ON subscription_pets(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_pets_pet_id ON subscription_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_pet_id ON subscription_items(subscription_pet_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_meal_id ON subscription_items(meal_id);
