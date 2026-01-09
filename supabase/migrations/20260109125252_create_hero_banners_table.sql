/*
  # Create Hero Banners Table

  1. New Tables
    - `hero_banners`
      - `id` (uuid, primary key)
      - `title` (text) - Banner title for admin reference
      - `type` (text) - Banner type: 'image', 'html', or 'video'
      - `content` (text) - URL for image/video or HTML content
      - `is_active` (boolean) - Whether banner is visible on website
      - `display_order` (integer) - Order in which banners appear
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `hero_banners` table
    - Add policy for public users to view only active banners
    - Add policy for admins to manage all banners

  3. Important Notes
    - Only active banners (`is_active = true`) are shown to public
    - Banners are ordered by `display_order` ascending
    - Multiple active banners create a slider
    - Admin has full control over create, edit, update, delete operations
*/

-- Create hero_banners table
CREATE TABLE IF NOT EXISTS hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('image', 'html', 'video')),
  content text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Policy: Public users can view only active banners
CREATE POLICY "Public can view active banners"
  ON hero_banners
  FOR SELECT
  USING (is_active = true);

-- Policy: Admins can view all banners
CREATE POLICY "Admins can view all banners"
  ON hero_banners
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Policy: Admins can insert banners
CREATE POLICY "Admins can insert banners"
  ON hero_banners
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Policy: Admins can update banners
CREATE POLICY "Admins can update banners"
  ON hero_banners
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Policy: Admins can delete banners
CREATE POLICY "Admins can delete banners"
  ON hero_banners
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_hero_banners_order ON hero_banners(display_order);

-- Create index for active status
CREATE INDEX IF NOT EXISTS idx_hero_banners_active ON hero_banners(is_active);
