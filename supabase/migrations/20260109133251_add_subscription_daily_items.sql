/*
  # Add Subscription Daily Items for Per-Day Meal Management

  1. New Table
    - `subscription_daily_items` - Tracks meals and quantities for each day
      - `id` (uuid, primary key)
      - `subscription_id` (uuid) - References subscriptions table
      - `pet_id` (uuid) - References pets table
      - `meal_id` (uuid) - References meals table
      - `delivery_date` (date) - The specific date for this meal
      - `quantity` (integer) - Quantity in grams for this meal on this date
      - `price` (numeric) - Price for this meal on this date
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Purpose
    - Allows different meals on different days
    - Supports multiple quantities of the same meal on the same day
    - Enables flexible meal planning per pet per day
    - Powers the calendar view for subscription management

  3. Security
    - Enable RLS on table
    - Customers can view/manage their own subscription daily items
    - Admins can manage all items
    - Kitchen and delivery staff can view items

  4. Constraints
    - Unique constraint on (subscription_id, pet_id, meal_id, delivery_date) per entry
    - Quantity must be greater than 0
    - Price must be non-negative
*/

-- Create subscription_daily_items table
CREATE TABLE IF NOT EXISTS subscription_daily_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  delivery_date date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries by subscription and date
CREATE INDEX IF NOT EXISTS idx_subscription_daily_items_subscription 
  ON subscription_daily_items(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_daily_items_delivery_date 
  ON subscription_daily_items(delivery_date);

CREATE INDEX IF NOT EXISTS idx_subscription_daily_items_pet 
  ON subscription_daily_items(pet_id);

-- Enable RLS
ALTER TABLE subscription_daily_items ENABLE ROW LEVEL SECURITY;

-- Customers can view their own subscription daily items
CREATE POLICY "Customers can view own subscription daily items"
  ON subscription_daily_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_daily_items.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Customers can insert daily items for their own subscriptions
CREATE POLICY "Customers can insert own subscription daily items"
  ON subscription_daily_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_daily_items.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Customers can update their own subscription daily items
CREATE POLICY "Customers can update own subscription daily items"
  ON subscription_daily_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_daily_items.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_daily_items.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Customers can delete their own subscription daily items
CREATE POLICY "Customers can delete own subscription daily items"
  ON subscription_daily_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_daily_items.subscription_id
      AND subscriptions.customer_id = auth.uid()
    )
  );

-- Admins can manage all subscription daily items
CREATE POLICY "Admins can manage all subscription daily items"
  ON subscription_daily_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Kitchen staff can view all subscription daily items
CREATE POLICY "Kitchen can view all subscription daily items"
  ON subscription_daily_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'kitchen'
    )
  );

-- Delivery staff can view all subscription daily items
CREATE POLICY "Delivery can view all subscription daily items"
  ON subscription_daily_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'delivery'
    )
  );
