import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ProfileWithWallet } from '../../types/database';
import { Search, Plus, Edit, Trash2, Ban, CheckCircle, X, Save, User, Wallet, PawPrint, Package, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<ProfileWithWallet | null>(null);
  const [deleteOption, setDeleteOption] = useState<'customer' | 'customer_invoices' | 'customer_subscriptions' | 'customer_all'>('customer');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ProfileWithWallet | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletView, setWalletView] = useState<'transactions' | 'add' | 'deduct'>('transactions');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletDescription, setWalletDescription] = useState('');
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [customerPets, setCustomerPets] = useState<any[]>([]);
  const [customerSubscriptions, setCustomerSubscriptions] = useState<any[]>([]);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedDetails, setEditedDetails] = useState({
    name: '',
    alternative_phone: '',
    delivery_address: '',
  });
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<any>(null);
  const [petFormData, setPetFormData] = useState({
    name: '',
    breed: '',
    age: '',
    weight: '',
    medical_condition: '',
    special_instructions: '',
  });
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
      // First get all customer profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then get all wallets
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('customer_id, balance');

      // Create a wallet lookup map
      const walletMap = new Map(
        (walletsData || []).map((w: any) => [w.customer_id, parseFloat(w.balance) || 0])
      );

      const customersWithWallet: ProfileWithWallet[] = (profilesData || []).map((profile: any) => ({
        ...profile,
        wallet_balance: walletMap.get(profile.id) || 0,
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

  const handleDeleteClick = (customer: ProfileWithWallet) => {
    setDeletingCustomer(customer);
    setDeleteOption('customer');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;

    try {
      if (deleteOption === 'customer_invoices' || deleteOption === 'customer_all') {
        const { error: invoicesError } = await supabase
          .from('invoices')
          .delete()
          .eq('customer_id', deletingCustomer.id);

        if (invoicesError) throw invoicesError;
      }

      if (deleteOption === 'customer_subscriptions' || deleteOption === 'customer_all') {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('customer_id', deletingCustomer.id);

        if (subscriptions && subscriptions.length > 0) {
          const subscriptionIds = subscriptions.map(s => s.id);

          await supabase
            .from('subscription_daily_items')
            .delete()
            .in('subscription_id', subscriptionIds);

          await supabase
            .from('subscription_pets')
            .delete()
            .in('subscription_id', subscriptionIds);

          await supabase
            .from('subscription_items')
            .delete()
            .in('subscription_id', subscriptionIds);

          await supabase
            .from('subscriptions')
            .delete()
            .eq('customer_id', deletingCustomer.id);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingCustomer.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setDeletingCustomer(null);
      await loadCustomers();
      alert('Customer deleted successfully');
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

  const handleCustomerClick = async (customer: ProfileWithWallet) => {
    setSelectedCustomer(customer);
    setIsEditingDetails(false);
    setEditedDetails({
      name: customer.name,
      alternative_phone: customer.alternative_phone || '',
      delivery_address: customer.delivery_address || '',
    });

    // Load customer's pets
    const { data: petsData } = await supabase
      .from('pets')
      .select('*')
      .eq('customer_id', customer.id);
    setCustomerPets(petsData || []);

    // Load customer's subscriptions
    const { data: subsData } = await supabase
      .from('subscriptions')
      .select(`
        *,
        meal:meals(name),
        pet:pets(name)
      `)
      .eq('customer_id', customer.id);
    setCustomerSubscriptions(subsData || []);

    setShowCustomerDetails(true);
  };

  const handleSaveCustomerDetails = async () => {
    if (!selectedCustomer) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editedDetails.name,
          alternative_phone: editedDetails.alternative_phone,
          delivery_address: editedDetails.delivery_address,
        })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      setIsEditingDetails(false);
      await loadCustomers();

      // Update selectedCustomer with new data
      setSelectedCustomer({
        ...selectedCustomer,
        name: editedDetails.name,
        alternative_phone: editedDetails.alternative_phone,
        delivery_address: editedDetails.delivery_address,
      });

      alert('Customer details updated successfully');
    } catch (error) {
      console.error('Error updating customer details:', error);
      alert('Failed to update customer details');
    }
  };

  const handleAddPet = () => {
    setPetFormData({
      name: '',
      breed: '',
      age: '',
      weight: '',
      medical_condition: '',
      special_instructions: '',
    });
    setEditingPet(null);
    setShowPetForm(true);
  };

  const handleEditPet = (pet: any) => {
    setPetFormData({
      name: pet.name,
      breed: pet.breed,
      age: pet.age.toString(),
      weight: pet.weight.toString(),
      medical_condition: pet.medical_condition || '',
      special_instructions: pet.special_instructions || '',
    });
    setEditingPet(pet);
    setShowPetForm(true);
  };

  const handleSavePet = async () => {
    if (!selectedCustomer) return;

    try {
      const petData = {
        name: petFormData.name,
        breed: petFormData.breed,
        age: parseInt(petFormData.age),
        weight: parseFloat(petFormData.weight),
        medical_condition: petFormData.medical_condition,
        special_instructions: petFormData.special_instructions,
        customer_id: selectedCustomer.id,
      };

      if (editingPet) {
        const { error } = await supabase
          .from('pets')
          .update(petData)
          .eq('id', editingPet.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pets')
          .insert(petData);

        if (error) throw error;
      }

      setShowPetForm(false);
      setEditingPet(null);

      // Reload pets
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('customer_id', selectedCustomer.id);
      setCustomerPets(petsData || []);

      alert(`Pet ${editingPet ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Error saving pet:', error);
      alert('Failed to save pet');
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!confirm('Are you sure you want to delete this pet?')) return;

    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);

      if (error) throw error;

      // Reload pets
      if (selectedCustomer) {
        const { data: petsData } = await supabase
          .from('pets')
          .select('*')
          .eq('customer_id', selectedCustomer.id);
        setCustomerPets(petsData || []);
      }

      alert('Pet deleted successfully');
    } catch (error) {
      console.error('Error deleting pet:', error);
      alert('Failed to delete pet');
    }
  };

  const handleWalletClick = async (customer: ProfileWithWallet) => {
    setSelectedCustomer(customer);
    await loadWalletTransactions(customer.id);
    setWalletView('transactions');
    setShowWalletModal(true);
  };

  const loadWalletTransactions = async (customerId: string) => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setWalletTransactions(data || []);
  };

  const handleWalletTransaction = async (type: 'credit' | 'debit') => {
    if (!selectedCustomer || !walletAmount || parseFloat(walletAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(walletAmount);

      // Get or create wallet
      let { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .maybeSingle();

      if (!wallet) {
        const { data: newWallet, error: walletError } = await supabase
          .from('wallets')
          .insert({ customer_id: selectedCustomer.id, balance: 0 })
          .select()
          .single();

        if (walletError) throw walletError;
        wallet = newWallet;
      }

      const currentBalance = parseFloat(wallet.balance) || 0;
      const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

      if (newBalance < 0) {
        alert('Insufficient wallet balance');
        return;
      }

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('customer_id', selectedCustomer.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          customer_id: selectedCustomer.id,
          type: type,
          amount: amount,
          description: walletDescription || `Admin ${type === 'credit' ? 'added' : 'deducted'} funds`,
          balance_after: newBalance
        });

      if (txError) throw txError;

      // Reload data
      await loadCustomers();
      await loadWalletTransactions(selectedCustomer.id);
      setWalletAmount('');
      setWalletDescription('');
      setWalletView('transactions');

      alert(`Successfully ${type === 'credit' ? 'added' : 'deducted'} ₹${amount.toFixed(2)}`);
    } catch (error) {
      console.error('Error processing wallet transaction:', error);
      alert('Failed to process wallet transaction');
    }
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
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Tax</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Invoice</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleCustomerClick(customer)}
                        className="text-left hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors w-full"
                      >
                        <div className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {customer.name}
                        </div>
                        {customer.alternative_phone && (
                          <div className="text-xs text-gray-500">Alt: {customer.alternative_phone}</div>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">{customer.email || 'N/A'}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{customer.phone}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleWalletClick(customer)}
                        className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg p-2 -m-2 transition-colors flex items-center gap-1"
                      >
                        <Wallet className="w-4 h-4" />
                        ₹{(customer.wallet_balance || 0).toFixed(2)}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={async () => {
                          try {
                            const newValue = !customer.tax_enabled;
                            const { error } = await supabase
                              .from('profiles')
                              .update({ tax_enabled: newValue })
                              .eq('id', customer.id);
                            if (error) throw error;
                            await loadCustomers();
                          } catch (error) {
                            console.error('Error updating tax setting:', error);
                            alert('Failed to update tax setting');
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          customer.tax_enabled !== false ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={customer.tax_enabled !== false ? 'Tax Enabled' : 'Tax Disabled'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            customer.tax_enabled !== false ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('profiles')
                              .update({ can_view_invoice: !customer.can_view_invoice })
                              .eq('id', customer.id);
                            if (error) throw error;
                            await loadCustomers();
                          } catch (error) {
                            console.error('Error toggling invoice access:', error);
                            alert('Failed to toggle invoice access');
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          customer.can_view_invoice ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                        title={customer.can_view_invoice ? 'Invoice Access Enabled' : 'Invoice Access Disabled'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            customer.can_view_invoice ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
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
                          onClick={() => handleDeleteClick(customer)}
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

      {showDeleteModal && deletingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Customer</h3>
            <p className="text-sm text-gray-600 mb-6">
              You are about to delete <span className="font-semibold">{deletingCustomer.name}</span>.
              Please choose what data to delete:
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="customer"
                  checked={deleteOption === 'customer'}
                  onChange={(e) => setDeleteOption(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Delete customer only</div>
                  <div className="text-xs text-gray-500">Keep all subscriptions and invoices</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="customer_invoices"
                  checked={deleteOption === 'customer_invoices'}
                  onChange={(e) => setDeleteOption(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Delete customer + all invoices</div>
                  <div className="text-xs text-gray-500">Keep subscriptions</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="customer_subscriptions"
                  checked={deleteOption === 'customer_subscriptions'}
                  onChange={(e) => setDeleteOption(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Delete customer + all subscriptions</div>
                  <div className="text-xs text-gray-500">Keep invoices</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-3 border border-red-200 rounded-lg cursor-pointer hover:bg-red-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="customer_all"
                  checked={deleteOption === 'customer_all'}
                  onChange={(e) => setDeleteOption(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-red-900">Delete everything</div>
                  <div className="text-xs text-red-600">Delete customer, subscriptions, and invoices</div>
                </div>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingCustomer(null);
                  setDeleteOption('customer');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full my-8">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Customer Profile
                </h3>
                <button
                  onClick={() => {
                    setShowCustomerDetails(false);
                    setSelectedCustomer(null);
                    setIsEditingDetails(false);
                    setShowPetForm(false);
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h4>
                  {!isEditingDetails ? (
                    <button
                      onClick={() => setIsEditingDetails(true)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCustomerDetails}
                        className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingDetails(false);
                          setEditedDetails({
                            name: selectedCustomer.name,
                            alternative_phone: selectedCustomer.alternative_phone || '',
                            delivery_address: selectedCustomer.delivery_address || '',
                          });
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Name</p>
                    {isEditingDetails ? (
                      <input
                        type="text"
                        value={editedDetails.name}
                        onChange={(e) => setEditedDetails({ ...editedDetails, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Alternative Phone</p>
                    {isEditingDetails ? (
                      <input
                        type="tel"
                        value={editedDetails.alternative_phone}
                        onChange={(e) => setEditedDetails({ ...editedDetails, alternative_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{selectedCustomer.alternative_phone || 'N/A'}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
                    {isEditingDetails ? (
                      <textarea
                        value={editedDetails.delivery_address}
                        onChange={(e) => setEditedDetails({ ...editedDetails, delivery_address: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{selectedCustomer.delivery_address || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Wallet Balance
                </h4>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-orange-600">
                    ₹{(selectedCustomer.wallet_balance || 0).toFixed(2)}
                  </p>
                  <button
                    onClick={() => {
                      handleWalletClick(selectedCustomer);
                      setShowCustomerDetails(false);
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Manage Wallet
                  </button>
                </div>
              </div>

              {/* Pets */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <PawPrint className="w-5 h-5" />
                    Pets ({customerPets.length})
                  </h4>
                  <button
                    onClick={handleAddPet}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Pet
                  </button>
                </div>
                {customerPets.length === 0 ? (
                  <p className="text-sm text-gray-600">No pets registered</p>
                ) : (
                  <div className="space-y-2">
                    {customerPets.map((pet) => (
                      <div key={pet.id} className="bg-white rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{pet.name}</p>
                            <p className="text-sm text-gray-600">{pet.breed} • {pet.age} years • {pet.weight}g</p>
                            {pet.medical_condition && (
                              <p className="text-xs text-gray-500 mt-1">Medical: {pet.medical_condition}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditPet(pet)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePet(pet.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subscriptions */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Subscriptions ({customerSubscriptions.length})
                </h4>
                {customerSubscriptions.length === 0 ? (
                  <p className="text-sm text-gray-600">No active subscriptions</p>
                ) : (
                  <div className="space-y-2">
                    {customerSubscriptions.map((sub: any) => (
                      <div key={sub.id} className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{sub.meal?.name}</p>
                            <p className="text-sm text-gray-600">
                              Pet: {sub.pet?.name} • {sub.quantity}g • ₹{sub.calculated_price}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            sub.status === 'active' ? 'bg-green-100 text-green-700' :
                            sub.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCustomerDetails(false)}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pet Form Modal */}
      {showPetForm && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <PawPrint className="w-5 h-5" />
                {editingPet ? 'Edit Pet' : 'Add New Pet'}
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pet Name *</label>
                  <input
                    type="text"
                    required
                    value={petFormData.name}
                    onChange={(e) => setPetFormData({ ...petFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breed *</label>
                  <input
                    type="text"
                    required
                    value={petFormData.breed}
                    onChange={(e) => setPetFormData({ ...petFormData, breed: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age (years) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={petFormData.age}
                    onChange={(e) => setPetFormData({ ...petFormData, age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={petFormData.weight}
                    onChange={(e) => setPetFormData({ ...petFormData, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Condition</label>
                <textarea
                  value={petFormData.medical_condition}
                  onChange={(e) => setPetFormData({ ...petFormData, medical_condition: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea
                  value={petFormData.special_instructions}
                  onChange={(e) => setPetFormData({ ...petFormData, special_instructions: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={handleSavePet}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                {editingPet ? 'Update Pet' : 'Add Pet'}
              </button>
              <button
                onClick={() => {
                  setShowPetForm(false);
                  setEditingPet(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showWalletModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="w-6 h-6 flex-shrink-0" />
                    <span>Wallet Management</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 truncate">{selectedCustomer.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowWalletModal(false);
                    setSelectedCustomer(null);
                    setWalletView('transactions');
                    setWalletAmount('');
                    setWalletDescription('');
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Current Balance */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white mb-6">
                <p className="text-sm opacity-90 mb-1">Current Balance</p>
                <p className="text-3xl md:text-4xl font-bold">₹{(selectedCustomer.wallet_balance || 0).toFixed(2)}</p>
              </div>

              {/* View Tabs */}
              <div className="flex space-x-2 mb-6">
                <button
                  onClick={() => setWalletView('transactions')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    walletView === 'transactions' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setWalletView('add')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    walletView === 'add' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Add Balance
                </button>
                <button
                  onClick={() => setWalletView('deduct')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    walletView === 'deduct' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Deduct Balance
                </button>
              </div>

              {/* Content */}
              <div className="max-h-96 overflow-y-auto">
                {walletView === 'transactions' && (
                  <div className="space-y-2">
                    {walletTransactions.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No transactions yet</p>
                    ) : (
                      walletTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                              {tx.type === 'credit' ? (
                                <ArrowUpCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <ArrowDownCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{tx.reason || 'No reason provided'}</p>
                              <p className="text-xs text-gray-500">
                                {tx.reference_type?.replace(/_/g, ' ')} • {new Date(tx.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type === 'credit' ? '+' : '-'}₹{(parseFloat(tx.amount) || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {walletView === 'add' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Add</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                      <textarea
                        value={walletDescription}
                        onChange={(e) => setWalletDescription(e.target.value)}
                        rows={3}
                        placeholder="Enter reason for adding balance..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <button
                      onClick={() => handleWalletTransaction('credit')}
                      className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                      Add ₹{walletAmount || '0.00'} to Wallet
                    </button>
                  </div>
                )}

                {walletView === 'deduct' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Deduct</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                      <textarea
                        value={walletDescription}
                        onChange={(e) => setWalletDescription(e.target.value)}
                        rows={3}
                        placeholder="Enter reason for deducting balance..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <button
                      onClick={() => handleWalletTransaction('debit')}
                      className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                      Deduct ₹{walletAmount || '0.00'} from Wallet
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
