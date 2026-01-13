/*
  # Add Delivery Address to Profiles

  1. Changes
    - Add `delivery_address` column to `profiles` table to store customer's default delivery address
    - This address will be used as default when creating subscriptions
    
  2. Notes
    - Field is optional to support existing users
    - New signups will require this field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN delivery_address text;
  END IF;
END $$;