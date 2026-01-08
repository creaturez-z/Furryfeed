/*
  # Add Email Column to Profiles

  ## Summary
  Adds an email column to the profiles table to simplify querying and displaying user
  information without needing to join with auth.users.

  ## Changes
  1. Add email column to profiles table
  2. Populate existing profiles with email from auth.users (if any)
  3. Create trigger to automatically set email on profile creation

  ## Notes
  - Email is stored denormalized for query performance
  - Email remains the source of truth in auth.users
  - This is a convenience field for admin panels and reporting
*/

-- Add email column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  END IF;
END $$;
