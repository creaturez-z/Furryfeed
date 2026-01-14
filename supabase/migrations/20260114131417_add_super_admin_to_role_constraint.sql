/*
  # Add Super Admin to Role Constraint

  ## Summary
  Updates the profiles table role constraint to include 'super_admin' as a valid role type.

  ## Changes
  1. Drop existing role constraint
  2. Add new constraint that includes 'super_admin' role
  
  ## Security
  - Maintains data integrity by validating role values
  - Allows super_admin role to be properly stored in the database
*/

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

-- Add new constraint with super_admin included
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('customer', 'admin', 'super_admin', 'kitchen_staff', 'delivery_person'));
