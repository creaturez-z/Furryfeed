/*
  # Add Admin Invoice Delete Policy

  1. Changes
    - Add DELETE policy for invoices table allowing admins to delete invoices
    - Only admins and super_admins can delete invoice records

  2. Security
    - Restricted to authenticated users with admin or super_admin role
    - Uses the user_role helper function for role checking
*/

CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
