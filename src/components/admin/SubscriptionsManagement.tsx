import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Subscription, ProfileWithEmail, Pet, Meal } from '../../types/database';
import { Search, Play, Pause, XCircle, Eye, Calendar, Plus, FileText, User, PawPrint, Edit } from 'lucide-react';
import { CreateSubscriptionModal } from './CreateSubscriptionModal';
import { SubscriptionCalendarView } from '../SubscriptionCalendarView';
import { InvoiceModal } from '../InvoiceModal';
import { ProfileForm } from '../ProfileForm';
import { PetForm } from '../PetForm';

type SubscriptionWithDetails = Subscription & {
  customer?: ProfileWithEmail;
  pet?: Pet;
  meal?: Meal;
  duration?: {
    totalDays: number;
    mealsPerDay: number | 'multiple';
    monthlyBreakdown?: { month: string; days: number }[];
  };
};

export function SubscriptionsManagement() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ProfileWithEmail | null>(null);
  const [customerPets, setCustomerPets] = useState<Pet[]>([]);
  const [showPetModal, setShowPetModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

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

    if (startDate) {
      filtered = filtered.filter((sub) => sub.start_date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((sub) => sub.start_date <= endDate);
    }

    setFilteredSubscriptions(filtered);
  }, [searchTerm, statusFilter, startDate, endDate, subscriptions]);

  const calculateDuration = async (subscriptionId: string) => {
    try {
      const { data: dailyItems, error } = await supabase
        .from('subscription_daily_items')
        .select('delivery_date')
        .eq('subscription_id', subscriptionId);

      if (error || !dailyItems || dailyItems.length === 0) {
        return { totalDays: 0, mealsPerDay: 0 };
      }

      const uniqueDates = [...new Set(dailyItems.map(item => item.delivery_date))];
      const totalDays = uniqueDates.length;

      const mealsPerDayMap = new Map<string, number>();
      dailyItems.forEach(item => {
        const count = mealsPerDayMap.get(item.delivery_date) || 0;
        mealsPerDayMap.set(item.delivery_date, count + 1);
      });

      const mealCounts = Array.from(mealsPerDayMap.values());
      const allSame = mealCounts.every(count => count === mealCounts[0]);
      const mealsPerDay = allSame ? mealCounts[0] : 'multiple';

      const monthlyBreakdown: { month: string; days: number }[] = [];
      const monthMap = new Map<string, Set<string>>();

      uniqueDates.forEach(date => {
        const dateObj = new Date(date);
        const monthKey = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, new Set());
        }
        monthMap.get(monthKey)!.add(date);
      });

      monthMap.forEach((dates, month) => {
        monthlyBreakdown.push({ month, days: dates.size });
      });

      return {
        totalDays,
        mealsPerDay,
        monthlyBreakdown: monthlyBreakdown.length > 1 ? monthlyBreakdown : undefined,
      };
    } catch (error) {
      console.error('Error calculating duration:', error);
      return { totalDays: 0, mealsPerDay: 0 };
    }
  };

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

      const subscriptionsWithDuration = await Promise.all(
        (data || []).map(async (sub) => ({
          ...sub,
          duration: await calculateDuration(sub.id),
        }))
      );

      setSubscriptions(subscriptionsWithDuration);
      setFilteredSubscriptions(subscriptionsWithDuration);
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

  const getPaymentStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleViewDetails = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  const handleCustomerClick = async (customer: ProfileWithEmail) => {
    setSelectedCustomer(customer);
    try {
      const { data: pets } = await supabase
        .from('pets')
        .select('*')
        .eq('customer_id', customer.id);
      setCustomerPets(pets || []);
    } catch (error) {
      console.error('Error loading customer pets:', error);
    }
    setShowCustomerModal(true);
  };

  const handlePetClick = (pet: Pet) => {
    setSelectedPet(pet);
    setShowPetModal(true);
  };

  const handlePriceClick = async (subscriptionId: string) => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('id')
        .eq('subscription_id', subscriptionId)
        .limit(1)
        .maybeSingle();

      if (data) {
        setInvoiceId(data.id);
        setShowInvoice(true);
      } else {
        alert('No invoice found for this subscription');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Failed to load invoice');
    }
  };

  const handleDurationClick = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setShowCalendarView(true);
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
        <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Subscription</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
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
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Duration</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Price</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Payment</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <button
                        onClick={() => subscription.customer && handleCustomerClick(subscription.customer)}
                        className="text-left hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors w-full"
                      >
                        <div className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {subscription.customer?.name}
                        </div>
                        <div className="text-xs text-gray-500">{subscription.customer?.email || subscription.customer?.phone}</div>
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => subscription.pet && handlePetClick(subscription.pet)}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors flex items-center gap-1"
                      >
                        <PawPrint className="w-4 h-4" />
                        {subscription.pet?.name}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">{subscription.meal?.name}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleDurationClick(subscription)}
                        className="text-left hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors"
                      >
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {subscription.duration?.totalDays || 0} days
                        </div>
                        <div className="text-xs text-gray-500">
                          {subscription.duration?.mealsPerDay === 'multiple'
                            ? 'multiple meals'
                            : `${subscription.duration?.mealsPerDay || 0} meal${(subscription.duration?.mealsPerDay || 0) > 1 ? 's' : ''}/day`}
                        </div>
                        {subscription.duration?.monthlyBreakdown && (
                          <div className="text-xs text-gray-400 mt-1">
                            {subscription.duration.monthlyBreakdown.map((mb, idx) => (
                              <div key={idx}>{mb.month}: {mb.days} days</div>
                            ))}
                          </div>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handlePriceClick(subscription.id)}
                        className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg p-2 -m-2 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        ₹{subscription.calculated_price.toFixed(2)}
                      </button>
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
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getPaymentStatusColor(
                          (subscription as any).payment_status
                        )}`}
                      >
                        {(subscription as any).payment_status ?
                          (subscription as any).payment_status.replace('_', ' ') :
                          'paid'}
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
                        <button
                          onClick={async () => {
                            const { data } = await supabase
                              .from('invoices')
                              .select('id')
                              .eq('subscription_id', subscription.id)
                              .limit(1)
                              .maybeSingle();

                            if (data) {
                              setInvoiceId(data.id);
                              setShowInvoice(true);
                            } else {
                              alert('No invoice found for this subscription');
                            }
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="View Invoice"
                        >
                          <FileText className="w-4 h-4" />
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
                              setSubscriptionToCancel(subscription.id);
                              setShowCancelModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {subscription.status === 'cancelled' && (
                          <button
                            onClick={() => handleStatusChange(subscription.id, 'active')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Reactivate"
                          >
                            <Play className="w-4 h-4" />
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
                      {selectedSubscription.pet?.breed} • {selectedSubscription.pet?.weight ? (selectedSubscription.pet.weight / 1000).toFixed(2) : 0}kg
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

                <div className="border-t pt-4 flex space-x-3">
                  <button
                    onClick={() => {
                      setShowCalendarView(true);
                      setShowDetailsModal(false);
                    }}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Manage Calendar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateSubscriptionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSubscriptions();
          }}
        />
      )}

      {showCalendarView && selectedSubscription && (
        <SubscriptionCalendarView
          subscriptionId={selectedSubscription.id}
          onClose={() => {
            setShowCalendarView(false);
            setShowDetailsModal(true);
          }}
          onUpdate={() => {
            loadSubscriptions();
            setShowCalendarView(false);
          }}
          isAdmin={true}
        />
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this subscription? This action will prevent future deliveries.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (subscriptionToCancel) {
                    handleStatusChange(subscriptionToCancel, 'cancelled');
                  }
                  setShowCancelModal(false);
                  setSubscriptionToCancel(null);
                }}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSubscriptionToCancel(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                No, Keep It
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoice && invoiceId && (
        <InvoiceModal invoiceId={invoiceId} onClose={() => setShowInvoice(false)} />
      )}

      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Customer Details</h3>
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setSelectedCustomer(null);
                    setCustomerPets([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Profile Information
                    </h4>
                  </div>
                  <ProfileForm
                    profile={selectedCustomer}
                    onUpdate={async () => {
                      await loadSubscriptions();
                      setShowCustomerModal(false);
                      setSelectedCustomer(null);
                    }}
                    isAdmin={true}
                  />
                </div>

                {customerPets.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <PawPrint className="w-5 h-5" />
                      Pets ({customerPets.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customerPets.map((pet) => (
                        <div key={pet.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{pet.name}</p>
                              <p className="text-sm text-gray-600">{pet.breed}</p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPet(pet);
                                setShowCustomerModal(false);
                                setShowPetModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Age: {pet.age} years</p>
                            <p>Weight: {pet.weight ? (pet.weight / 1000).toFixed(2) : 0}kg</p>
                            {pet.medical_conditions && (
                              <p className="text-xs text-red-600">Medical: {pet.medical_conditions}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPetModal && selectedPet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <PawPrint className="w-6 h-6" />
                  Edit Pet Profile
                </h3>
                <button
                  onClick={() => {
                    setShowPetModal(false);
                    setSelectedPet(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <PetForm
                pet={selectedPet}
                onUpdate={async () => {
                  await loadSubscriptions();
                  setShowPetModal(false);
                  setSelectedPet(null);
                }}
                isAdmin={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
