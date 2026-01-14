import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Wallet, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

interface SubscriptionWalletViewerProps {
  profileId: string;
  customerName: string;
  onClose: () => void;
}

interface WalletTransaction {
  id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  description: string;
  balance_after: number;
  created_at: string;
}

export function SubscriptionWalletViewer({ profileId, customerName, onClose }: SubscriptionWalletViewerProps) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, [profileId]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const { data: wallet, error: walletError } = await supabase
        .from('subscription_wallets')
        .select('balance')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (walletError) throw walletError;

      setBalance(wallet?.balance || 0);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('subscription_wallet_transactions')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <Wallet className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Subscription Wallet</h2>
              <p className="text-orange-100 text-sm">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium mb-1">Current Balance</p>
                  <p className="text-4xl font-bold text-orange-900">₹{balance.toFixed(2)}</p>
                </div>
                <Wallet className="w-16 h-16 text-orange-400 opacity-50" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
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
        )}
      </div>
    </div>
  );
}
