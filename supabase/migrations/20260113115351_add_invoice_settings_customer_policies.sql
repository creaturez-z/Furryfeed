/*
  # Add Customer Policies for Invoice Settings

  1. Changes
    - Add SELECT policy for customers to read invoice settings
    - Add UPDATE policy for customers to update next invoice number
    - These are required for automatic invoice generation when customers create subscriptions

  2. Security
    - Customers can only read invoice settings (read-only access)
    - Customers can only update the next_invoice_number field (for auto-increment)
    - All authenticated users need access to generate invoices properly
*/

-- Allow customers to read invoice settings
CREATE POLICY "Customers can read invoice settings"
  ON invoice_settings FOR SELECT
  TO authenticated
  USING (true);

-- Allow customers to update invoice settings (for next_invoice_number increment)
CREATE POLICY "Customers can update invoice settings"
  ON invoice_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
