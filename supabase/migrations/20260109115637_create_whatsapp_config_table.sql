/*
  # Create WhatsApp Configuration Table

  1. New Tables
    - `whatsapp_config`
      - `id` (uuid, primary key)
      - `enabled` (boolean) - Whether WhatsApp chat is enabled
      - `phone_number` (text) - WhatsApp phone number with country code
      - `display_text` (text) - Text shown on hover/near button
      - `default_message` (text) - Pre-filled message when chat opens
      - `position` (text) - Position of bubble (bottom-right or bottom-left)
      - `show_on_customer` (boolean) - Show on customer pages
      - `show_on_kitchen` (boolean) - Show on kitchen/delivery pages
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `whatsapp_config` table
    - Add policy for all users to read configuration (public read)
    - Add policy for admins to insert/update/delete configuration
*/

-- Create the whatsapp_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT false,
  phone_number text NOT NULL,
  display_text text DEFAULT 'Chat with us',
  default_message text,
  position text DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  show_on_customer boolean DEFAULT true,
  show_on_kitchen boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view WhatsApp config" ON whatsapp_config;
DROP POLICY IF EXISTS "Admins can insert WhatsApp config" ON whatsapp_config;
DROP POLICY IF EXISTS "Admins can update WhatsApp config" ON whatsapp_config;
DROP POLICY IF EXISTS "Admins can delete WhatsApp config" ON whatsapp_config;

-- Policy: Anyone can read the configuration (needed for displaying the bubble)
CREATE POLICY "Anyone can view WhatsApp config"
  ON whatsapp_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert configuration
CREATE POLICY "Admins can insert WhatsApp config"
  ON whatsapp_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update configuration
CREATE POLICY "Admins can update WhatsApp config"
  ON whatsapp_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete configuration
CREATE POLICY "Admins can delete WhatsApp config"
  ON whatsapp_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
