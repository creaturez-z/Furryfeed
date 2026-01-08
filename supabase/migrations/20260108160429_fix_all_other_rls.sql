/*
  # Fix All Other RLS Policies

  ## Summary
  Fixes all remaining RLS policies to use helper function.

  ## Changes
  Updates policies for:
  - meals, subscriptions, wallets, wallet_transactions
  - kitchens, kitchen_staff, delivery_persons
  - orders, banners, categories, weight_slabs, meal_ingredients
*/

-- Meals
DROP POLICY IF EXISTS "Admins can insert meals" ON meals;
DROP POLICY IF EXISTS "Admins can update all meals" ON meals;
DROP POLICY IF EXISTS "Admins can delete meals" ON meals;

CREATE POLICY "Admins can insert meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete meals"
  ON meals FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON subscriptions;

CREATE POLICY "All can view subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "All can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- Wallets
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can insert wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can update all wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can delete wallets" ON wallets;

CREATE POLICY "All can view wallets"
  ON wallets FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "All can insert wallets"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "All can update wallets"
  ON wallets FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete wallets"
  ON wallets FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Wallet Transactions
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins can insert wallet transactions" ON wallet_transactions;

CREATE POLICY "All can view wallet transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "All can insert wallet transactions"
  ON wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- Kitchens
DROP POLICY IF EXISTS "Admins can view all kitchens" ON kitchens;
DROP POLICY IF EXISTS "Admins can insert kitchens" ON kitchens;
DROP POLICY IF EXISTS "Admins can update all kitchens" ON kitchens;
DROP POLICY IF EXISTS "Admins can delete kitchens" ON kitchens;

CREATE POLICY "All can view kitchens"
  ON kitchens FOR SELECT
  TO authenticated
  USING (is_active = true OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert kitchens"
  ON kitchens FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update kitchens"
  ON kitchens FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete kitchens"
  ON kitchens FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Kitchen Staff
DROP POLICY IF EXISTS "Admins can view all kitchen staff" ON kitchen_staff;
DROP POLICY IF EXISTS "Admins can insert kitchen staff" ON kitchen_staff;
DROP POLICY IF EXISTS "Admins can update kitchen staff" ON kitchen_staff;
DROP POLICY IF EXISTS "Admins can delete kitchen staff" ON kitchen_staff;

CREATE POLICY "All can view kitchen staff"
  ON kitchen_staff FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert kitchen staff"
  ON kitchen_staff FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update kitchen staff"
  ON kitchen_staff FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete kitchen staff"
  ON kitchen_staff FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Delivery Persons
DROP POLICY IF EXISTS "Admins can view all delivery persons" ON delivery_persons;
DROP POLICY IF EXISTS "Admins can insert delivery persons" ON delivery_persons;
DROP POLICY IF EXISTS "Admins can update all delivery persons" ON delivery_persons;
DROP POLICY IF EXISTS "Admins can delete delivery persons" ON delivery_persons;

CREATE POLICY "All can view delivery persons"
  ON delivery_persons FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert delivery persons"
  ON delivery_persons FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "All can update delivery persons"
  ON delivery_persons FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (profile_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete delivery persons"
  ON delivery_persons FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Orders
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

CREATE POLICY "All can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR 
    public.get_user_role(auth.uid()) IN ('admin', 'kitchen_staff', 'delivery_person')
  );

CREATE POLICY "All can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('admin', 'kitchen_staff', 'delivery_person'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'kitchen_staff', 'delivery_person'));

CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Banners
DROP POLICY IF EXISTS "Admins can insert banners" ON banners;
DROP POLICY IF EXISTS "Admins can update all banners" ON banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON banners;

CREATE POLICY "Admins can insert banners"
  ON banners FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update banners"
  ON banners FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete banners"
  ON banners FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Banner Meals
DROP POLICY IF EXISTS "Admins can insert banner meals" ON banner_meals;
DROP POLICY IF EXISTS "Admins can delete banner meals" ON banner_meals;

CREATE POLICY "Admins can insert banner meals"
  ON banner_meals FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete banner meals"
  ON banner_meals FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Categories
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins can update all categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Weight Slabs
DROP POLICY IF EXISTS "Admins can view all weight slabs" ON weight_slabs;
DROP POLICY IF EXISTS "Admins can insert weight slabs" ON weight_slabs;
DROP POLICY IF EXISTS "Admins can update weight slabs" ON weight_slabs;
DROP POLICY IF EXISTS "Admins can delete weight slabs" ON weight_slabs;

CREATE POLICY "All can view weight slabs"
  ON weight_slabs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert weight slabs"
  ON weight_slabs FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update weight slabs"
  ON weight_slabs FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete weight slabs"
  ON weight_slabs FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Meal Ingredients
DROP POLICY IF EXISTS "Admins can insert meal ingredients" ON meal_ingredients;
DROP POLICY IF EXISTS "Admins can update meal ingredients" ON meal_ingredients;
DROP POLICY IF EXISTS "Admins can delete meal ingredients" ON meal_ingredients;

CREATE POLICY "Admins can insert meal ingredients"
  ON meal_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update meal ingredients"
  ON meal_ingredients FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete meal ingredients"
  ON meal_ingredients FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');
