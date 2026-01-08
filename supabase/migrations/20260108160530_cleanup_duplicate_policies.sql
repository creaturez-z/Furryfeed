/*
  # Cleanup Duplicate Policies

  ## Summary
  Removes old duplicate policies that may conflict with the new helper function policies.

  ## Changes
  Drops old customer-specific policies that have been replaced by unified policies.
*/

-- Drop old customer-specific policies
DROP POLICY IF EXISTS "Customers can view own pets" ON pets;
DROP POLICY IF EXISTS "Customers can insert own pets" ON pets;
DROP POLICY IF EXISTS "Customers can update own pets" ON pets;
DROP POLICY IF EXISTS "Customers can delete own pets" ON pets;

DROP POLICY IF EXISTS "Customers can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Customers can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Customers can update own subscriptions" ON subscriptions;

DROP POLICY IF EXISTS "Customers can view own wallet" ON wallets;
DROP POLICY IF EXISTS "Customers can insert own wallet" ON wallets;
DROP POLICY IF EXISTS "Customers can update own wallet" ON wallets;

DROP POLICY IF EXISTS "Customers can view own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Customers can insert own transactions" ON wallet_transactions;

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Customers can view own orders" ON orders;

DROP POLICY IF EXISTS "Kitchen staff can view own assignment" ON kitchen_staff;
DROP POLICY IF EXISTS "Kitchen staff can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Kitchen staff can update assigned orders" ON orders;

DROP POLICY IF EXISTS "Delivery persons can view own assignment" ON delivery_persons;
DROP POLICY IF EXISTS "Delivery persons can update availability" ON delivery_persons;
DROP POLICY IF EXISTS "Delivery persons can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Delivery persons can update assigned orders" ON orders;

DROP POLICY IF EXISTS "Authenticated users can view active kitchens" ON kitchens;
DROP POLICY IF EXISTS "Anyone can view active meals" ON meals;
