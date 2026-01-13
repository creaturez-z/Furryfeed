/*
  # Invoice Templates and Label Customization

  ## Overview
  Adds support for multiple invoice templates and customizable invoice labels.

  ## Changes

  1. Updates to invoice_settings
    - `template_type` (text) - 'standard_a4', 'thermal_printer', 'compact_receipt'
    - `invoice_title_label` (text) - Default: 'INVOICE'
    - `subtotal_label` (text) - Default: 'Subtotal'
    - `gst_label` (text) - Default: 'GST'
    - `total_label` (text) - Default: 'Total'
    - `pet_name_label` (text) - Default: 'Pet Name'
    - `start_date_label` (text) - Default: 'Start Date'
    - `end_date_label` (text) - Default: 'End Date'
    - `quantity_label` (text) - Default: 'Quantity'
    - `item_label` (text) - Default: 'Item'
    - `price_label` (text) - Default: 'Price'

  2. Security
    - Existing RLS policies remain unchanged
    - Only admins can update invoice settings
*/

-- Add template type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN template_type text DEFAULT 'standard_a4' CHECK (template_type IN ('standard_a4', 'thermal_printer', 'compact_receipt'));
  END IF;
END $$;

-- Add invoice title label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'invoice_title_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN invoice_title_label text DEFAULT 'INVOICE';
  END IF;
END $$;

-- Add subtotal label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'subtotal_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN subtotal_label text DEFAULT 'Subtotal';
  END IF;
END $$;

-- Add GST label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'gst_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN gst_label text DEFAULT 'GST';
  END IF;
END $$;

-- Add total label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'total_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN total_label text DEFAULT 'Total';
  END IF;
END $$;

-- Add pet name label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'pet_name_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN pet_name_label text DEFAULT 'Pet Name';
  END IF;
END $$;

-- Add start date label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'start_date_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN start_date_label text DEFAULT 'Start Date';
  END IF;
END $$;

-- Add end date label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'end_date_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN end_date_label text DEFAULT 'End Date';
  END IF;
END $$;

-- Add quantity label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'quantity_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN quantity_label text DEFAULT 'Quantity';
  END IF;
END $$;

-- Add item label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'item_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN item_label text DEFAULT 'Item';
  END IF;
END $$;

-- Add price label
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_settings' AND column_name = 'price_label'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN price_label text DEFAULT 'Price';
  END IF;
END $$;