export interface Profile {
  id: string;
  name: string;
  phone: string;
  alternative_phone?: string;
  alternative_email?: string;
  role: 'customer' | 'admin' | 'kitchen_staff' | 'delivery_person';
  created_at: string;
  updated_at: string;
}

export interface Pet {
  id: string;
  customer_id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  medical_condition?: string;
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
  created_at: string;
  updated_at: string;
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
