import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Filter, Package } from 'lucide-react';

interface OrderWithDetails {
  id: string;
  customer_name: string;
  pet_name: string;
  delivery_address: string;
  meal_name: string;
  quantity: number;
  total_amount: number;
  scheduled_date: string;
  status: string;
  created_at: string;
}

interface DailySummary {
  date: string;
  orders: OrderWithDetails[];
  totalQuantity: { [mealName: string]: number };
  totalOrders: number;
  totalAmount: number;
}

export function OrdersDashboard() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [startDate, endDate]);

  const loadOrders = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          total_amount,
          delivery_address,
          scheduled_date,
          status,
          created_at,
          customer:profiles!orders_customer_id_fkey(name),
          pet:pets!orders_pet_id_fkey(name),
          meal:meals!orders_meal_id_fkey(name)
        `)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const formattedOrders: OrderWithDetails[] = (data || []).map((order: any) => ({
        id: order.id,
        customer_name: order.customer?.name || 'Unknown',
        pet_name: order.pet?.name || 'Unknown',
        delivery_address: order.delivery_address || 'N/A',
        meal_name: order.meal?.name || 'Unknown',
        quantity: order.quantity,
        total_amount: order.total_amount,
        scheduled_date: order.scheduled_date,
        status: order.status,
        created_at: order.created_at,
      }));

      setOrders(formattedOrders);
    } catch (error: any) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupOrdersByDate = (): DailySummary[] => {
    const grouped: { [date: string]: DailySummary } = {};

    orders.forEach(order => {
      if (!grouped[order.scheduled_date]) {
        grouped[order.scheduled_date] = {
          date: order.scheduled_date,
          orders: [],
          totalQuantity: {},
          totalOrders: 0,
          totalAmount: 0,
        };
      }

      const summary = grouped[order.scheduled_date];
      summary.orders.push(order);
      summary.totalOrders++;
      summary.totalAmount += Number(order.total_amount);

      if (!summary.totalQuantity[order.meal_name]) {
        summary.totalQuantity[order.meal_name] = 0;
      }
      summary.totalQuantity[order.meal_name] += order.quantity;
    });

    return Object.values(grouped);
  };

  const dailySummaries = groupOrdersByDate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">View and manage orders by date</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {dailySummaries.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No orders found for the selected date range</p>
        </div>
      ) : (
        <div className="space-y-8">
          {dailySummaries.map(summary => (
            <div key={summary.date} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-200">
                <Calendar className="w-6 h-6 text-orange-500" />
                <h3 className="text-xl font-bold text-gray-900">
                  {new Date(summary.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pet</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.customer_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.pet_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.meal_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{order.quantity}g</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{order.delivery_address}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">₹{Number(order.total_amount).toFixed(2)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-3">Daily Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-orange-700 mb-2">Items to Prepare:</p>
                    {Object.entries(summary.totalQuantity).map(([mealName, qty]) => (
                      <p key={mealName} className="text-sm text-orange-900 font-medium">
                        {mealName}: {qty}g
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm text-orange-700">Total Orders</p>
                    <p className="text-2xl font-bold text-orange-900">{summary.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-700">Total Amount</p>
                    <p className="text-2xl font-bold text-orange-900">₹{summary.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
