import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar as CalendarIcon, Check } from 'lucide-react';

interface DailyItem {
  id: string;
  delivery_date: string;
  meal_id: string;
  meal_name: string;
  quantity: number;
  price: number;
  status?: string;
}

interface SubscriptionCalendarViewProps {
  subscriptionId: string;
  onClose: () => void;
  onUpdate: () => void;
  isAdmin?: boolean;
}

export function SubscriptionCalendarView({ subscriptionId, onClose, onUpdate, isAdmin = false }: SubscriptionCalendarViewProps) {
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [action, setAction] = useState<'pause' | 'skip' | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDailyItems();
  }, [subscriptionId]);

  const loadDailyItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_daily_items')
        .select(`
          id,
          delivery_date,
          quantity,
          price,
          meal:meals!inner(id, name)
        `)
        .eq('subscription_id', subscriptionId)
        .gte('delivery_date', new Date().toISOString().split('T')[0])
        .order('delivery_date', { ascending: true });

      if (error) throw error;

      const formatted: DailyItem[] = (data || []).map((item: any) => ({
        id: item.id,
        delivery_date: item.delivery_date,
        meal_id: item.meal?.id || '',
        meal_name: item.meal?.name || 'Unknown',
        quantity: item.quantity,
        price: item.price,
      }));

      setDailyItems(formatted);
    } catch (error) {
      console.error('Error loading daily items:', error);
    } finally {
      setLoading(false);
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

  const toggleDate = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const handlePauseSkip = async () => {
    if (!action || selectedDates.length === 0) return;

    setProcessing(true);
    try {
      const itemsToUpdate = dailyItems.filter(item => selectedDates.includes(item.delivery_date));

      if (action === 'skip') {
        for (const item of itemsToUpdate) {
          const { error } = await supabase
            .from('subscription_daily_items')
            .delete()
            .eq('id', item.id);

          if (error) throw error;
        }
      } else if (action === 'pause') {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'paused' })
          .eq('id', subscriptionId);

        if (error) throw error;
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Failed to update subscription');
    } finally {
      setProcessing(false);
    }
  };

  const groupedItems = groupByDate();
  const dates = Object.keys(groupedItems).sort();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6" />
            <span>Subscription Calendar</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedDates.length > 0 ? `${selectedDates.length} date(s) selected` : 'Select dates to pause or skip'}
            </p>
            {selectedDates.length > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setAction('skip');
                    handlePauseSkip();
                  }}
                  disabled={processing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Skip Selected Dates
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setAction('pause');
                      handlePauseSkip();
                    }}
                    disabled={processing}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    Pause Subscription
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {dates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No upcoming deliveries found
              </div>
            ) : (
              dates.map(date => {
                const items = groupedItems[date];
                const isSelected = selectedDates.includes(date);
                const dateObj = new Date(date + 'T00:00:00');

                return (
                  <div
                    key={date}
                    onClick={() => toggleDate(date)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <h3 className="font-semibold text-gray-900">
                          {dateObj.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h3>
                      </div>
                      <span className="text-sm font-medium text-orange-600">
                        ₹{items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2 ml-9">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{item.meal_name}</p>
                            <p className="text-sm text-gray-500">{item.quantity}g</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">₹{item.price.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Click on dates to select them for pause/skip actions
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
