import { supabase } from '../lib/supabase';

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  start_date: string;
  expiry_date: string;
  total_usage_limit: number | null;
  per_user_usage_limit: number | null;
  user_eligibility: 'all' | 'new_users' | 'existing_users' | 'specific_users';
  product_applicability: 'all' | 'specific_products';
  minimum_order_value: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CouponValidationResult = {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discountAmount?: number;
};

export async function validateCoupon(
  couponCode: string,
  userId: string,
  totalAmount: number,
  mealIds: string[] = []
): Promise<CouponValidationResult> {
  try {
    const upperCode = couponCode.trim().toUpperCase();

    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', upperCode)
      .maybeSingle();

    if (couponError) {
      return { valid: false, error: 'Failed to validate coupon' };
    }

    if (!coupon) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    if (!coupon.is_active) {
      return { valid: false, error: 'This coupon is no longer active' };
    }

    const today = new Date().toISOString().split('T')[0];
    if (today < coupon.start_date) {
      return { valid: false, error: 'This coupon is not yet valid' };
    }

    if (today > coupon.expiry_date) {
      return { valid: false, error: 'This coupon has expired' };
    }

    if (coupon.total_usage_limit !== null) {
      const { count: totalUsage } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id);

      if (totalUsage !== null && totalUsage >= coupon.total_usage_limit) {
        return { valid: false, error: 'This coupon has reached its usage limit' };
      }
    }

    if (coupon.per_user_usage_limit !== null) {
      const { count: userUsage } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId);

      if (userUsage !== null && userUsage >= coupon.per_user_usage_limit) {
        return { valid: false, error: 'You have already used this coupon the maximum number of times' };
      }
    }

    if (coupon.user_eligibility === 'specific_users') {
      const { data: eligibleUser } = await supabase
        .from('coupon_users')
        .select('*')
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!eligibleUser) {
        return { valid: false, error: 'You are not eligible for this coupon' };
      }
    } else if (coupon.user_eligibility === 'new_users') {
      const { count: subscriptionCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', userId);

      if (subscriptionCount !== null && subscriptionCount > 0) {
        return { valid: false, error: 'This coupon is only for new users' };
      }
    } else if (coupon.user_eligibility === 'existing_users') {
      const { count: subscriptionCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', userId);

      if (subscriptionCount === null || subscriptionCount === 0) {
        return { valid: false, error: 'This coupon is only for existing customers' };
      }
    }

    if (coupon.product_applicability === 'specific_products' && mealIds.length > 0) {
      const { data: applicableProducts } = await supabase
        .from('coupon_products')
        .select('meal_id')
        .eq('coupon_id', coupon.id)
        .in('meal_id', mealIds);

      if (!applicableProducts || applicableProducts.length === 0) {
        return { valid: false, error: 'This coupon does not apply to the selected products' };
      }
    }

    if (coupon.minimum_order_value !== null && totalAmount < coupon.minimum_order_value) {
      const shortfall = coupon.minimum_order_value - totalAmount;
      return {
        valid: false,
        error: `Minimum order value of ₹${coupon.minimum_order_value.toFixed(2)} required. Add ₹${shortfall.toFixed(2)} more to use this coupon.`
      };
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'flat') {
      discountAmount = Math.min(coupon.discount_value, totalAmount);
    } else {
      discountAmount = (totalAmount * coupon.discount_value) / 100;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      valid: true,
      coupon,
      discountAmount,
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { valid: false, error: 'Failed to validate coupon' };
  }
}

export async function recordCouponUsage(
  couponId: string,
  userId: string,
  subscriptionId: string | null,
  discountAmount: number
): Promise<boolean> {
  try {
    const { error } = await supabase.from('coupon_usage').insert({
      coupon_id: couponId,
      user_id: userId,
      subscription_id: subscriptionId,
      discount_amount: discountAmount,
    });

    if (error) {
      console.error('Error recording coupon usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    return false;
  }
}

export async function getEligibleCoupons(userId: string, mealIds: string[] = [], currentOrderValue: number = 10000): Promise<Coupon[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('expiry_date', today)
      .order('created_at', { ascending: false });

    if (error || !coupons) {
      return [];
    }

    const eligibleCoupons: Coupon[] = [];

    for (const coupon of coupons) {
      const validation = await validateCoupon(coupon.code, userId, currentOrderValue, mealIds);
      if (validation.valid) {
        eligibleCoupons.push(coupon);
      }
    }

    return eligibleCoupons;
  } catch (error) {
    console.error('Error fetching eligible coupons:', error);
    return [];
  }
}

export async function getCouponsNearEligibility(
  userId: string,
  currentOrderValue: number,
  mealIds: string[] = []
): Promise<Array<Coupon & { amountNeeded: number }>> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('expiry_date', today)
      .not('minimum_order_value', 'is', null)
      .gt('minimum_order_value', currentOrderValue)
      .order('minimum_order_value', { ascending: true });

    if (error || !coupons) {
      return [];
    }

    const nearEligibilityCoupons: Array<Coupon & { amountNeeded: number }> = [];

    for (const coupon of coupons) {
      const amountNeeded = (coupon.minimum_order_value || 0) - currentOrderValue;

      if (amountNeeded > 0 && amountNeeded <= 500) {
        const baseValidation = await validateCoupon(
          coupon.code,
          userId,
          coupon.minimum_order_value || 0,
          mealIds
        );

        if (baseValidation.valid || baseValidation.error?.includes('Minimum order value')) {
          nearEligibilityCoupons.push({
            ...coupon,
            amountNeeded,
          });
        }
      }
    }

    return nearEligibilityCoupons.slice(0, 3);
  } catch (error) {
    console.error('Error fetching coupons near eligibility:', error);
    return [];
  }
}
