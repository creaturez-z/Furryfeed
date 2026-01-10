/*
  # Section Positioning System

  ## Overview
  Comprehensive system for controlling the position and order of all landing page sections.

  ## Changes

  ### 1. Featured Banners Position Updates
  Update the `featured_banners` table to support 4 new position options:
  - `above_hero` - Above the hero banner section
  - `below_hero` - Below the hero banner section
  - `above_featured_collections` - Above the featured collections section
  - `below_featured_collections` - Below the featured collections section
  - Keep existing: `below_header`, `middle`, `above_footer`

  ### 2. New Table: section_layout
  Controls the order of major landing page sections:
  - `id` (uuid, primary key)
  - `section_name` (text) - Name of the section: 'all_meals', 'featured_collections'
  - `display_order` (integer) - Order in which sections appear (lower = first)
  - `is_visible` (boolean) - Whether section is shown on landing page
  - `created_at`, `updated_at` (timestamptz)

  ## Security
  - RLS enabled on section_layout table
  - Admins can manage all settings
  - Public users can view active configurations

  ## Important Notes
  - Featured banners can now be positioned at 7 different locations on the page
  - Section layout controls the relative order of All Meals and Featured Collections
  - All changes are immediately reflected on the customer-facing website
*/

-- Update featured_banners position constraint to include new positions
ALTER TABLE featured_banners DROP CONSTRAINT IF EXISTS featured_banners_position_check;

ALTER TABLE featured_banners ADD CONSTRAINT featured_banners_position_check 
  CHECK (position IN (
    'above_hero',
    'below_hero',
    'above_featured_collections',
    'below_featured_collections',
    'below_header',
    'middle',
    'above_footer'
  ));

-- Create section_layout table
CREATE TABLE IF NOT EXISTS section_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name text NOT NULL UNIQUE CHECK (section_name IN ('all_meals', 'featured_collections')),
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE section_layout ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view visible sections
CREATE POLICY "Public can view visible sections"
  ON section_layout FOR SELECT
  USING (is_visible = true);

-- Policy: Admins can view all sections
CREATE POLICY "Admins can view all sections"
  ON section_layout FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Policy: Admins can insert sections
CREATE POLICY "Admins can insert sections"
  ON section_layout FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Policy: Admins can update sections
CREATE POLICY "Admins can update sections"
  ON section_layout FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Policy: Admins can delete sections
CREATE POLICY "Admins can delete sections"
  ON section_layout FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Insert default section layout (Featured Collections first, then All Meals)
INSERT INTO section_layout (section_name, display_order, is_visible)
VALUES 
  ('featured_collections', 1, true),
  ('all_meals', 2, true)
ON CONFLICT (section_name) DO NOTHING;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_section_layout_order ON section_layout(display_order);
