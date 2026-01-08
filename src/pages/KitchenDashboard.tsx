import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Order, Meal, Pet } from '../types/database';
import { ArrowLeft, LogOut, CheckCircle, Package } from 'lucide-react';

type OrderWithDetails = Order & {
  meal?: Meal;
  pet?: Pet;
};

export function KitchenDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: staffData } = await supabase
        .from('kitchen_staff')
        .select('kitchen_id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!staffData) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          meal:meals(*),
          pet:pets(*)
        `)
        .eq('kitchen_id', staffData.kitchen_id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      await loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupOrdersByMeal = () => {
    const grouped = new Map<string, { meal: Meal; totalQuantity: number; orders: OrderWithDetails[] }>();

    orders.forEach(order => {
      if (!order.meal) return;

      const key = order.meal.id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          meal: order.meal,
          totalQuantity: 0,
          orders: [],
        });
      }

      const group = grouped.get(key)!;
      group.totalQuantity += order.quantity;
      group.orders.push(order);
    });

    return Array.from(grouped.values());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Home</span>
              </button>
              <h1 className="text-xl font-bold text-gray-900">Kitchen Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {profile?.name}!</h2>
          <p className="text-gray-600">Manage your assigned orders and prepare meals</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Package className="w-6 h-6 text-orange-500" />
                <span>Ingredients Summary</span>
              </h3>
              {groupOrdersByMeal().length === 0 ? (
                <p className="text-gray-500">No orders to prepare</p>
              ) : (
                <div className="space-y-4">
                  {groupOrdersByMeal().map((group) => (
                    <div key={group.meal.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <img
                          src={group.meal.image_url}
                          alt={group.meal.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{group.meal.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">Total Servings: {group.totalQuantity}</p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Ingredients:</p>
                            <p className="text-sm text-gray-600">{group.meal.ingredients}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Orders</h3>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No orders assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <img
                            src={order.meal?.image_url}
                            alt={order.meal?.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{order.meal?.name}</h4>
                            <p className="text-sm text-gray-600">Pet: {order.pet?.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                            <p className="text-sm text-gray-600">Scheduled: {new Date(order.scheduled_date).toLocaleDateString()}</p>
                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'preparing')}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              Start Preparing
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'ready')}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Mark as Ready</span>
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <div className="text-center text-green-600 font-medium">
                              Ready for Delivery
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
