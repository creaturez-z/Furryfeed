import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Order, Meal, Pet, Profile, MealIngredient } from '../types/database';
import { ArrowLeft, LogOut, CheckCircle, Package, Calendar, ChefHat } from 'lucide-react';

type OrderWithDetails = Order & {
  meal?: Meal;
  pet?: Pet;
  customer?: Profile;
};

type IngredientSummary = {
  name: string;
  totalQuantity: number;
  unit: string;
};

export function KitchenDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'ingredients'>('orders');
  const [ingredients, setIngredients] = useState<IngredientSummary[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({
    start: today,
    end: today,
  });

  useEffect(() => {
    loadOrders();
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'ingredients') {
      calculateIngredients();
    }
  }, [activeTab, orders]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: staffData } = await supabase
        .from('kitchen_staff')
        .select('kitchen_id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!staffData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          meal:meals(*),
          pet:pets(*),
          customer:profiles!orders_customer_id_fkey(*)
        `)
        .eq('kitchen_id', staffData.kitchen_id)
        .gte('scheduled_date', dateRange.start)
        .lte('scheduled_date', dateRange.end)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateIngredients = async () => {
    try {
      const mealIds = [...new Set(orders.map(order => order.meal_id))];
      if (mealIds.length === 0) {
        setIngredients([]);
        return;
      }

      const { data: mealIngredients, error } = await supabase
        .from('meal_ingredients')
        .select('*')
        .in('meal_id', mealIds);

      if (error) throw error;

      const ingredientMap = new Map<string, { totalQuantity: number; unit: string }>();

      orders.forEach(order => {
        const orderIngredients = (mealIngredients || []).filter(
          ing => ing.meal_id === order.meal_id
        );

        orderIngredients.forEach(ing => {
          const key = `${ing.ingredient_name}-${ing.unit}`;
          const quantityForOrder = (ing.quantity * order.quantity) / 1000;

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.totalQuantity += quantityForOrder;
          } else {
            ingredientMap.set(key, {
              totalQuantity: quantityForOrder,
              unit: ing.unit,
            });
          }
        });
      });

      const summary: IngredientSummary[] = Array.from(ingredientMap.entries()).map(
        ([key, value]) => ({
          name: key.split('-')[0],
          totalQuantity: value.totalQuantity,
          unit: value.unit,
        })
      );

      summary.sort((a, b) => a.name.localeCompare(b.name));
      setIngredients(summary);
    } catch (error) {
      console.error('Error calculating ingredients:', error);
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'delivered':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-2">
                <ChefHat className="w-6 h-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">Kitchen Dashboard</h1>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-700 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-600">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-white text-orange-500 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('ingredients')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'ingredients'
                    ? 'bg-white text-orange-500 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ingredients
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'orders' ? (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No orders for the selected date range</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {order.meal?.image_url && (
                          <img
                            src={order.meal.image_url}
                            alt={order.meal.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {order.meal?.name || 'Unknown Meal'}
                          </h3>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium">Customer:</span>{' '}
                              {order.customer?.name}
                            </p>
                            <p>
                              <span className="font-medium">Pet:</span> {order.pet?.name} (
                              {order.pet?.weight ? (order.pet.weight / 1000).toFixed(2) : 0}kg)
                            </p>
                            <p>
                              <span className="font-medium">Quantity:</span> {order.quantity}g
                            </p>
                            <p>
                              <span className="font-medium">Delivery Date:</span>{' '}
                              {new Date(order.scheduled_date).toLocaleDateString()}
                            </p>
                            <p>
                              <span className="font-medium">Address:</span> {order.delivery_address}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <span
                        className={`px-4 py-2 rounded-lg text-sm font-medium border text-center ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'ready')}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Ready</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Raw Ingredients Required ({dateRange.start} to {dateRange.end})
            </h3>
            {ingredients.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No ingredients data available. Please ensure meals have ingredients configured.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Ingredient
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Total Quantity
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900 font-medium">{ing.name}</td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {ing.totalQuantity.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 text-sm">{ing.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
