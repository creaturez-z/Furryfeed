import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';

interface TaxConfiguration {
  id: string;
  tax_name: string;
  tax_percentage: number;
  tax_type: 'inclusive' | 'exclusive';
  applies_to: 'subscriptions' | 'one_time_orders' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InvoiceSettings {
  id: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_gst_number: string;
  invoice_prefix: string;
  next_invoice_number: number;
}

export function TaxConfigurationManagement() {
  const [taxConfigs, setTaxConfigs] = useState<TaxConfiguration[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tax_name: '',
    tax_percentage: '',
    tax_type: 'exclusive' as 'inclusive' | 'exclusive',
    applies_to: 'both' as 'subscriptions' | 'one_time_orders' | 'both',
    is_active: false,
  });
  const [companyData, setCompanyData] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_gst_number: '',
    invoice_prefix: 'INV-',
  });

  useEffect(() => {
    loadTaxConfigurations();
    loadInvoiceSettings();
  }, []);

  const loadTaxConfigurations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaxConfigs(data || []);
    } catch (error) {
      console.error('Error loading tax configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInvoiceSettings(data);
        setCompanyData({
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_phone: data.company_phone || '',
          company_gst_number: data.company_gst_number || '',
          invoice_prefix: data.invoice_prefix || 'INV-',
        });
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error);
    }
  };

  const handleSaveCompanyDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (invoiceSettings) {
        const { error } = await supabase
          .from('invoice_settings')
          .update({
            company_name: companyData.company_name,
            company_address: companyData.company_address,
            company_phone: companyData.company_phone,
            company_gst_number: companyData.company_gst_number,
            invoice_prefix: companyData.invoice_prefix,
          })
          .eq('id', invoiceSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invoice_settings')
          .insert({
            company_name: companyData.company_name,
            company_address: companyData.company_address,
            company_phone: companyData.company_phone,
            company_gst_number: companyData.company_gst_number,
            invoice_prefix: companyData.invoice_prefix,
            next_invoice_number: 1000,
          });

        if (error) throw error;
      }

      await loadInvoiceSettings();
      alert('Company details saved successfully');
    } catch (error) {
      console.error('Error saving company details:', error);
      alert('Failed to save company details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const taxData = {
        tax_name: formData.tax_name,
        tax_percentage: parseFloat(formData.tax_percentage),
        tax_type: formData.tax_type,
        applies_to: formData.applies_to,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('tax_configurations')
          .update(taxData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('tax_configurations').insert([taxData]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        tax_name: '',
        tax_percentage: '',
        tax_type: 'exclusive',
        applies_to: 'both',
        is_active: false,
      });
      loadTaxConfigurations();
    } catch (error) {
      console.error('Error saving tax configuration:', error);
      alert('Failed to save tax configuration');
    }
  };

  const handleEdit = (config: TaxConfiguration) => {
    setEditingId(config.id);
    setFormData({
      tax_name: config.tax_name,
      tax_percentage: config.tax_percentage.toString(),
      tax_type: config.tax_type,
      applies_to: config.applies_to,
      is_active: config.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax configuration?')) return;

    try {
      const { error } = await supabase.from('tax_configurations').delete().eq('id', id);

      if (error) throw error;
      loadTaxConfigurations();
    } catch (error) {
      console.error('Error deleting tax configuration:', error);
      alert('Failed to delete tax configuration');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tax_configurations')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadTaxConfigurations();
    } catch (error) {
      console.error('Error toggling tax configuration:', error);
      alert('Failed to update tax configuration status');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      tax_name: '',
      tax_percentage: '',
      tax_type: 'exclusive',
      applies_to: 'both',
      is_active: false,
    });
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
        <h2 className="text-2xl font-bold text-gray-900">Tax & Invoice Configuration</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Tax Rule</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Company & Invoice Details</h3>
        <p className="text-sm text-gray-600 mb-6">
          These details will appear on all generated invoices. Update them to match your business information.
        </p>
        <form onSubmit={handleSaveCompanyDetails} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyData.company_name}
                onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Your Company Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyData.company_phone}
                onChange={(e) => setCompanyData({ ...companyData, company_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="+91 XXXXXXXXXX"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={companyData.company_address}
                onChange={(e) => setCompanyData({ ...companyData, company_address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Full business address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number
              </label>
              <input
                type="text"
                value={companyData.company_gst_number}
                onChange={(e) => setCompanyData({ ...companyData, company_gst_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., 22AAAAA0000A1Z5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={companyData.invoice_prefix}
                onChange={(e) => setCompanyData({ ...companyData, invoice_prefix: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="INV-"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Save Company Details
          </button>
        </form>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Tax Configuration' : 'New Tax Configuration'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tax_name}
                  onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., GST, VAT"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Percentage (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_percentage}
                  onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 5, 12, 18"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tax_type}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_type: e.target.value as 'inclusive' | 'exclusive' })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="exclusive">Exclusive (Added to price)</option>
                  <option value="inclusive">Inclusive (Included in price)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applies To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.applies_to}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applies_to: e.target.value as 'subscriptions' | 'one_time_orders' | 'both',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="both">Both Subscriptions & Orders</option>
                  <option value="subscriptions">Subscriptions Only</option>
                  <option value="one_time_orders">One-time Orders Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Set as Active Tax Configuration
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Only one tax configuration can be active at a time. Activating this will
                automatically deactivate all other tax rules. Tax changes apply only to new orders and subscriptions.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {editingId ? 'Update Tax Rule' : 'Create Tax Rule'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applies To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxConfigs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No tax configurations found. Create one to get started.
                  </td>
                </tr>
              ) : (
                taxConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {config.is_active ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Power className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <PowerOff className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{config.tax_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{config.tax_percentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          config.tax_type === 'exclusive'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {config.tax_type.charAt(0).toUpperCase() + config.tax_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {config.applies_to === 'both'
                          ? 'Both'
                          : config.applies_to === 'subscriptions'
                          ? 'Subscriptions'
                          : 'One-time Orders'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(config.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(config.id, config.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            config.is_active
                              ? 'text-gray-600 hover:bg-gray-100'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={config.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {config.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(config)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">Tax Configuration Guidelines</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Exclusive Tax:</strong> Tax amount is added on top of the base price (Price + Tax)</li>
          <li>• <strong>Inclusive Tax:</strong> Tax amount is already included in the base price</li>
          <li>• Only one tax configuration can be active at a time</li>
          <li>• Tax changes apply only to new orders and subscriptions created after activation</li>
          <li>• Historical orders and subscriptions retain their original tax calculations</li>
          <li>• Disabled tax configurations will not be applied to any transactions</li>
        </ul>
      </div>
    </div>
  );
}
