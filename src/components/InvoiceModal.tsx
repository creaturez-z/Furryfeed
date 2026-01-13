import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { InvoiceViewer } from './InvoiceViewer';

interface InvoiceModalProps {
  invoiceId: string;
  onClose: () => void;
}

export function InvoiceModal({ invoiceId, onClose }: InvoiceModalProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [invoiceRes, settingsRes, brandRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            *,
            customer:profiles!invoices_customer_id_fkey(name, email, phone),
            subscription:subscriptions(start_date, end_date)
          `)
          .eq('id', invoiceId)
          .single(),
        supabase.from('invoice_settings').select('*').limit(1).maybeSingle(),
        supabase.from('brand_settings').select('logo_url').limit(1).maybeSingle(),
      ]);

      if (invoiceRes.error) throw invoiceRes.error;
      if (settingsRes.error) throw settingsRes.error;

      if (!invoiceRes.data) {
        throw new Error('Invoice not found');
      }

      if (!settingsRes.data) {
        throw new Error('Invoice settings not configured');
      }

      setInvoice({
        invoice_number: invoiceRes.data.invoice_number,
        order_date: invoiceRes.data.order_date,
        subtotal: invoiceRes.data.subtotal,
        tax_amount: invoiceRes.data.tax_amount,
        total_amount: invoiceRes.data.total_amount,
        items: invoiceRes.data.items || [],
        start_date: invoiceRes.data.subscription?.start_date,
        end_date: invoiceRes.data.subscription?.end_date,
        customer: invoiceRes.data.customer ? {
          name: invoiceRes.data.customer.name,
          email: invoiceRes.data.customer.email,
          phone: invoiceRes.data.customer.phone,
        } : undefined,
      });

      setSettings({
        company_name: settingsRes.data.company_name || '',
        company_address: settingsRes.data.company_address || '',
        phone: settingsRes.data.company_phone || '',
        gst_number: settingsRes.data.company_gst_number || '',
        terms_and_conditions: settingsRes.data.terms_and_conditions || '',
        logo_url: brandRes.data?.logo_url || '',
        template_type: settingsRes.data.template_type || 'standard_a4',
        labels: {
          invoice_title: settingsRes.data.invoice_title_label || 'INVOICE',
          subtotal: settingsRes.data.subtotal_label || 'Subtotal',
          gst: settingsRes.data.gst_label || 'GST',
          total: settingsRes.data.total_label || 'Total',
          pet_name: settingsRes.data.pet_name_label || 'Pet Name',
          start_date: settingsRes.data.start_date_label || 'Start Date',
          end_date: settingsRes.data.end_date_label || 'End Date',
          quantity: settingsRes.data.quantity_label || 'Quantity',
          item: settingsRes.data.item_label || 'Item',
          price: settingsRes.data.price_label || 'Price',
        },
      });
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice || !settings) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Error</h3>
          <p className="text-gray-600 mb-6">{error || 'Invoice not found'}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return <InvoiceViewer invoice={invoice} settings={settings} onClose={onClose} />;
}
