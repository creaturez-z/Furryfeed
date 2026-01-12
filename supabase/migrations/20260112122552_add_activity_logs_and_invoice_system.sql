/*
  # Activity Logs and Invoice System

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `admin_id` (uuid, references profiles)
      - `admin_name` (text)
      - `action` (text) - description of action performed
      - `action_type` (text) - category: subscription, order, user, invoice, etc.
      - `entity_id` (uuid) - ID of affected entity
      - `entity_type` (text) - type of entity (subscription, order, etc.)
      - `details` (jsonb) - additional details about the action
      - `created_at` (timestamptz)

    - `invoice_settings`
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `company_address` (text)
      - `phone` (text)
      - `gst_number` (text)
      - `invoice_prefix` (text) - e.g., 'INV'
      - `next_invoice_number` (integer)
      - `customer_can_access` (boolean) - whether customers can view invoices
      - `terms_and_conditions` (text)
      - `updated_at` (timestamptz)

    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique)
      - `subscription_id` (uuid, references subscriptions)
      - `customer_id` (uuid, references profiles)
      - `order_date` (date)
      - `subtotal` (decimal)
      - `tax_amount` (decimal)
      - `total_amount` (decimal)
      - `items` (jsonb) - array of invoice items
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Activity logs: only admins can read
    - Invoice settings: only admins can read/write
    - Invoices: admins can read all, customers can read their own if enabled
*/

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_name text NOT NULL,
  action text NOT NULL,
  action_type text NOT NULL,
  entity_id uuid,
  entity_type text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Invoice Settings Table
CREATE TABLE IF NOT EXISTS invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'Pet Food Company',
  company_address text DEFAULT '',
  phone text DEFAULT '',
  gst_number text DEFAULT '',
  invoice_prefix text DEFAULT 'INV',
  next_invoice_number integer DEFAULT 1001,
  customer_can_access boolean DEFAULT false,
  terms_and_conditions text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read invoice settings"
  ON invoice_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update invoice settings"
  ON invoice_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert invoice settings"
  ON invoice_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Insert default invoice settings
INSERT INTO invoice_settings (id, company_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Pet Food Company')
ON CONFLICT (id) DO NOTHING;

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES profiles(id) NOT NULL,
  order_date date NOT NULL,
  subtotal decimal(10, 2) NOT NULL,
  tax_amount decimal(10, 2) DEFAULT 0,
  total_amount decimal(10, 2) NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Customers can read own invoices if enabled"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM invoice_settings
      WHERE customer_can_access = true
      LIMIT 1
    )
  );

CREATE POLICY "Admins can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_date ON invoices(order_date);
