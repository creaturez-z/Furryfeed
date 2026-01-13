/*
  # Create Coupon System

  ## Summary
  Comprehensive coupon management system with discount codes, validation rules, and usage tracking.

  ## New Tables

  ### 1. coupons
  Main coupon configuration table
  - `id` (uuid, primary key)
  - `code` (text, unique) - Coupon code (e.g., "SAVE20")
  - `discount_type` (text) - "flat" or "percentage"
  - `discount_value` (numeric) - Amount for flat discount or percentage for percentage discount
  - `start_date` (date) - Coupon becomes valid from this date
  - `expiry_date` (date) - Coupon expires after this date
  - `total_usage_limit` (integer, nullable) - Total number of times coupon can be used across all users (null = unlimited)
  - `per_user_usage_limit` (integer, nullable) - Number of times each user can use the coupon (null = unlimited)
  - `user_eligibility` (text) - "all", "new_users", "existing_users", "specific_users"
  - `product_applicability` (text) - "all", "specific_products"
  - `is_active` (boolean) - Whether coupon is currently active
  - `created_at`, `updated_at` (timestamptz)

  ### 2. coupon_users
  Specific users eligible for a coupon (when user_eligibility = "specific_users")
  - `id` (uuid, primary key)
  - `coupon_id` (uuid, references coupons)
  - `user_id` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 3. coupon_products
  Specific meals/products a coupon applies to (when product_applicability = "specific_products")
  - `id` (uuid, primary key)
  - `coupon_id` (uuid, references coupons)
  - `meal_id` (uuid, references meals)
  - `created_at` (timestamptz)

  ### 4. coupon_usage
  Tracks every use of a coupon
  - `id` (uuid, primary key)
  - `coupon_id` (uuid, references coupons)
  - `user_id` (uuid, references profiles)
  - `subscription_id` (uuid, references subscriptions, nullable)
  - `discount_amount` (numeric) - Actual discount applied
  - `used_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Admins can manage all coupon data
  - Customers can view active coupons eligible for them
  - Customers can view their own usage history

  ## Important Notes
  - Coupon codes are case-insensitive
  - Validation happens server-side to prevent tampering
  - Usage tracking prevents exceeding limits
*/

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  start_date date NOT NULL,
  expiry_date date NOT NULL,
  total_usage_limit integer CHECK (total_usage_limit > 0),
  per_user_usage_limit integer CHECK (per_user_usage_limit > 0),
  user_eligibility text NOT NULL DEFAULT 'all' CHECK (user_eligibility IN ('all', 'new_users', 'existing_users', 'specific_users')),
  product_applicability text NOT NULL DEFAULT 'all' CHECK (product_applicability IN ('all', 'specific_products')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (expiry_date >= start_date),
  CHECK ((discount_type = 'percentage' AND discount_value <= 100) OR discount_type = 'flat')
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Create coupon_users table (for specific user eligibility)
CREATE TABLE IF NOT EXISTS coupon_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE coupon_users ENABLE ROW LEVEL SECURITY;

-- Create coupon_products table (for specific product applicability)
CREATE TABLE IF NOT EXISTS coupon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, meal_id)
);

ALTER TABLE coupon_products ENABLE ROW LEVEL SECURITY;

-- Create coupon_usage table (usage tracking)
CREATE TABLE IF NOT EXISTS coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  discount_amount numeric(10,2) NOT NULL CHECK (discount_amount >= 0),
  used_at timestamptz DEFAULT now()
);

ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, start_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_coupon_users_coupon_id ON coupon_users(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_users_user_id ON coupon_users(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_products_coupon_id ON coupon_products(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_products_meal_id ON coupon_products(meal_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);

-- RLS Policies for coupons table

CREATE POLICY "Admins can view all coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Customers can view active eligible coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND CURRENT_DATE BETWEEN start_date AND expiry_date
    AND (
      user_eligibility = 'all' 
      OR (user_eligibility = 'specific_users' AND auth.uid() IN (
        SELECT user_id FROM coupon_users WHERE coupon_id = coupons.id
      ))
      OR user_eligibility IN ('new_users', 'existing_users')
    )
  );

CREATE POLICY "Admins can insert coupons"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update coupons"
  ON coupons FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete coupons"
  ON coupons FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for coupon_users table

CREATE POLICY "Admins can view all coupon users"
  ON coupon_users FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view their own coupon eligibility"
  ON coupon_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert coupon users"
  ON coupon_users FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete coupon users"
  ON coupon_users FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for coupon_products table

CREATE POLICY "Admins can view all coupon products"
  ON coupon_products FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Customers can view coupon products"
  ON coupon_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert coupon products"
  ON coupon_products FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete coupon products"
  ON coupon_products FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for coupon_usage table

CREATE POLICY "Admins can view all coupon usage"
  ON coupon_usage FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view their own coupon usage"
  ON coupon_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert coupon usage"
  ON coupon_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());