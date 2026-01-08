import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ProfileWithWallet } from '../../types/database';
import { Search, Plus, Edit, Trash2, Ban, CheckCircle, X, Save } from 'lucide-react';

export function CustomersManagement() {
  const [customers, setCustomers] = useState<ProfileWithWallet[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<ProfileWithWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ProfileWithWallet | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banningCustomer, setBanningCustomer] = useState<ProfileWithWallet | null>(null);
  const [banReason, setBanReason] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alternative_phone: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          wallets(balance)
        `)
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const customersWithWallet: ProfileWithWallet[] = (profilesData || []).map((profile: any) => ({
        ...profile,
        wallet_balance: profile.wallets?.[0]?.balance || 0,
      }));

      setCustomers(customersWithWallet);
      setFilteredCustomers(customersWithWallet);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            alternative_phone: formData.alternative_phone,
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: Math.random().toString(36).slice(-8) + 'Aa1!',
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            alternative_phone: formData.alternative_phone,
            role: 'customer',
          });

          if (profileError) throw profileError;
        }
      }

      resetForm();
      await loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer');
    }
  };

  const handleEdit = (customer: ProfileWithWallet) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      alternative_phone: customer.alternative_phone || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.'))
      return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);

      if (error) throw error;
      await loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  };

  const handleBanClick = (customer: ProfileWithWallet) => {
    setBanningCustomer(customer);
    setBanReason('');
    setShowBanModal(true);
  };

  const handleBanConfirm = async () => {
    if (!banningCustomer) return;

    try {
      const isBanning = !banningCustomer.is_banned;

      const updateData = isBanning
        ? {
            is_banned: true,
            banned_at: new Date().toISOString(),
            ban_reason: banReason || 'No reason provided',
          }
        : {
            is_banned: false,
            banned_at: null,
            ban_reason: null,
          };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', banningCustomer.id);

      if (error) throw error;

      setShowBanModal(false);
      setBanningCustomer(null);
      setBanReason('');
      await loadCustomers();
    } catch (error) {
      console.error('Error updating ban status:', error);
      alert('Failed to update ban status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      alternative_phone: '',
    });
    setEditingCustomer(null);
    setShowForm(false);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingCustomer}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone {editingCustomer && '(Read-only)'}*
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!!editingCustomer}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternative Phone
                </label>
                <input
                  type="tel"
                  value={formData.alternative_phone}
                  onChange={(e) => setFormData({ ...formData, alternative_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                <Save className="w-5 h-5" />
                <span>{editingCustomer ? 'Update' : 'Create'}</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Name</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Phone</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Wallet Balance
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      {customer.alternative_phone && (
                        <div className="text-xs text-gray-500">Alt: {customer.alternative_phone}</div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">{customer.email || 'N/A'}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{customer.phone}</td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-orange-600">
                        ₹{(customer.wallet_balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {customer.is_banned ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <Ban className="w-3 h-3" />
                          <span>Banned</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleBanClick(customer)}
                          className={`p-2 rounded-lg ${
                            customer.is_banned
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={customer.is_banned ? 'Unban' : 'Ban'}
                        >
                          {customer.is_banned ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

      {showBanModal && banningCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {banningCustomer.is_banned ? 'Unban Customer' : 'Ban Customer'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {banningCustomer.is_banned
                ? `Are you sure you want to unban ${banningCustomer.name}?`
                : `Are you sure you want to ban ${banningCustomer.name}?`}
            </p>
            {!banningCustomer.is_banned && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter reason for ban..."
                />
              </div>
            )}
            {banningCustomer.is_banned && banningCustomer.ban_reason && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Current ban reason:</p>
                <p className="text-sm text-gray-900">{banningCustomer.ban_reason}</p>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={handleBanConfirm}
                className={`flex-1 px-6 py-3 rounded-lg font-medium text-white ${
                  banningCustomer.is_banned
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {banningCustomer.is_banned ? 'Unban' : 'Ban'}
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanningCustomer(null);
                  setBanReason('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
