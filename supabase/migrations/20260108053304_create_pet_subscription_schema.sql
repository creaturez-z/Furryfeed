/*
  # Pet Meal Subscription Platform Schema

  ## Overview
  Complete database schema for a pet meal subscription platform supporting customers, 
  multiple pets per customer, meal subscriptions, kitchen management, and delivery tracking.

  ## Tables Created

  ### 1. profiles
  Extends auth.users with customer profile information
  - id (uuid, references auth.users)
  - name (text)
  - phone (text)
  - alternative_phone (text, optional)
  - alternative_email (text, optional)
  - role (text) - 'customer', 'admin', 'kitchen_staff', or 'delivery_person'
  - created_at, updated_at (timestamptz)

  ### 2. pets
  Pet profiles belonging to customers
  - id (uuid, primary key)
  - customer_id (uuid, references profiles)
  - name (text)
  - breed (text)
  - age (integer, in years)
  - weight (decimal, in grams)
  - medical_condition (text, optional)
  - special_instructions (text, optional)
  - created_at, updated_at (timestamptz)

  ### 3. meals
  Meal catalog with pricing information
  - id (uuid, primary key)
  - name (text)
  - description (text)
  - full_description (text)
  - ingredients (text)
  - nutritional_info (text, optional)
  - image_url (text)
  - base_price_per_10g (decimal) - Base pricing: 10 grams = ₹X
  - is_active (boolean)
  - created_at, updated_at (timestamptz)

  ### 4. kitchens
  Kitchen locations
  - id (uuid, primary key)
  - name (text)
  - address (text)
  - is_active (boolean)
  - created_at, updated_at (timestamptz)

  ### 5. kitchen_staff
  Kitchen staff assigned to kitchens
  - id (uuid, primary key)
  - profile_id (uuid, references profiles)
  - kitchen_id (uuid, references kitchens)
  - created_at (timestamptz)

  ### 6. delivery_persons
  Delivery personnel assigned to kitchens
  - id (uuid, primary key)
  - profile_id (uuid, references profiles)
  - kitchen_id (uuid, references kitchens)
  - is_available (boolean)
  - created_at (timestamptz)

  ### 7. subscriptions
  Customer meal subscriptions
  - id (uuid, primary key)
  - customer_id (uuid, references profiles)
  - pet_id (uuid, references pets)
  - meal_id (uuid, references meals)
  - subscription_type (text) - 'daily', 'weekly', 'monthly', 'custom'
  - quantity (integer)
  - status (text) - 'active', 'paused', 'skipped', 'completed', 'cancelled'
  - calculated_price (decimal) - Based on pet weight
  - start_date (date)
  - end_date (date, optional)
  - created_at, updated_at (timestamptz)

  ### 8. orders
  Individual orders generated from subscriptions
  - id (uuid, primary key)
  - subscription_id (uuid, references subscriptions)
  - customer_id (uuid, references profiles)
  - pet_id (uuid, references pets)
  - meal_id (uuid, references meals)
  - kitchen_id (uuid, references kitchens)
  - delivery_person_id (uuid, references delivery_persons, optional)
  - quantity (integer)
  - subtotal (decimal)
  - delivery_charge (decimal)
  - total_amount (decimal)
  - status (text) - 'pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
  - delivery_address (text)
  - scheduled_date (date)
  - created_at, updated_at (timestamptz)

  ### 9. delivery_confirmations
  Proof of delivery with images
  - id (uuid, primary key)
  - order_id (uuid, references orders)
  - delivery_person_id (uuid, references delivery_persons)
  - image_url (text)
  - delivered_at (timestamptz)
  - created_at (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies for customers to manage their own data
  - Policies for admin to manage everything
  - Policies for kitchen staff to view assigned orders
  - Policies for delivery persons to view and update assigned deliveries
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  alternative_phone text,
  alternative_email text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'kitchen_staff', 'delivery_person')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  breed text NOT NULL,
  age integer NOT NULL,
  weight numeric(10,2) NOT NULL,
  medical_condition text,
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own pets"
  ON pets FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert own pets"
  ON pets FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own pets"
  ON pets FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can delete own pets"
  ON pets FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  full_description text NOT NULL,
  ingredients text NOT NULL,
  nutritional_info text,
  image_url text NOT NULL,
  base_price_per_10g numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active meals"
  ON meals FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Kitchens table
CREATE TABLE IF NOT EXISTS kitchens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kitchens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active kitchens"
  ON kitchens FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Kitchen staff table
CREATE TABLE IF NOT EXISTS kitchen_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kitchen_id uuid NOT NULL REFERENCES kitchens(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, kitchen_id)
);

ALTER TABLE kitchen_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kitchen staff can view own assignment"
  ON kitchen_staff FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Delivery persons table
CREATE TABLE IF NOT EXISTS delivery_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kitchen_id uuid NOT NULL REFERENCES kitchens(id) ON DELETE CASCADE,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE delivery_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery persons can view own assignment"
  ON delivery_persons FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Delivery persons can update availability"
  ON delivery_persons FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  subscription_type text NOT NULL CHECK (subscription_type IN ('daily', 'weekly', 'monthly', 'custom')),
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'skipped', 'completed', 'cancelled')),
  calculated_price numeric(10,2) NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  kitchen_id uuid REFERENCES kitchens(id) ON DELETE SET NULL,
  delivery_person_id uuid REFERENCES delivery_persons(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric(10,2) NOT NULL,
  delivery_charge numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_address text NOT NULL,
  scheduled_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Kitchen staff can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    kitchen_id IN (
      SELECT kitchen_id FROM kitchen_staff WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Kitchen staff can update assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    kitchen_id IN (
      SELECT kitchen_id FROM kitchen_staff WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    kitchen_id IN (
      SELECT kitchen_id FROM kitchen_staff WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Delivery persons can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    delivery_person_id IN (
      SELECT id FROM delivery_persons WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Delivery persons can update assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    delivery_person_id IN (
      SELECT id FROM delivery_persons WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    delivery_person_id IN (
      SELECT id FROM delivery_persons WHERE profile_id = auth.uid()
    )
  );

-- Delivery confirmations table
CREATE TABLE IF NOT EXISTS delivery_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_person_id uuid NOT NULL REFERENCES delivery_persons(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  delivered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE delivery_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view delivery confirmations for own orders"
  ON delivery_confirmations FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "Delivery persons can insert delivery confirmations"
  ON delivery_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (
    delivery_person_id IN (
      SELECT id FROM delivery_persons WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Delivery persons can view own delivery confirmations"
  ON delivery_confirmations FOR SELECT
  TO authenticated
  USING (
    delivery_person_id IN (
      SELECT id FROM delivery_persons WHERE profile_id = auth.uid()
    )
  );
