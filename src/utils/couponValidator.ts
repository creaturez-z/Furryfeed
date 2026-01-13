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
  is_referral: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReferralCouponSettings = {
  id: string;
  max_coupons_per_order: number | null;
  max_discount_percentage: number | null;
  stacking_policy: 'enabled' | 'partial' | 'disabled';
  updated_at: string;
  created_at: string;
};

export type CouponValidationResult = {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discountAmount?: number;
};

export type MultiCouponValidationResult = {
  valid: boolean;
  error?: string;
  coupons: Array<{
    coupon: Coupon;
    discountAmount: number;
  }>;
  totalDiscount: number;
  remainingAmount: number;
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

export async function getReferralCouponSettings(): Promise<ReferralCouponSettings | null> {
  try {
    const { data, error } = await supabase
      .from('referral_coupon_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching referral coupon settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching referral coupon settings:', error);
    return null;
  }
}

export async function validateMultipleReferralCoupons(
  couponCodes: string[],
  userId: string,
  totalAmount: number,
  mealIds: string[] = []
): Promise<MultiCouponValidationResult> {
  try {
    const settings = await getReferralCouponSettings();

    if (!settings) {
      return {
        valid: false,
        error: 'Unable to fetch referral coupon settings',
        coupons: [],
        totalDiscount: 0,
        remainingAmount: totalAmount,
      };
    }

    if (settings.stacking_policy === 'disabled') {
      return {
        valid: false,
        error: 'Referral coupon stacking is currently disabled',
        coupons: [],
        totalDiscount: 0,
        remainingAmount: totalAmount,
      };
    }

    const referralCoupons: Array<{ coupon: Coupon; discountAmount: number }> = [];
    const validationResults: CouponValidationResult[] = [];

    for (const code of couponCodes) {
      const result = await validateCoupon(code, userId, totalAmount, mealIds);
      validationResults.push(result);

      if (result.valid && result.coupon && result.coupon.is_referral) {
        referralCoupons.push({
          coupon: result.coupon,
          discountAmount: result.discountAmount || 0,
        });
      } else if (result.valid && result.coupon && !result.coupon.is_referral) {
        return {
          valid: false,
          error: `Coupon "${code}" is not a referral coupon`,
          coupons: [],
          totalDiscount: 0,
          remainingAmount: totalAmount,
        };
      } else if (!result.valid) {
        return {
          valid: false,
          error: result.error || `Invalid coupon: ${code}`,
          coupons: [],
          totalDiscount: 0,
          remainingAmount: totalAmount,
        };
      }
    }

    if (
      settings.max_coupons_per_order !== null &&
      referralCoupons.length > settings.max_coupons_per_order
    ) {
      return {
        valid: false,
        error: `You can use only ${settings.max_coupons_per_order} referral ${
          settings.max_coupons_per_order === 1 ? 'coupon' : 'coupons'
        } per order`,
        coupons: [],
        totalDiscount: 0,
        remainingAmount: totalAmount,
      };
    }

    let totalDiscount = 0;
    let remainingOrderValue = totalAmount;

    for (const item of referralCoupons) {
      let discount = 0;

      if (item.coupon.discount_type === 'flat') {
        discount = Math.min(item.coupon.discount_value, remainingOrderValue);
      } else {
        discount = (remainingOrderValue * item.coupon.discount_value) / 100;
      }

      discount = Math.round(discount * 100) / 100;
      totalDiscount += discount;
      remainingOrderValue -= discount;
      item.discountAmount = discount;
    }

    const maxDiscountPercentage = settings.max_discount_percentage || 100;
    const maxAllowedDiscount = (totalAmount * maxDiscountPercentage) / 100;

    if (totalDiscount > maxAllowedDiscount) {
      return {
        valid: false,
        error: `Referral discounts can cover only up to ${maxDiscountPercentage}% of order value (₹${maxAllowedDiscount.toFixed(
          2
        )})`,
        coupons: [],
        totalDiscount: 0,
        remainingAmount: totalAmount,
      };
    }

    const finalRemainingAmount = Math.max(0, totalAmount - totalDiscount);

    return {
      valid: true,
      coupons: referralCoupons,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      remainingAmount: Math.round(finalRemainingAmount * 100) / 100,
    };
  } catch (error) {
    console.error('Error validating multiple referral coupons:', error);
    return {
      valid: false,
      error: 'Failed to validate referral coupons',
      coupons: [],
      totalDiscount: 0,
      remainingAmount: totalAmount,
    };
  }
}

export async function recordMultipleCouponUsage(
  coupons: Array<{ coupon: Coupon; discountAmount: number }>,
  userId: string,
  subscriptionId: string | null
): Promise<boolean> {
  try {
    const usageRecords = coupons.map((item) => ({
      coupon_id: item.coupon.id,
      user_id: userId,
      subscription_id: subscriptionId,
      discount_amount: item.discountAmount,
    }));

    const { error } = await supabase.from('coupon_usage').insert(usageRecords);

    if (error) {
      console.error('Error recording multiple coupon usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error recording multiple coupon usage:', error);
    return false;
  }
}
