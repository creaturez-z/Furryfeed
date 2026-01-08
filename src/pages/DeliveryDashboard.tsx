import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Order, Meal, Pet } from '../types/database';
import { ArrowLeft, LogOut, Package, MapPin, CheckCircle, Upload } from 'lucide-react';

type OrderWithDetails = Order & {
  meal?: Meal;
  pet?: Pet;
};

export function DeliveryDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: deliveryData } = await supabase
        .from('delivery_persons')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!deliveryData) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          meal:meals(*),
          pet:pets(*)
        `)
        .eq('delivery_person_id', deliveryData.id)
        .in('status', ['ready', 'out_for_delivery', 'delivered'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'out_for_delivery', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      await loadOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const handleUploadProof = async (orderId: string, file: File) => {
    setUploadingImage(orderId);
    try {
      const fakeUrl = `https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750`;

      const { data: deliveryData } = await supabase
        .from('delivery_persons')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!deliveryData) throw new Error('Delivery person not found');

      const { error: confirmError } = await supabase
        .from('delivery_confirmations')
        .insert({
          order_id: orderId,
          delivery_person_id: deliveryData.id,
          image_url: fakeUrl,
        });

      if (confirmError) throw confirmError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await loadOrders();
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert('Failed to upload delivery proof');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-yellow-100 text-yellow-800';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
              <h1 className="text-xl font-bold text-gray-900">Delivery Dashboard</h1>
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
          <p className="text-gray-600">Manage your deliveries and confirm completed orders</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">My Deliveries</h3>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No deliveries assigned</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start space-x-4 flex-1">
                        <img
                          src={order.meal?.image_url}
                          alt={order.meal?.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{order.meal?.name}</h4>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <Package className="w-4 h-4" />
                              <span>For: {order.pet?.name}</span>
                            </div>
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{order.delivery_address}</span>
                            </div>
                            <p>Quantity: {order.quantity}</p>
                            <p>Scheduled: {new Date(order.scheduled_date).toLocaleDateString()}</p>
                            <p className="font-medium text-gray-900">
                              Total: ₹{order.total_amount.toFixed(2)}
                              {order.delivery_charge > 0 && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (incl. ₹{order.delivery_charge} delivery)
                                </span>
                              )}
                            </p>
                          </div>
                          <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 md:w-48">
                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleAcceptOrder(order.id)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                          >
                            Accept Delivery
                          </button>
                        )}

                        {order.status === 'out_for_delivery' && (
                          <div className="space-y-2">
                            <label
                              htmlFor={`file-${order.id}`}
                              className="block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium text-center cursor-pointer"
                            >
                              {uploadingImage === order.id ? (
                                <span>Uploading...</span>
                              ) : (
                                <span className="flex items-center justify-center space-x-2">
                                  <Upload className="w-4 h-4" />
                                  <span>Upload Proof</span>
                                </span>
                              )}
                            </label>
                            <input
                              id={`file-${order.id}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadProof(order.id, file);
                              }}
                              className="hidden"
                              disabled={uploadingImage === order.id}
                            />
                          </div>
                        )}

                        {order.status === 'delivered' && (
                          <div className="text-center">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                            <p className="text-sm text-green-600 font-medium">Delivered</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
