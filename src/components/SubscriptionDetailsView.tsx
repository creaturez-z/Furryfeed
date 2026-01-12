import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar as CalendarIcon, FileText } from 'lucide-react';

interface DailyItem {
  id: string;
  delivery_date: string;
  meal_name: string;
  quantity: number;
  price: number;
  status?: string;
}

interface SubscriptionDetailsViewProps {
  subscriptionId: string;
  onClose: () => void;
  canViewInvoice?: boolean;
}

export function SubscriptionDetailsView({ subscriptionId, onClose, canViewInvoice = false }: SubscriptionDetailsViewProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [subscriptionId, selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          meal:meals(*),
          pet:pets(*)
        `)
        .eq('id', subscriptionId)
        .single();

      if (subError) throw subError;
      setSubscription(subData);

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: itemsData, error: itemsError } = await supabase
        .from('subscription_daily_items')
        .select(`
          id,
          delivery_date,
          quantity,
          price,
          meal:meals!inner(name)
        `)
        .eq('subscription_id', subscriptionId)
        .gte('delivery_date', firstDay)
        .lte('delivery_date', lastDay)
        .order('delivery_date', { ascending: true });

      if (itemsError) throw itemsError;

      const formatted: DailyItem[] = (itemsData || []).map((item: any) => ({
        id: item.id,
        delivery_date: item.delivery_date,
        meal_name: item.meal?.name || 'Unknown',
        quantity: item.quantity,
        price: item.price,
      }));

      setDailyItems(formatted);
    } catch (error) {
      console.error('Error loading subscription details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'skipped':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const groupByDate = () => {
    const grouped: { [date: string]: DailyItem[] } = {};
    dailyItems.forEach(item => {
      if (!grouped[item.delivery_date]) {
        grouped[item.delivery_date] = [];
      }
      grouped[item.delivery_date].push(item);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  const groupedItems = groupByDate();
  const dates = Object.keys(groupedItems).sort();
  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Subscription Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {subscription && (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pet</p>
                  <p className="font-semibold text-gray-900">{subscription.pet?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Meal</p>
                  <p className="font-semibold text-gray-900">{subscription.meal?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(subscription.status)}`}>
                    {subscription.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Daily Price</p>
                  <p className="font-semibold text-orange-600">₹{subscription.calculated_price?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5" />
              <span>Delivery Calendar - {monthName}</span>
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No deliveries scheduled for this month
                </div>
              ) : (
                dates.map(date => {
                  const items = groupedItems[date];
                  const dateObj = new Date(date + 'T00:00:00');
                  const isPast = dateObj < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={date}
                      className={`border rounded-lg p-4 ${isPast ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          {dateObj.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </h4>
                        <span className="text-sm font-medium text-orange-600">
                          ₹{items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div>
                              <p className="font-medium text-gray-900">{item.meal_name}</p>
                              <p className="text-gray-500">{item.quantity}g</p>
                            </div>
                            <p className="font-semibold text-gray-900">₹{item.price.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {canViewInvoice && (
            <div className="border-t pt-4">
              <button className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-medium">
                <FileText className="w-5 h-5" />
                <span>View Invoices</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
