import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock, Eye, User, Calendar, DollarSign } from 'lucide-react';
import { generateInvoiceForSubscription } from '../../utils/invoiceGenerator';

interface ManualPaymentTransaction {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  utr_number: string | null;
  screenshot_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  };
  subscriptions: {
    id: string;
    status: string;
  } | null;
}

export default function ManualPaymentVerification() {
  const [transactions, setTransactions] = useState<ManualPaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedTransaction, setSelectedTransaction] = useState<ManualPaymentTransaction | null>(
    null
  );
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('manual_payment_transactions')
        .select(
          `
          *,
          profiles:user_id(name, email),
          subscriptions(id, status)
        `
        )
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transactionId: string) => {
    if (!confirm('Are you sure you want to approve this payment?')) return;

    try {
      setProcessing(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('approve_manual_payment', {
        p_transaction_id: transactionId,
        p_admin_id: userData.user.id,
        p_admin_notes: actionNotes || null,
      });

      if (error) throw error;

      if (data?.success) {
        if (data.subscription_id) {
          try {
            await generateInvoiceForSubscription(data.subscription_id, selectedTransaction?.user_id);
          } catch (invoiceError) {
            console.error('Invoice generation error:', invoiceError);
          }
        }

        let successMessage = 'Payment approved successfully!\n\n';
        successMessage += `Amount Credited: ₹${data.amount_credited?.toFixed(2) || '0.00'}\n`;

        if (data.subscription_id && data.subscription_amount_deducted) {
          successMessage += `Subscription Charge: ₹${data.subscription_amount_deducted.toFixed(2)}\n`;
          successMessage += `Final Wallet Balance: ₹${data.final_wallet_balance.toFixed(2)}\n\n`;
          successMessage += 'Subscription activated and invoice generated.';
        } else {
          successMessage += `Final Wallet Balance: ₹${data.final_wallet_balance?.toFixed(2) || '0.00'}`;
        }

        alert(successMessage);
        setSelectedTransaction(null);
        setActionNotes('');
        loadTransactions();
      } else {
        throw new Error(data?.error || 'Failed to approve payment');
      }
    } catch (error: any) {
      console.error('Error approving payment:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!actionNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!confirm('Are you sure you want to reject this payment?')) return;

    try {
      setProcessing(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('reject_manual_payment', {
        p_transaction_id: transactionId,
        p_admin_id: userData.user.id,
        p_admin_notes: actionNotes,
      });

      if (error) throw error;

      if (data?.success) {
        alert('Payment rejected.');
        setSelectedTransaction(null);
        setActionNotes('');
        loadTransactions();
      } else {
        throw new Error(data?.error || 'Failed to reject payment');
      }
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manual Payment Verification</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-orange-600 font-medium mt-1">
              {pendingCount} payment{pendingCount !== 1 ? 's' : ''} awaiting review
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 flex space-x-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No transactions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  UTR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.profiles?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{transaction.profiles?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-gray-900">
                        ₹{transaction.amount.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {transaction.utr_number || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="flex items-center space-x-1 text-orange-600 hover:text-orange-700 font-medium text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
                <button
                  onClick={() => {
                    setSelectedTransaction(null);
                    setActionNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Customer Name</label>
                    <p className="font-medium">{selectedTransaction.profiles?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p className="font-medium text-sm">{selectedTransaction.profiles?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Amount</label>
                    <p className="font-medium text-green-600 text-lg">
                      ₹{selectedTransaction.amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">UTR Number</label>
                    <p className="font-medium">{selectedTransaction.utr_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Submitted On</label>
                    <p className="font-medium">
                      {new Date(selectedTransaction.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedTransaction.screenshot_url && (
                  <div>
                    <label className="text-sm text-gray-500 block mb-2">Payment Screenshot</label>
                    <img
                      src={selectedTransaction.screenshot_url}
                      alt="Payment proof"
                      className="w-full max-w-md border rounded-lg"
                    />
                  </div>
                )}

                {selectedTransaction.admin_notes && (
                  <div>
                    <label className="text-sm text-gray-500">Admin Notes</label>
                    <p className="font-medium text-gray-700">{selectedTransaction.admin_notes}</p>
                  </div>
                )}
              </div>

              {selectedTransaction.status === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional for approval, Required for rejection)
                    </label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Add any notes about this transaction..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleApprove(selectedTransaction.id)}
                      disabled={processing}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>{processing ? 'Processing...' : 'Approve & Add to Wallet'}</span>
                    </button>
                    <button
                      onClick={() => handleReject(selectedTransaction.id)}
                      disabled={processing}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>{processing ? 'Processing...' : 'Reject Payment'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
