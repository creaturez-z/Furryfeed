/*
  # Add Icon URL to WhatsApp Configuration

  1. Changes
    - Add `icon_url` column to `whatsapp_config` table
    - This allows admins to customize the WhatsApp bubble icon
    - If null, the default WhatsApp icon will be used

  2. Notes
    - The column is nullable to maintain backward compatibility
    - Existing configurations will continue to use the default icon
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_config' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE whatsapp_config ADD COLUMN icon_url text;
  END IF;
END $$;
