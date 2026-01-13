/*
  # Add Customer Invoice Insert Policy

  1. Changes
    - Add RLS policy to allow customers to insert their own invoices
    - This enables automatic invoice generation when customers create subscriptions

  2. Security
    - Customers can only insert invoices for themselves (customer_id must match auth.uid())
    - Maintains data integrity by restricting to authenticated users only
*/

CREATE POLICY "Customers can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
  );
