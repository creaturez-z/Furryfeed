import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, WalletTransaction, Profile } from '../types/database';
import { ensureWalletExists, creditWallet } from '../utils/wallet';
import { ArrowLeft, Wallet as WalletIcon, Plus, ArrowUpCircle, ArrowDownCircle, Package } from 'lucide-react';
import { WhatsAppBubble } from '../components/WhatsAppBubble';
import { AnnouncementBar } from '../components/AnnouncementBar';

export function CustomerWallet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<(WalletTransaction & { admin?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    if (!user) return;

    try {
      const walletData = await ensureWalletExists(user.id);
      setWallet(walletData);
      await loadTransactions();
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          admin:profiles!wallet_transactions_admin_id_fkey(id, name)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rechargeAmount <= 0) return;

    try {
      await creditWallet(
        user.id,
        rechargeAmount,
        'Wallet recharge',
        'recharge'
      );

      setRechargeAmount(100);
      setShowRechargeForm(false);
      await loadWalletData();
      alert('Wallet recharged successfully!');
    } catch (error) {
      console.error('Error recharging wallet:', error);
      alert('Failed to recharge wallet');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AnnouncementBar />
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">My Wallet</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-xl p-8 text-white mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <WalletIcon className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Wallet Balance</h2>
          </div>
          <p className="text-5xl font-bold mb-6">₹{wallet?.balance.toFixed(2) || '0.00'}</p>

          {!showRechargeForm && (
            <button
              onClick={() => setShowRechargeForm(true)}
              className="bg-white text-orange-500 px-8 py-3 rounded-xl font-semibold hover:bg-orange-50 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Money</span>
            </button>
          )}

          {showRechargeForm && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <form onSubmit={handleRecharge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recharge Amount (₹)</label>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(parseFloat(e.target.value))}
                    required
                    min="1"
                    step="1"
                    className="w-full px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-white"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 200, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setRechargeAmount(amount)}
                      className="bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-white text-orange-500 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                  >
                    Recharge ₹{rechargeAmount}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRechargeForm(false)}
                    className="px-6 bg-white/10 hover:bg-white/20 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h3>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <WalletIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'credit'
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}>
                        {transaction.type === 'credit' ? (
                          <ArrowUpCircle className={`w-5 h-5 text-green-600`} />
                        ) : (
                          <ArrowDownCircle className={`w-5 h-5 text-red-600`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900">{transaction.reason}</p>
                          {transaction.reference_type === 'subscription_charge' && (
                            <Package className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                        <span className="inline-block mt-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {transaction.reference_type.replace('_', ' ')}
                        </span>
                        {transaction.admin && (
                          <p className="text-xs text-gray-500 mt-1">By: {transaction.admin.name}</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      transaction.type === 'credit'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <WhatsAppBubble pageType="customer" />
    </div>
  );
}
