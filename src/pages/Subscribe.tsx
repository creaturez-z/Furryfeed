import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Meal, Pet } from '../types/database';
import { ArrowLeft, Plus, Minus } from 'lucide-react';

export function Subscribe() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const meal = location.state?.meal as Meal | undefined;

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!meal) {
      navigate('/');
      return;
    }
    loadPets();
  }, [meal, navigate]);

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPetId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const calculatePrice = () => {
    if (!meal || !selectedPetId) return 0;
    const pet = pets.find(p => p.id === selectedPetId);
    if (!pet) return 0;

    const pricePerGram = meal.base_price_per_10g / 10;
    const totalPrice = pricePerGram * pet.weight * quantity;
    return totalPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPetId) {
      setError('Please select a pet');
      return;
    }

    if (pets.length === 0) {
      setError('Please add a pet first');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          customer_id: user!.id,
          pet_id: selectedPetId,
          meal_id: meal!.id,
          subscription_type: subscriptionType,
          quantity,
          calculated_price: calculatePrice(),
          status: 'active',
        });

      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!meal) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Subscription</h1>

          {pets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You need to add a pet first before subscribing.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <img
                  src={meal.image_url}
                  alt={meal.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{meal.name}</h3>
                  <p className="text-sm text-gray-600">{meal.description}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Pet *
                </label>
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} - {pet.breed} ({pet.weight}g)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Type *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['daily', 'weekly', 'monthly', 'custom'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSubscriptionType(type as typeof subscriptionType)}
                      className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                        subscriptionType === type
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-2xl font-semibold text-gray-900 w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Pet Weight:</span>
                  <span className="font-medium text-gray-900">
                    {pets.find(p => p.id === selectedPetId)?.weight}g
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Price per serving:</span>
                  <span className="font-medium text-gray-900">
                    ₹{selectedPetId ? (calculatePrice() / quantity).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Quantity:</span>
                  <span className="font-medium text-gray-900">×{quantity}</span>
                </div>
                <div className="border-t border-orange-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Price:</span>
                    <span className="text-3xl font-bold text-orange-500">
                      ₹{calculatePrice().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Subscription...' : 'Create Subscription'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
