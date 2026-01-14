/*
  # Email System with Zoho SMTP Integration

  1. New Tables
    - `email_settings`
      - `id` (uuid, primary key)
      - `smtp_host` (text) - Zoho SMTP host
      - `smtp_port` (integer) - SMTP port
      - `smtp_username` (text) - Zoho email username
      - `smtp_password` (text) - Encrypted password
      - `sender_email` (text) - From email address
      - `sender_name` (text) - From name
      - `is_enabled` (boolean) - Master email switch
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `email_recipients`
      - `id` (uuid, primary key)
      - `email` (text) - Recipient email
      - `name` (text) - Recipient name
      - `is_active` (boolean) - Enable/disable recipient
      - `created_at` (timestamptz)

    - `email_templates`
      - `id` (uuid, primary key)
      - `event_type` (text) - Event identifier
      - `subject` (text) - Email subject template
      - `body` (text) - Email body template with variables
      - `is_enabled` (boolean) - Enable/disable per event
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `email_logs`
      - `id` (uuid, primary key)
      - `event_type` (text) - Event type
      - `recipient_email` (text) - Who received the email
      - `subject` (text) - Email subject
      - `status` (text) - success/failed
      - `error_message` (text) - Error details if failed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Only admins can manage email settings
    - Email logs readable by admins

  3. Initial Data
    - Create default email templates for all events
    - Set up default SMTP configuration (to be updated by admin)
*/

-- Email Settings Table
CREATE TABLE IF NOT EXISTS email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text NOT NULL DEFAULT 'smtp.zoho.com',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text NOT NULL DEFAULT '',
  smtp_password text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT 'Pet Subscription Service',
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email Recipients Table
CREATE TABLE IF NOT EXISTS email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_settings (Admin only)
CREATE POLICY "Admins can view email settings"
  ON email_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert email settings"
  ON email_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update email settings"
  ON email_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for email_recipients (Admin only)
CREATE POLICY "Admins can view email recipients"
  ON email_recipients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert email recipients"
  ON email_recipients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update email recipients"
  ON email_recipients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete email recipients"
  ON email_recipients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for email_templates (Admin only)
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for email_logs (Admin read-only)
CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default email settings (will need to be configured by admin)
INSERT INTO email_settings (smtp_host, smtp_port, smtp_username, smtp_password, sender_email, sender_name, is_enabled)
VALUES ('smtp.zoho.com', 587, '', '', '', 'Pet Subscription Service', false)
ON CONFLICT DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (event_type, subject, body, is_enabled) VALUES
('customer_signup', 'New Customer Signup - {{customer_name}}', 
'A new customer has signed up!

Customer Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}
Signup Date: {{signup_date}}

Please review and welcome the new customer.', true),

('wallet_recharge', 'Wallet Recharge - {{customer_name}}',
'Customer wallet has been recharged.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Recharge Amount: ₹{{amount}}
New Balance: ₹{{new_balance}}
Reason: {{reason}}
Date: {{transaction_date}}', true),

('manual_payment_submitted', 'Manual Payment Submitted - {{customer_name}}',
'A new manual payment has been submitted and is pending approval.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}
Amount: ₹{{amount}}
Payment Method: {{payment_method}}
Transaction ID: {{transaction_id}}
Notes: {{notes}}
Submitted Date: {{submitted_date}}

Please review and approve/reject this payment.', true),

('manual_payment_approved', 'Manual Payment Approved - {{customer_name}}',
'A manual payment has been approved.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Amount: ₹{{amount}}
Payment Method: {{payment_method}}
Transaction ID: {{transaction_id}}
Approved By: {{approved_by}}
Approved Date: {{approved_date}}', true),

('manual_payment_rejected', 'Manual Payment Rejected - {{customer_name}}',
'A manual payment has been rejected.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Amount: ₹{{amount}}
Payment Method: {{payment_method}}
Transaction ID: {{transaction_id}}
Rejection Reason: {{rejection_reason}}
Rejected By: {{rejected_by}}
Rejected Date: {{rejected_date}}', true),

('profile_updated', 'Customer Profile Updated - {{customer_name}}',
'A customer has updated their profile.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}
Updated Fields: {{updated_fields}}
Update Date: {{update_date}}', true),

('pet_added', 'New Pet Added - {{pet_name}}',
'A customer has added a new pet.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Pet Name: {{pet_name}}
Pet Type: {{pet_type}}
Breed: {{breed}}
Weight: {{weight}} kg
Age: {{age}}
Added Date: {{added_date}}', true),

('pet_updated', 'Pet Profile Updated - {{pet_name}}',
'A customer has updated their pet profile.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Pet Name: {{pet_name}}
Pet Type: {{pet_type}}
Updated Fields: {{updated_fields}}
Update Date: {{update_date}}', true),

('subscription_created', 'New Subscription Created - {{customer_name}}',
'A new subscription has been created.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}
Pet Name: {{pet_name}}
Meal Plan: {{meal_plan}}
Frequency: {{frequency}}
Start Date: {{start_date}}
Total Amount: ₹{{amount}}
Status: {{status}}', true),

('subscription_cancelled', 'Subscription Cancelled - {{customer_name}}',
'A subscription has been cancelled.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Pet Name: {{pet_name}}
Meal Plan: {{meal_plan}}
Cancellation Date: {{cancellation_date}}
Reason: {{cancellation_reason}}', true),

('invoice_generated', 'New Invoice Generated - {{invoice_number}}',
'A new invoice has been generated.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Invoice Number: {{invoice_number}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Total Amount: ₹{{total_amount}}
Status: {{invoice_status}}

Items:
{{invoice_items}}', true),

('manual_payment_pending', 'Manual Payment Pending Approval - {{customer_name}}',
'A manual payment is waiting for your approval.

Customer Name: {{customer_name}}
Email: {{customer_email}}
Phone: {{customer_phone}}
Amount: ₹{{amount}}
Payment Method: {{payment_method}}
Transaction ID: {{transaction_id}}
Submitted Date: {{submitted_date}}

Action Required: Please review and approve/reject this payment in the admin panel.', true)
ON CONFLICT (event_type) DO NOTHING;