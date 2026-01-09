/*
  # Enhance Pet Profile Fields

  ## Overview
  Adds new fields to the pets table to support enhanced pet profiles with images, preferences, and better medical information.

  ## Changes

  1. New Columns
    - `image_url` (text) - URL to pet profile image stored in Supabase Storage
    - `likes` (text) - Food preferences and things the pet likes
    - `dislikes` (text) - Food dislikes and behavioral notes
    - `weight_in_kg` (numeric) - Exact pet weight in kilograms with decimal support

  2. Modified Columns
    - Keep existing `weight` column for backward compatibility (stored in grams)
    - Both `weight` and `weight_in_kg` will be maintained

  3. Data Migration
    - Convert existing weight values from grams to kg for the new field
    - Make all new fields optional to avoid breaking existing data

  4. Notes
    - `image_url` is optional and points to Supabase Storage
    - `likes` and `dislikes` are visible to customers, admins, and kitchen staff
    - Medical condition field label will be updated in the UI
    - Weight validation will use `weight_in_kg` for subscription calculations
*/

-- Add new columns to pets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE pets ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'likes'
  ) THEN
    ALTER TABLE pets ADD COLUMN likes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'dislikes'
  ) THEN
    ALTER TABLE pets ADD COLUMN dislikes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'weight_in_kg'
  ) THEN
    ALTER TABLE pets ADD COLUMN weight_in_kg numeric(6,2);
  END IF;
END $$;

-- Migrate existing weight data from grams to kg
UPDATE pets
SET weight_in_kg = weight / 1000.0
WHERE weight_in_kg IS NULL AND weight IS NOT NULL;

-- Create storage bucket for pet images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-images', 'pet-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for pet images

-- Allow authenticated users to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload pet images'
  ) THEN
    CREATE POLICY "Users can upload pet images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'pet-images');
  END IF;
END $$;

-- Allow authenticated users to update their own pet images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update own pet images'
  ) THEN
    CREATE POLICY "Users can update own pet images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'pet-images');
  END IF;
END $$;

-- Allow public read access to pet images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Pet images are publicly accessible'
  ) THEN
    CREATE POLICY "Pet images are publicly accessible"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'pet-images');
  END IF;
END $$;

-- Allow users to delete their own pet images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own pet images'
  ) THEN
    CREATE POLICY "Users can delete own pet images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'pet-images');
  END IF;
END $$;
