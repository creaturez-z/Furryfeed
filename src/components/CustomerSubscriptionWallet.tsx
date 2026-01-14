import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WalletTransaction {
  id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  description: string;
  balance_after: number;
  created_at: string;
}

export function CustomerSubscriptionWallet() {
  const { profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadWalletData();
    }
  }, [profile]);

  const loadWalletData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data: wallet, error: walletError } = await supabase
        .from('subscription_wallets')
        .select('balance')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (walletError) throw walletError;

      setBalance(wallet?.balance || 0);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('subscription_wallet_transactions')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Wallet className="w-6 h-6 text-orange-500" />
          <span>Subscription Wallet</span>
        </h2>
        <button
          onClick={loadWalletData}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium mb-1">Current Balance</p>
                <p className="text-4xl font-bold text-orange-900">₹{balance.toFixed(2)}</p>
                <p className="text-sm text-orange-600 mt-2">
                  Used for daily meal deductions
                </p>
              </div>
              <Wallet className="w-16 h-16 text-orange-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            </div>
            <div className="p-6">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {transaction.transaction_type === 'credit' ? (
                            <div className="p-2 bg-green-100 rounded-lg">
                              <ArrowUpCircle className="w-5 h-5 text-green-600" />
                            </div>
                          ) : (
                            <div className="p-2 bg-red-100 rounded-lg">
                              <ArrowDownCircle className="w-5 h-5 text-red-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {transaction.transaction_type === 'credit' ? 'Credit' : 'Debit'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                            <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(transaction.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.transaction_type === 'credit' ? '+' : '-'}₹
                            {transaction.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Balance: ₹{transaction.balance_after.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
