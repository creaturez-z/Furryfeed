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
        pet:pets(*),
        subscription_pets(pet:pets(*)),
        subscription_items(meal:meals(*), quantity, price)
      `)
      .eq('id', subscriptionId)
      .single();

    if (subError) throw subError;

    const invoiceNumber = `${settings.invoice_prefix}${settings.next_invoice_number}`;

    const items: InvoiceItem[] = [];

    if (subscription.subscription_items && subscription.subscription_items.length > 0) {
      subscription.subscription_items.forEach((item: any) => {
        const petNames = subscription.subscription_pets?.map((sp: any) => sp.pet?.name).join(', ') || 'Multiple Pets';
        items.push({
          name: item.meal?.name || 'Unknown Meal',
          pet_name: petNames,
          quantity: item.quantity,
          price: item.price,
          total: item.price,
        });
      });
    } else {
      items.push({
        name: subscription.meal?.name || 'Unknown Meal',
        pet_name: subscription.pet?.name,
        quantity: subscription.quantity || 0,
        price: subscription.calculated_price || 0,
        total: subscription.calculated_price || 0,
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);

    const { data: taxConfig, error: taxError } = await supabase
      .from('tax_configurations')
      .select('*')
      .limit(1)
      .maybeSingle();

    let taxAmount = 0;
    if (taxConfig && taxConfig.tax_rate) {
      taxAmount = (subtotal * taxConfig.tax_rate) / 100;
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
