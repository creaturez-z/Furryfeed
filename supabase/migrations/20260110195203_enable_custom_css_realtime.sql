/*
  # Enable Real-time for Custom CSS

  ## Overview
  Ensures custom CSS changes are immediately broadcast to all connected clients.

  ## Changes
  1. Ensure custom_css table is in the realtime publication
  2. Grant proper permissions for real-time subscriptions
  
  ## Important Notes
  - Changes to custom CSS will now appear instantly without page refresh
  - All authenticated users will receive updates in real-time
*/

-- Ensure the custom_css table is part of the realtime publication
-- This allows Supabase to broadcast changes to connected clients
DO $$
BEGIN
  -- Add table to publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'custom_css'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE custom_css;
  END IF;
END $$;

-- Add policy for authenticated users to read all CSS (including disabled)
-- This allows admins to preview their changes immediately
CREATE POLICY "Authenticated can read all custom css"
  ON custom_css FOR SELECT
  TO authenticated
  USING (true);
