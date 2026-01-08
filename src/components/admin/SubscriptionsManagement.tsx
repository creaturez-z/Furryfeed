import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Subscription, ProfileWithEmail, Pet, Meal } from '../../types/database';
import { Search, Play, Pause, XCircle, Eye } from 'lucide-react';

type SubscriptionWithDetails = Subscription & {
  customer?: ProfileWithEmail;
  pet?: Pet;
  meal?: Meal;
};

export function SubscriptionsManagement() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  useEffect(() => {
    let filtered = subscriptions;

    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          sub.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.meal?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    setFilteredSubscriptions(filtered);
  }, [searchTerm, statusFilter, subscriptions]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(
          `
          *,
          customer:profiles!subscriptions_customer_id_fkey(*),
          pet:pets(*),
          meal:meals(*)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
      setFilteredSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Subscription['status']) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'skipped':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleViewDetails = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
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
      <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, pet, or meal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="skipped">Skipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Customer</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Pet</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Meal</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Price</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{subscription.customer?.name}</div>
                      <div className="text-xs text-gray-500">{subscription.customer?.email || subscription.customer?.phone}</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">{subscription.pet?.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{subscription.meal?.name}</td>
                    <td className="py-4 px-6">
                      <span className="text-sm capitalize">{subscription.subscription_type}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-orange-600">
                        ₹{subscription.calculated_price.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          subscription.status
                        )}`}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(subscription)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {subscription.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(subscription.id, 'paused')}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                            title="Pause"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {subscription.status === 'paused' && (
                          <button
                            onClick={() => handleStatusChange(subscription.id, 'active')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Resume"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {(subscription.status === 'active' || subscription.status === 'paused') && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  'Are you sure you want to cancel this subscription? This action cannot be undone.'
                                )
                              ) {
                                handleStatusChange(subscription.id, 'cancelled');
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetailsModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Subscription Details</h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSubscription(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer</p>
                    <p className="font-medium text-gray-900">{selectedSubscription.customer?.name}</p>
                    <p className="text-sm text-gray-600">{selectedSubscription.customer?.email || 'No email'}</p>
                    <p className="text-sm text-gray-600">{selectedSubscription.customer?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pet</p>
                    <p className="font-medium text-gray-900">{selectedSubscription.pet?.name}</p>
                    <p className="text-sm text-gray-600">
                      {selectedSubscription.pet?.breed} • {selectedSubscription.pet?.weight}kg
                    </p>
                    <p className="text-sm text-gray-600">{selectedSubscription.pet?.age} years old</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Meal</p>
                  <div className="flex items-center space-x-4">
                    {selectedSubscription.meal?.image_url && (
                      <img
                        src={selectedSubscription.meal.image_url}
                        alt={selectedSubscription.meal.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{selectedSubscription.meal?.name}</p>
                      <p className="text-sm text-gray-600">{selectedSubscription.meal?.description}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Subscription Type</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedSubscription.subscription_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Quantity</p>
                    <p className="font-medium text-gray-900">{selectedSubscription.quantity}g per day</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Daily Price</p>
                    <p className="font-medium text-orange-600">₹{selectedSubscription.calculated_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                        selectedSubscription.status
                      )}`}
                    >
                      {selectedSubscription.status}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Start Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedSubscription.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedSubscription.end_date && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">End Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedSubscription.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSubscription.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
