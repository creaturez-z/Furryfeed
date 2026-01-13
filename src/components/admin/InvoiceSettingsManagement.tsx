import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Eye } from 'lucide-react';

export function InvoiceSettingsManagement() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    phone: '',
    gst_number: '',
    invoice_prefix: '',
    next_invoice_number: 1001,
    customer_can_access: false,
    terms_and_conditions: '',
    template_type: 'standard_a4',
    invoice_title_label: 'INVOICE',
    subtotal_label: 'Subtotal',
    gst_label: 'GST',
    total_label: 'Total',
    pet_name_label: 'Pet Name',
    start_date_label: 'Start Date',
    end_date_label: 'End Date',
    quantity_label: 'Quantity',
    item_label: 'Item',
    price_label: 'Price',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setFormData({
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          phone: data.phone || '',
          gst_number: data.gst_number || '',
          invoice_prefix: data.invoice_prefix || '',
          next_invoice_number: data.next_invoice_number || 1001,
          customer_can_access: data.customer_can_access || false,
          terms_and_conditions: data.terms_and_conditions || '',
          template_type: data.template_type || 'standard_a4',
          invoice_title_label: data.invoice_title_label || 'INVOICE',
          subtotal_label: data.subtotal_label || 'Subtotal',
          gst_label: data.gst_label || 'GST',
          total_label: data.total_label || 'Total',
          pet_name_label: data.pet_name_label || 'Pet Name',
          start_date_label: data.start_date_label || 'Start Date',
          end_date_label: data.end_date_label || 'End Date',
          quantity_label: data.quantity_label || 'Quantity',
          item_label: data.item_label || 'Item',
          price_label: data.price_label || 'Price',
        });
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error);
      alert('Failed to load invoice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('invoice_settings')
        .update(formData)
        .eq('id', settings.id);

      if (error) throw error;

      alert('Invoice settings updated successfully');
      await loadSettings();
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      alert('Failed to save invoice settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Invoice settings not configured. Please contact support.</p>
      </div>
    );
  }

  const previewInvoice = {
    invoice_number: 'INV-1001',
    order_date: new Date().toISOString(),
    subtotal: 1000,
    tax_amount: 180,
    total_amount: 1180,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { name: 'Chicken & Rice Delight', pet_name: 'Buddy', quantity: 500, price: 500, total: 500 },
      { name: 'Beef & Vegetable Mix', pet_name: 'Max', quantity: 500, price: 500, total: 500 },
    ],
    customer: { name: 'Sample Customer', phone: '+91 9876543210' },
  };

  const renderPreview = () => {
    switch (formData.template_type) {
      case 'thermal_printer':
        return (
          <div className="bg-white p-4 max-w-xs mx-auto border-2 border-dashed border-gray-300 rounded" style={{ fontFamily: 'monospace' }}>
            <div className="text-center border-b-2 border-dashed pb-2 mb-2">
              <h1 className="text-sm font-bold">Sample Company</h1>
              <p className="text-xs">{formData.gst_label}: SAMPLE123</p>
            </div>
            <div className="text-center border-b-2 border-dashed pb-2 mb-2">
              <h2 className="text-xs font-bold">{formData.invoice_title_label}</h2>
              <p className="text-xs">#{previewInvoice.invoice_number}</p>
            </div>
            <div className="text-xs border-b-2 border-dashed pb-2 mb-2">
              <p><strong>Customer:</strong> {previewInvoice.customer.name}</p>
              <p><strong>{formData.start_date_label}:</strong> {new Date(previewInvoice.start_date).toLocaleDateString()}</p>
            </div>
            <div className="border-b-2 border-dashed pb-2 mb-2">
              {previewInvoice.items.map((item, i) => (
                <div key={i} className="text-xs mb-1">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-gray-600">{formData.pet_name_label}: {item.pet_name}</div>
                  <div className="flex justify-between">
                    <span>{item.quantity}g</span>
                    <span>₹{item.total}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>{formData.subtotal_label}:</span>
                <span>₹{previewInvoice.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>{formData.gst_label}:</span>
                <span>₹{previewInvoice.tax_amount}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{formData.total_label}:</span>
                <span>₹{previewInvoice.total_amount}</span>
              </div>
            </div>
          </div>
        );
      case 'compact_receipt':
        return (
          <div className="bg-white p-4 max-w-sm mx-auto border-2 border-gray-300 rounded">
            <div className="flex justify-between items-start border-b pb-2 mb-2">
              <div>
                <h1 className="text-xs font-bold">Sample Company</h1>
                <p className="text-xs text-gray-600">{formData.gst_label}: SAMPLE123</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold">{formData.invoice_title_label}</h2>
                <p className="text-xs">#{previewInvoice.invoice_number}</p>
              </div>
            </div>
            <div className="text-xs mb-2">
              <p className="font-semibold">{previewInvoice.customer.name}</p>
            </div>
            {previewInvoice.items.map((item, i) => (
              <div key={i} className="text-xs border-b py-1">
                <div>{item.name}</div>
                <div className="text-gray-600">{item.pet_name}</div>
                <div className="flex justify-between">
                  <span>{item.quantity}g</span>
                  <span>₹{item.total}</span>
                </div>
              </div>
            ))}
            <div className="text-xs mt-2 space-y-1">
              <div className="flex justify-between">
                <span>{formData.subtotal_label}:</span>
                <span>₹{previewInvoice.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>{formData.gst_label}:</span>
                <span>₹{previewInvoice.tax_amount}</span>
              </div>
              <div className="flex justify-between font-bold text-sm">
                <span>{formData.total_label}:</span>
                <span>₹{previewInvoice.total_amount}</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white p-6 border-2 border-gray-300 rounded-lg max-w-2xl mx-auto">
            <div className="border-b-2 pb-4 mb-4">
              <div className="flex justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Sample Company</h1>
                  <p className="text-sm text-gray-600">{formData.gst_label}: SAMPLE123</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">{formData.invoice_title_label}</h2>
                  <p className="text-sm">#{previewInvoice.invoice_number}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Bill To:</h3>
                <p className="text-sm">{previewInvoice.customer.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Subscription Period:</h3>
                <p className="text-xs">{formData.start_date_label}: {new Date(previewInvoice.start_date).toLocaleDateString()}</p>
                <p className="text-xs">{formData.end_date_label}: {new Date(previewInvoice.end_date).toLocaleDateString()}</p>
              </div>
            </div>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-2">{formData.item_label}</th>
                  <th className="text-left py-2">{formData.pet_name_label}</th>
                  <th className="text-right py-2">{formData.quantity_label}</th>
                  <th className="text-right py-2">{formData.price_label}</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {previewInvoice.items.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2">{item.pet_name}</td>
                    <td className="text-right py-2">{item.quantity}g</td>
                    <td className="text-right py-2">₹{item.price}</td>
                    <td className="text-right py-2">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{formData.subtotal_label}:</span>
                  <span>₹{previewInvoice.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>{formData.gst_label}:</span>
                  <span>₹{previewInvoice.tax_amount}</span>
                </div>
                <div className="flex justify-between font-bold border-t-2 pt-1">
                  <span>{formData.total_label}:</span>
                  <span>₹{previewInvoice.total_amount}</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Invoice Settings</h2>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
        </button>
      </div>

      {showPreview && (
        <div className="bg-gray-50 rounded-xl p-6 border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Preview</h3>
          <div className="overflow-auto max-h-96">
            {renderPreview()}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Address
            </label>
            <textarea
              value={formData.company_address}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Number
            </label>
            <input
              type="text"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
              placeholder="e.g., INV-"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Invoice Number
            </label>
            <input
              type="number"
              value={formData.next_invoice_number}
              onChange={(e) => setFormData({ ...formData, next_invoice_number: parseInt(e.target.value) || 1001 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.customer_can_access}
                onChange={(e) => setFormData({ ...formData, customer_can_access: e.target.checked })}
                className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Allow customers to view invoices</span>
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <textarea
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
              rows={4}
              placeholder="Enter terms and conditions for invoices..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Template Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="template"
              value="standard_a4"
              checked={formData.template_type === 'standard_a4'}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              className="w-4 h-4 text-orange-500"
            />
            <div>
              <div className="font-semibold text-gray-900">Standard A4</div>
              <div className="text-xs text-gray-600">Professional invoice layout</div>
            </div>
          </label>
          <label className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="template"
              value="thermal_printer"
              checked={formData.template_type === 'thermal_printer'}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              className="w-4 h-4 text-orange-500"
            />
            <div>
              <div className="font-semibold text-gray-900">Thermal Printer</div>
              <div className="text-xs text-gray-600">Compact receipt style</div>
            </div>
          </label>
          <label className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="template"
              value="compact_receipt"
              checked={formData.template_type === 'compact_receipt'}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              className="w-4 h-4 text-orange-500"
            />
            <div>
              <div className="font-semibold text-gray-900">Compact Receipt</div>
              <div className="text-xs text-gray-600">Minimal space-saving design</div>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Label Customization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Title
            </label>
            <input
              type="text"
              value={formData.invoice_title_label}
              onChange={(e) => setFormData({ ...formData, invoice_title_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtotal Label
            </label>
            <input
              type="text"
              value={formData.subtotal_label}
              onChange={(e) => setFormData({ ...formData, subtotal_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Label
            </label>
            <input
              type="text"
              value={formData.gst_label}
              onChange={(e) => setFormData({ ...formData, gst_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Label
            </label>
            <input
              type="text"
              value={formData.total_label}
              onChange={(e) => setFormData({ ...formData, total_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pet Name Label
            </label>
            <input
              type="text"
              value={formData.pet_name_label}
              onChange={(e) => setFormData({ ...formData, pet_name_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date Label
            </label>
            <input
              type="text"
              value={formData.start_date_label}
              onChange={(e) => setFormData({ ...formData, start_date_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date Label
            </label>
            <input
              type="text"
              value={formData.end_date_label}
              onChange={(e) => setFormData({ ...formData, end_date_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity Label
            </label>
            <input
              type="text"
              value={formData.quantity_label}
              onChange={(e) => setFormData({ ...formData, quantity_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Label
            </label>
            <input
              type="text"
              value={formData.item_label}
              onChange={(e) => setFormData({ ...formData, item_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Label
            </label>
            <input
              type="text"
              value={formData.price_label}
              onChange={(e) => setFormData({ ...formData, price_label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
}
