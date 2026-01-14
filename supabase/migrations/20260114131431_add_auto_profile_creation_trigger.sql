/*
  # Add Automatic Profile Creation Trigger

  ## Summary
  Creates a trigger to automatically create a profile entry when a new user is created in auth.users.
  This ensures that every authenticated user has a corresponding profile record.

  ## Changes
  1. Create function to handle new user creation
  2. Create trigger to call function on auth.users insert
  
  ## Security
  - Uses SECURITY DEFINER to bypass RLS for profile creation
  - Extracts user metadata to populate profile fields
  - Sets default role to 'customer' if not specified
*/

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
