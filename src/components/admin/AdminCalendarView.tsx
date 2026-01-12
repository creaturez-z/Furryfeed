import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarSubscription {
  id: string;
  customer_name: string;
  pet_name: string;
  meal_name: string;
  status: string;
  delivery_date: string;
  quantity: number;
  price: number;
}

export function AdminCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyItems, setDailyItems] = useState<CalendarSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthData();
  }, [currentDate]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('subscription_daily_items')
        .select(`
          id,
          delivery_date,
          quantity,
          price,
          subscription:subscriptions!inner(
            status,
            customer:profiles!subscriptions_customer_id_fkey(name)
          ),
          pet:pets!inner(name),
          meal:meals!inner(name)
        `)
        .gte('delivery_date', firstDay)
        .lte('delivery_date', lastDay)
        .order('delivery_date', { ascending: true });

      if (error) throw error;

      const formatted: CalendarSubscription[] = (data || []).map((item: any) => ({
        id: item.id,
        customer_name: item.subscription?.customer?.name || 'Unknown',
        pet_name: item.pet?.name || 'Unknown',
        meal_name: item.meal?.name || 'Unknown',
        status: item.subscription?.status || 'active',
        delivery_date: item.delivery_date,
        quantity: item.quantity,
        price: item.price,
      }));

      setDailyItems(formatted);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getItemsForDate = (day: number) => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    ).toISOString().split('T')[0];

    return dailyItems.filter(item => item.delivery_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'paused':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'skipped':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Calendar className="w-6 h-6" />
          <span>Subscription Calendar</span>
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const items = getItemsForDate(day);
            const today = new Date();
            const isToday =
              day === today.getDate() &&
              currentDate.getMonth() === today.getMonth() &&
              currentDate.getFullYear() === today.getFullYear();

            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 ${
                  isToday ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <div className="text-sm font-semibold text-gray-700 mb-1">{day}</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`text-xs px-2 py-1 rounded border ${getStatusColor(item.status)}`}
                      title={`${item.customer_name} - ${item.pet_name} - ${item.meal_name}`}
                    >
                      <div className="truncate font-medium">{item.customer_name}</div>
                      <div className="truncate text-xs opacity-80">{item.pet_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Status Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300"></div>
            <span className="text-sm text-gray-700">Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-300"></div>
            <span className="text-sm text-gray-700">Paused</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-300"></div>
            <span className="text-sm text-gray-700">Skipped</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-300"></div>
            <span className="text-sm text-gray-700">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
