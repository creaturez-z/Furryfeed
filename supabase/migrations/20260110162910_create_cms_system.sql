/*
  # Create CMS System

  1. New Tables
    - `brand_settings`
      - `id` (uuid, primary key)
      - `business_name` (text, default 'PetMeals')
      - `logo_url` (text)
      - `favicon_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `menu_items`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, nullable - for sub-menus)
      - `label` (text)
      - `url` (text)
      - `display_order` (integer)
      - `device_visibility` (text: 'desktop' | 'mobile' | 'both')
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `label_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `custom_css`
      - `id` (uuid, primary key)
      - `css_content` (text)
      - `is_enabled` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `cms_pages`
      - `id` (uuid, primary key)
      - `slug` (text, unique)
      - `title` (text)
      - `content` (text)
      - `meta_description` (text)
      - `is_published` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `footer_settings`
      - `id` (uuid, primary key)
      - `content` (text)
      - `custom_css` (text)
      - `custom_js` (text)
      - `is_enabled` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Admins can read/write
    - Authenticated users (customers) can read
    - Public access for reading brand settings, menus, labels, pages, footer
  
  3. Notes
    - Brand settings and footer settings use singleton pattern
    - Menu items support 3-level hierarchy (parent -> sub -> sub-sub)
    - Default data will be inserted for label settings
*/

-- Create brand_settings table
CREATE TABLE IF NOT EXISTS brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text DEFAULT 'PetMeals',
  logo_url text,
  favicon_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  display_order integer DEFAULT 0,
  device_visibility text DEFAULT 'both' CHECK (device_visibility IN ('desktop', 'mobile', 'both')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create label_settings table
CREATE TABLE IF NOT EXISTS label_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create custom_css table
CREATE TABLE IF NOT EXISTS custom_css (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  css_content text DEFAULT '',
  is_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cms_pages table
CREATE TABLE IF NOT EXISTS cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text DEFAULT '',
  meta_description text,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create footer_settings table
CREATE TABLE IF NOT EXISTS footer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text DEFAULT '',
  custom_css text DEFAULT '',
  custom_js text DEFAULT '',
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_css ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;

-- Brand Settings Policies
CREATE POLICY "Public can read brand settings"
  ON brand_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage brand settings"
  ON brand_settings FOR ALL
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

-- Menu Items Policies
CREATE POLICY "Public can read active menu items"
  ON menu_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage menu items"
  ON menu_items FOR ALL
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

-- Label Settings Policies
CREATE POLICY "Public can read label settings"
  ON label_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage label settings"
  ON label_settings FOR ALL
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

-- Custom CSS Policies
CREATE POLICY "Public can read enabled custom css"
  ON custom_css FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Admins can manage custom css"
  ON custom_css FOR ALL
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

-- CMS Pages Policies
CREATE POLICY "Public can read published pages"
  ON cms_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage cms pages"
  ON cms_pages FOR ALL
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

-- Footer Settings Policies
CREATE POLICY "Public can read enabled footer settings"
  ON footer_settings FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Admins can manage footer settings"
  ON footer_settings FOR ALL
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

-- Insert default brand settings
INSERT INTO brand_settings (business_name, logo_url, favicon_url)
SELECT 'PetMeals', '', ''
WHERE NOT EXISTS (SELECT 1 FROM brand_settings);

-- Insert default custom CSS
INSERT INTO custom_css (css_content, is_enabled)
SELECT '/* Custom CSS for PetMeals Website */

/* Example: Customize primary color */
/* .bg-orange-500 { background-color: #your-color !important; } */

/* Example: Customize button styles */
/* button { border-radius: 8px !important; } */

/* Example: Customize meal card hover effect */
/* .meal-card:hover { transform: scale(1.05) !important; } */

/* Example: Customize header */
/* header { background-color: #your-color !important; } */

/* Add your custom styles below */
', false
WHERE NOT EXISTS (SELECT 1 FROM custom_css);

-- Insert default footer settings
INSERT INTO footer_settings (content, custom_css, custom_js, is_enabled)
SELECT '<div class="bg-gray-900 text-white py-12">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <h3 class="text-xl font-bold mb-4">PetMeals</h3>
        <p class="text-gray-400">Nutritious meals for your beloved pets, delivered fresh daily.</p>
      </div>
      <div>
        <h4 class="text-lg font-semibold mb-4">Quick Links</h4>
        <ul class="space-y-2">
          <li><a href="/page/about-us" class="text-gray-400 hover:text-white">About Us</a></li>
          <li><a href="/page/privacy-policy" class="text-gray-400 hover:text-white">Privacy Policy</a></li>
          <li><a href="/page/terms-conditions" class="text-gray-400 hover:text-white">Terms & Conditions</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-lg font-semibold mb-4">Contact</h4>
        <p class="text-gray-400">Email: info@petmeals.com</p>
        <p class="text-gray-400">Phone: +1 234 567 8900</p>
      </div>
    </div>
    <div class="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
      <p>&copy; 2026 PetMeals. All rights reserved.</p>
    </div>
  </div>
</div>', '', '', true
WHERE NOT EXISTS (SELECT 1 FROM footer_settings);

-- Insert default label settings
INSERT INTO label_settings (key, value, description) VALUES
  ('hero_title', 'Premium Pet Meals Delivered Fresh', 'Main hero section title'),
  ('hero_subtitle', 'Nutritious, delicious meals tailored for your pet''s needs', 'Hero section subtitle'),
  ('all_meals_title', 'All Meals', 'Title for all meals section'),
  ('view_details_button', 'View Details', 'Button text for viewing meal details'),
  ('subscribe_button', 'Subscribe Now', 'Button text for subscription'),
  ('add_to_cart_button', 'Add to Cart', 'Button text for add to cart'),
  ('featured_collections_title', 'Featured Collections', 'Title for banner/collections section'),
  ('show_all_meals_button', 'Show All Meals', 'Button text to show all meals')
ON CONFLICT (key) DO NOTHING;

-- Insert default CMS pages
INSERT INTO cms_pages (slug, title, content, meta_description, is_published) VALUES
  ('about-us', 'About Us', '<h1>About PetMeals</h1><p>Welcome to PetMeals, where we provide the finest nutrition for your beloved pets.</p>', 'Learn more about PetMeals', true),
  ('privacy-policy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how we collect and use your information.</p>', 'PetMeals Privacy Policy', true),
  ('terms-conditions', 'Terms & Conditions', '<h1>Terms & Conditions</h1><p>Please read these terms carefully before using our service.</p>', 'PetMeals Terms and Conditions', true),
  ('payment-policy', 'Payment Policy', '<h1>Payment Policy</h1><p>Information about our payment terms and methods.</p>', 'PetMeals Payment Policy', true),
  ('return-refund-policy', 'Return & Refund Policy', '<h1>Return & Refund Policy</h1><p>Details about returns and refunds.</p>', 'PetMeals Return and Refund Policy', true),
  ('shipping-policy', 'Shipping Policy', '<h1>Shipping Policy</h1><p>Information about our shipping and delivery process.</p>', 'PetMeals Shipping Policy', true),
  ('contact-us', 'Contact Us', '<h1>Contact Us</h1><p>Get in touch with us for any queries or support.</p>', 'Contact PetMeals', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert default menu items
INSERT INTO menu_items (label, url, display_order, device_visibility, is_active) VALUES
  ('Home', '/', 0, 'both', true),
  ('About Us', '/page/about-us', 1, 'both', true),
  ('Contact', '/page/contact-us', 2, 'both', true)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(display_order);
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_label_settings_key ON label_settings(key);