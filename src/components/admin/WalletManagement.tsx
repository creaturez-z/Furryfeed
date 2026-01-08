import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, WalletTransaction } from '../../types/database';
import { Search, Plus, Minus, History } from 'lucide-react';

export function WalletManagement() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'credit' as 'credit' | 'debit',
    reason: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('full_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleSelectCustomer = async (customer: Profile) => {
    setSelectedCustomer(customer);
    await loadTransactions(customer.id);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const amount = parseFloat(formData.amount);
      const newBalance =
        formData.type === 'credit'
          ? selectedCustomer.wallet_balance + amount
          : selectedCustomer.wallet_balance - amount;

      if (newBalance < 0) {
        alert('Insufficient balance for debit transaction');
        return;
      }

      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedCustomer.id);

      if (walletError) throw walletError;

      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert([
          {
            customer_id: selectedCustomer.id,
            type: formData.type,
            amount: amount,
            description: formData.reason,
            balance_after: newBalance,
          },
        ]);

      if (transactionError) throw transactionError;

      setFormData({ amount: '', type: 'credit', reason: '' });
      setShowTransactionForm(false);

      const { data: updatedCustomer } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedCustomer.id)
        .single();

      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
        setCustomers((prev) =>
          prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
        );
      }

      await loadTransactions(selectedCustomer.id);
    } catch (error) {
      console.error('Error processing transaction:', error);
      alert('Failed to process transaction');
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Customers</h3>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelectCustomer(customer)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedCustomer?.id === customer.id
                  ? 'bg-orange-50 border-orange-500'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900">{customer.full_name}</div>
              <div className="text-xs text-gray-600">{customer.email}</div>
              <div className="text-sm font-semibold text-orange-600 mt-1">
                ₹{customer.wallet_balance.toFixed(2)}
              </div>
            </button>
          ))}
          {filteredCustomers.length === 0 && (
            <p className="text-gray-500 text-center py-4">No customers found</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {selectedCustomer ? (
          <>
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedCustomer.full_name}</h3>
                  <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Wallet Balance</p>
                  <p className="text-3xl font-bold text-orange-500">
                    ₹{selectedCustomer.wallet_balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {!showTransactionForm ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setFormData({ ...formData, type: 'credit' });
                      setShowTransactionForm(true);
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Money</span>
                  </button>
                  <button
                    onClick={() => {
                      setFormData({ ...formData, type: 'debit' });
                      setShowTransactionForm(true);
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                    <span>Deduct Money</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTransaction} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason *
                    </label>
                    <textarea
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Reason for this transaction"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className={`flex-1 py-3 rounded-lg font-medium text-white transition-colors ${
                        formData.type === 'credit'
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {formData.type === 'credit' ? 'Add Money' : 'Deduct Money'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransactionForm(false);
                        setFormData({ amount: '', type: 'credit', reason: '' });
                      }}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-2 mb-4">
                <History className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No transactions yet</p>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {transaction.type === 'credit' ? (
                            <Plus className="w-4 h-4 text-green-600" />
                          ) : (
                            <Minus className="w-4 h-4 text-red-600" />
                          )}
                          <span
                            className={`font-semibold ${
                              transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.type === 'credit' ? '+' : '-'}₹
                            {transaction.amount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{transaction.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Balance: ₹{transaction.balance_after.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500">Select a customer to manage their wallet</p>
          </div>
        )}
      </div>
    </div>
  );
}
