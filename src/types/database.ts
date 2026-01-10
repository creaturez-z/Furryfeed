export interface Profile {
  id: string;
  name: string;
  phone: string;
  alternative_phone?: string;
  alternative_email?: string;
  role: 'customer' | 'admin' | 'kitchen_staff' | 'delivery_person';
  is_banned?: boolean;
  banned_at?: string;
  ban_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithEmail extends Profile {
  email?: string;
}

export interface ProfileWithWallet extends Profile {
  wallet_balance?: number;
  email?: string;
}

export interface Pet {
  id: string;
  customer_id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  weight_in_kg?: number;
  image_url?: string;
  medical_condition?: string;
  likes?: string;
  dislikes?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  full_description: string;
  ingredients: string;
  nutritional_info?: string;
  image_url: string;
  category_id?: string;
  mrp?: number;
  sale_price?: number;
  base_price_per_10g: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MealIngredient {
  id: string;
  meal_id: string;
  ingredient_name: string;
  quantity: number;
  unit: 'grams' | 'kg' | 'ml' | 'liters' | 'pieces';
  created_at: string;
  updated_at: string;
}

export interface Kitchen {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KitchenStaff {
  id: string;
  profile_id: string;
  kitchen_id: string;
  created_at: string;
}

export interface DeliveryPerson {
  id: string;
  profile_id: string;
  kitchen_id: string;
  is_available: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  pet_id: string;
  meal_id: string;
  subscription_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  quantity: number;
  status: 'active' | 'paused' | 'skipped' | 'completed' | 'cancelled';
  calculated_price: number;
  start_date: string;
  end_date?: string;
  selected_weekdays?: number[];
  subtotal_amount?: number;
  tax_name?: string;
  tax_percentage?: number;
  tax_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPet {
  id: string;
  subscription_id: string;
  pet_id: string;
  created_at: string;
}

export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  subscription_pet_id: string;
  meal_id: string;
  quantity: number;
  price_per_day: number;
  created_at: string;
}

export interface Order {
  id: string;
  subscription_id?: string;
  customer_id: string;
  pet_id: string;
  meal_id: string;
  kitchen_id?: string;
  delivery_person_id?: string;
  quantity: number;
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  delivery_address: string;
  scheduled_date: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryConfirmation {
  id: string;
  order_id: string;
  delivery_person_id: string;
  image_url: string;
  delivered_at: string;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BannerSettings {
  id: string;
  rows_to_display: number;
  banners_per_row: number;
  created_at: string;
  updated_at: string;
}

export interface BannerMeal {
  id: string;
  banner_id: string;
  meal_id: string;
  created_at: string;
}

export interface WeightSlab {
  id: string;
  meal_id: string;
  min_weight: number;
  max_weight: number;
  food_quantity: number;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  customer_id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  reference_type: 'admin_adjustment' | 'subscription_charge' | 'recharge';
  reference_id?: string;
  admin_id?: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  customer_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConfig {
  id: string;
  enabled: boolean;
  phone_number: string;
  display_text: string;
  default_message: string;
  position: 'bottom-right' | 'bottom-left';
  show_on_customer: boolean;
  show_on_kitchen: boolean;
  icon_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MealLayoutConfig {
  id: string;
  desktop_items_per_row: number;
  mobile_items_per_row: number;
  created_at: string;
  updated_at: string;
}

export interface BrandSettings {
  id: string;
  business_name: string;
  logo_url?: string;
  favicon_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  parent_id?: string;
  label: string;
  url: string;
  display_order: number;
  device_visibility: 'desktop' | 'mobile' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LabelSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomCSS {
  id: string;
  css_content: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface FooterSettings {
  id: string;
  content: string;
  custom_css: string;
  custom_js: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}
