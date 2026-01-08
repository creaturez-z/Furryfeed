import { supabase } from '../lib/supabase';

export interface TaxConfiguration {
  id: string;
  tax_name: string;
  tax_percentage: number;
  tax_type: 'inclusive' | 'exclusive';
  applies_to: 'subscriptions' | 'one_time_orders' | 'both';
  is_active: boolean;
}

export interface TaxCalculation {
  subtotal: number;
  taxName: string;
  taxPercentage: number;
  taxAmount: number;
  total: number;
}

export async function getActiveTaxConfiguration(
  orderType: 'subscription' | 'order'
): Promise<TaxConfiguration | null> {
  try {
    const { data, error } = await supabase
      .from('tax_configurations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const taxConfig = data as TaxConfiguration;

    if (
      taxConfig.applies_to === 'both' ||
      (orderType === 'subscription' && taxConfig.applies_to === 'subscriptions') ||
      (orderType === 'order' && taxConfig.applies_to === 'one_time_orders')
    ) {
      return taxConfig;
    }

    return null;
  } catch (error) {
    console.error('Error fetching active tax configuration:', error);
    return null;
  }
}

export function calculateTax(
  baseAmount: number,
  taxConfig: TaxConfiguration | null
): TaxCalculation {
  if (!taxConfig) {
    return {
      subtotal: baseAmount,
      taxName: '',
      taxPercentage: 0,
      taxAmount: 0,
      total: baseAmount,
    };
  }

  let subtotal: number;
  let taxAmount: number;
  let total: number;

  if (taxConfig.tax_type === 'inclusive') {
    total = baseAmount;
    subtotal = baseAmount / (1 + taxConfig.tax_percentage / 100);
    taxAmount = total - subtotal;
  } else {
    subtotal = baseAmount;
    taxAmount = (subtotal * taxConfig.tax_percentage) / 100;
    total = subtotal + taxAmount;
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxName: taxConfig.tax_name,
    taxPercentage: taxConfig.tax_percentage,
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

export async function calculateOrderTax(baseAmount: number): Promise<TaxCalculation> {
  const taxConfig = await getActiveTaxConfiguration('order');
  return calculateTax(baseAmount, taxConfig);
}

export async function calculateSubscriptionTax(baseAmount: number): Promise<TaxCalculation> {
  const taxConfig = await getActiveTaxConfiguration('subscription');
  return calculateTax(baseAmount, taxConfig);
}
