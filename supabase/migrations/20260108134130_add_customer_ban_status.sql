/*
  # Add Customer Ban Status

  ## Changes
  - Add is_banned field to profiles table
  - Add banned_at timestamp field
  - Add ban_reason text field

  ## Security
  - Only admins can ban/unban customers
  - Customers can view their own ban status
*/

-- Add ban fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ban_reason text;
  END IF;
END $$;
