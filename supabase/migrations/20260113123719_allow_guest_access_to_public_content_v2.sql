/*
  # Allow Guest Access to Public Content

  1. Changes
    - Update RLS policies to allow unauthenticated (guest) users to view public content
    - Allow anon access to: meals, categories, banners, banner_meals, meal_ingredients, weight_slabs
    - Allow anon access to: brand_settings, menu_items, label_settings, custom_css, cms_pages, footer_settings
    - Allow anon access to: hero_banners, whatsapp_config, section_layout, announcement_bar, featured_banners, banner_settings, meal_layout_config
    
  2. Security
    - Guest users can only VIEW active/published content
    - No write access for guests
    - Authenticated users and admins retain all existing permissions
*/

-- Meals: Allow guests to view active meals
DROP POLICY IF EXISTS "Users can view meals" ON meals;
DROP POLICY IF EXISTS "Anyone can view active meals" ON meals;
CREATE POLICY "Anyone can view active meals"
  ON meals FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Categories: Allow guests to view active categories
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
DROP POLICY IF EXISTS "Public can view active categories" ON categories;
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Banner meals: Allow guests to view banner-meal relationships
DROP POLICY IF EXISTS "Anyone can view banner meals" ON banner_meals;
DROP POLICY IF EXISTS "Public can view banner meals" ON banner_meals;
CREATE POLICY "Public can view banner meals"
  ON banner_meals FOR SELECT
  USING (true);

-- Meal ingredients: Allow guests to view meal ingredients
DROP POLICY IF EXISTS "Anyone can view meal ingredients" ON meal_ingredients;
DROP POLICY IF EXISTS "Public can view meal ingredients" ON meal_ingredients;
CREATE POLICY "Public can view meal ingredients"
  ON meal_ingredients FOR SELECT
  USING (true);

-- Banners: Create policy for guests to view active banners
DROP POLICY IF EXISTS "Public can view active banners" ON banners;
CREATE POLICY "Public can view active banners"
  ON banners FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Weight slabs: Allow guests to view weight slabs
DROP POLICY IF EXISTS "Customers can view weight slabs" ON weight_slabs;
DROP POLICY IF EXISTS "Admins can view all weight slabs" ON weight_slabs;
DROP POLICY IF EXISTS "Public can view weight slabs" ON weight_slabs;
CREATE POLICY "Public can view weight slabs"
  ON weight_slabs FOR SELECT
  USING (true);

-- Brand settings: Allow guests to view brand info
DROP POLICY IF EXISTS "Authenticated users can view brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Admins can view brand settings" ON brand_settings;
DROP POLICY IF EXISTS "Public can view brand settings" ON brand_settings;
CREATE POLICY "Public can view brand settings"
  ON brand_settings FOR SELECT
  USING (true);

-- Menu items: Allow guests to view active menu items
DROP POLICY IF EXISTS "Authenticated users can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins can view all menu items" ON menu_items;
DROP POLICY IF EXISTS "Public can view active menu items" ON menu_items;
CREATE POLICY "Public can view active menu items"
  ON menu_items FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Label settings: Allow guests to view labels
DROP POLICY IF EXISTS "Authenticated users can view label settings" ON label_settings;
DROP POLICY IF EXISTS "Admins can view label settings" ON label_settings;
DROP POLICY IF EXISTS "Public can view label settings" ON label_settings;
CREATE POLICY "Public can view label settings"
  ON label_settings FOR SELECT
  USING (true);

-- Custom CSS: Allow guests to view enabled custom CSS
DROP POLICY IF EXISTS "Authenticated users can view custom CSS" ON custom_css;
DROP POLICY IF EXISTS "Admins can view custom CSS" ON custom_css;
DROP POLICY IF EXISTS "Public users can view enabled custom CSS" ON custom_css;
DROP POLICY IF EXISTS "Public can view enabled custom CSS" ON custom_css;
CREATE POLICY "Public can view enabled custom CSS"
  ON custom_css FOR SELECT
  USING (is_enabled = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- CMS pages: Allow guests to view published pages
DROP POLICY IF EXISTS "Authenticated users can view CMS pages" ON cms_pages;
DROP POLICY IF EXISTS "Admins can view all CMS pages" ON cms_pages;
DROP POLICY IF EXISTS "Public can view published pages" ON cms_pages;
CREATE POLICY "Public can view published pages"
  ON cms_pages FOR SELECT
  USING (is_published = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Footer settings: Allow guests to view enabled footer
DROP POLICY IF EXISTS "Authenticated users can view footer settings" ON footer_settings;
DROP POLICY IF EXISTS "Admins can view footer settings" ON footer_settings;
DROP POLICY IF EXISTS "Public can view enabled footer" ON footer_settings;
CREATE POLICY "Public can view enabled footer"
  ON footer_settings FOR SELECT
  USING (is_enabled = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Hero banners: Allow guests to view active hero banners
DROP POLICY IF EXISTS "Public can view active banners" ON hero_banners;
DROP POLICY IF EXISTS "Public can view active hero banners" ON hero_banners;
CREATE POLICY "Public can view active hero banners"
  ON hero_banners FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND get_user_role(auth.uid()) = 'admin'));

-- WhatsApp config: Allow guests to view enabled config
DROP POLICY IF EXISTS "Public can view enabled whatsapp config" ON whatsapp_config;
CREATE POLICY "Public can view enabled whatsapp config"
  ON whatsapp_config FOR SELECT
  USING (enabled = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Section layout: Allow guests to view visible sections (already exists, skip)

-- Announcement bar: Allow guests to view enabled announcement
DROP POLICY IF EXISTS "Public can view enabled announcement" ON announcement_bar;
CREATE POLICY "Public can view enabled announcement"
  ON announcement_bar FOR SELECT
  USING (is_enabled = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Featured banners: Allow guests to view enabled featured banners
DROP POLICY IF EXISTS "Public can view enabled featured banners" ON featured_banners;
CREATE POLICY "Public can view enabled featured banners"
  ON featured_banners FOR SELECT
  USING (is_enabled = true OR (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'admin'));

-- Banner settings: Allow guests to view banner settings
DROP POLICY IF EXISTS "Public can view banner settings" ON banner_settings;
CREATE POLICY "Public can view banner settings"
  ON banner_settings FOR SELECT
  USING (true);

-- Meal layout config: Allow guests to view layout configuration
DROP POLICY IF EXISTS "Authenticated users can view meal layout config" ON meal_layout_config;
DROP POLICY IF EXISTS "Admins can view meal layout config" ON meal_layout_config;
DROP POLICY IF EXISTS "Public can view meal layout config" ON meal_layout_config;
CREATE POLICY "Public can view meal layout config"
  ON meal_layout_config FOR SELECT
  USING (true);