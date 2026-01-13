import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Eye, Search, Trash2 } from 'lucide-react';
import { InvoiceViewer } from '../InvoiceViewer';

interface InvoiceSettings {
  id: string;
  company_name: string;
  company_address: string;
  phone: string;
  gst_number: string;
  invoice_prefix: string;
  next_invoice_number: number;
  customer_can_access: boolean;
  terms_and_conditions: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  subscription_id: string;
  order_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items: any[];
  customer?: { name: string; email: string; phone: string };
  pet_names?: string[];
}

export function InvoiceManagement() {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadSettings(), loadInvoices()]);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setSettings(data);
      setEditingSettings(data);
    }
  };

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:profiles!invoices_customer_id_fkey(name, email, phone),
        subscription:subscriptions(id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const invoicesWithPets = await Promise.all(
      (data || []).map(async (invoice) => {
        const petNamesFromItems = invoice.items
          ?.map((item: any) => item.pet_name)
          .filter((name: string | undefined) => name);

        const uniquePetNames = [...new Set(petNamesFromItems || [])];

        return {
          ...invoice,
          pet_names: uniquePetNames,
        };
      })
    );

    setInvoices(invoicesWithPets);
    setFilteredInvoices(invoicesWithPets);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(invoiceId);
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      await loadInvoices();
      alert('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      setFilteredInvoices(invoices);
      return;
    }

    const filtered = invoices.filter((invoice) => {
      const invoiceNumber = invoice.invoice_number?.toLowerCase() || '';
      const customerName = invoice.customer?.name?.toLowerCase() || '';
      const customerEmail = invoice.customer?.email?.toLowerCase() || '';
      const customerPhone = invoice.customer?.phone?.toLowerCase() || '';
      const petNames = (invoice.pet_names || []).join(' ').toLowerCase();

      return (
        invoiceNumber.includes(lowerQuery) ||
        customerName.includes(lowerQuery) ||
        customerEmail.includes(lowerQuery) ||
        customerPhone.includes(lowerQuery) ||
        petNames.includes(lowerQuery)
      );
    });

    setFilteredInvoices(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <FileText className="w-6 h-6" />
          <span>Invoice Management</span>
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by Invoice No, Pet Name, Customer Name, Phone, or Email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Invoice #</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Customer</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Pet Name(s)</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No invoices found matching your search' : 'No invoices found'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6 font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">{invoice.customer?.name}</div>
                      <div className="text-xs text-gray-500">{invoice.customer?.email || invoice.customer?.phone}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {invoice.pet_names && invoice.pet_names.length > 0
                          ? invoice.pet_names.join(', ')
                          : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {new Date(invoice.order_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-orange-600">
                        ₹{invoice.total_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          disabled={deletingId === invoice.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && settings && (
        <InvoiceViewer
          invoice={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
