/*
  # Add Resend Support to Email Settings

  1. Changes
    - Add `email_provider` column to choose between 'smtp' and 'resend'
    - Add `resend_api_key` column for Resend integration
    - Keep existing SMTP fields for backwards compatibility
  
  2. Notes
    - Default provider is 'smtp' for existing configurations
    - Resend is recommended for serverless environments
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_settings' AND column_name = 'email_provider'
  ) THEN
    ALTER TABLE email_settings ADD COLUMN email_provider text DEFAULT 'smtp' CHECK (email_provider IN ('smtp', 'resend'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_settings' AND column_name = 'resend_api_key'
  ) THEN
    ALTER TABLE email_settings ADD COLUMN resend_api_key text;
  END IF;
END $$;