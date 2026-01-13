import { supabase } from '../lib/supabase';

interface InvoiceItem {
  name: string;
  pet_name?: string;
  quantity: number;
  price: number;
  total: number;
}

export async function generateInvoiceForSubscription(
  subscriptionId: string,
  customerId: string
): Promise<string | null> {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('invoice_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings) throw new Error('Invoice settings not found');

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        meal:meals(*),
        pet:pets(*)
      `)
      .eq('id', subscriptionId)
      .single();

    if (subError) throw subError;

    const { data: dailyItems, error: dailyItemsError } = await supabase
      .from('subscription_daily_items')
      .select(`
        *,
        meal:meals(name),
        pet:pets(name)
      `)
      .eq('subscription_id', subscriptionId);

    if (dailyItemsError) {
      console.error('Error fetching daily items:', dailyItemsError);
    }

    const invoiceNumber = `${settings.invoice_prefix}${settings.next_invoice_number}`;

    const items: InvoiceItem[] = [];

    if (dailyItems && dailyItems.length > 0) {
      const itemsMap = new Map<string, InvoiceItem>();

      dailyItems.forEach((item: any) => {
        const key = `${item.meal_id}-${item.pet_id}`;

        if (itemsMap.has(key)) {
          const existingItem = itemsMap.get(key)!;
          existingItem.total += item.price;
        } else {
          itemsMap.set(key, {
            name: item.meal?.name || 'Unknown Meal',
            pet_name: item.pet?.name || 'Unknown Pet',
            quantity: item.quantity,
            price: item.price,
            total: item.price,
          });
        }
      });

      items.push(...Array.from(itemsMap.values()));
    } else {
      items.push({
        name: subscription.meal?.name || 'Unknown Meal',
        pet_name: subscription.pet?.name || 'Unknown Pet',
        quantity: subscription.quantity || 0,
        price: subscription.calculated_price || 0,
        total: subscription.calculated_price || 0,
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    const { data: taxConfig, error: taxError } = await supabase
      .from('tax_configurations')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    let taxAmount = 0;
    if (taxConfig && taxConfig.tax_percentage) {
      if (taxConfig.tax_type === 'exclusive') {
        taxAmount = (subtotal * taxConfig.tax_percentage) / 100;
      } else {
        taxAmount = subtotal - (subtotal / (1 + taxConfig.tax_percentage / 100));
      }
    }

    const totalAmount = subtotal + taxAmount;

    const startDate = subscription.start_date || new Date().toISOString().split('T')[0];
    const endDate = subscription.end_date || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        subscription_id: subscriptionId,
        customer_id: customerId,
        order_date: startDate,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: items,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    await supabase
      .from('invoice_settings')
      .update({ next_invoice_number: settings.next_invoice_number + 1 })
      .eq('id', settings.id);

    return invoice.id;
  } catch (error) {
    console.error('Error generating invoice:', error);
    return null;
  }
}
