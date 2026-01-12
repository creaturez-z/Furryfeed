/*
  # Add Company Details to Invoice Settings

  1. Changes
    - Add company_name column to invoice_settings table
    - Add company_address column to invoice_settings table
    - Add company_phone column to invoice_settings table
    - Add company_gst_number column to invoice_settings table
    - Set default values for new columns

  2. Purpose
    - Store company/business information for invoice generation
    - Allow admin to configure company details from Tax tab
    - These details will appear on all generated invoices
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN company_name text DEFAULT 'My Company';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN company_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'company_phone'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN company_phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'company_gst_number'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN company_gst_number text DEFAULT '';
  END IF;
END $$;