/*
  # Add Invoice Access Control to Profiles

  1. Changes
    - Add can_view_invoice boolean column to profiles table
    - Default value is false (admin controlled)
    - Admin can enable/disable invoice access per customer

  2. Purpose
    - Allow admin to control which customers can view invoices
    - Customer invoice access is optional and admin-controlled
    - Enables granular control over invoice visibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'can_view_invoice'
  ) THEN
    ALTER TABLE profiles ADD COLUMN can_view_invoice boolean DEFAULT false;
  END IF;
END $$;