import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Meal, Pet, WeightSlab, Profile } from '../types/database';
import { ArrowLeft, Wallet, AlertCircle } from 'lucide-react';

export function Subscribe() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const meal = location.state?.meal as Meal | undefined;

  const [pets, setPets] = useState<Pet[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<'daily' | 'weekly'>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWalletWarning, setShowWalletWarning] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!meal) {
      navigate('/');
      return;
    }
    setStartDate(today);
    loadData();
  }, [meal, navigate, today]);

  const loadData = async () => {
    try {
      const [petsRes, weightSlabsRes, profileRes] = await Promise.all([
        supabase.from('pets').select('*').order('created_at', { ascending: false }),
        supabase.from('weight_slabs').select('*').order('min_weight'),
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
      ]);

      if (petsRes.error) throw petsRes.error;
      if (weightSlabsRes.error) throw weightSlabsRes.error;
      if (profileRes.error) throw profileRes.error;

      setPets(petsRes.data || []);
      setWeightSlabs(weightSlabsRes.data || []);
      setProfile(profileRes.data);

      if (profileRes.data?.is_banned) {
        setError('Your account is temporarily restricted. Please contact support.');
        return;
      }

      if (petsRes.data && petsRes.data.length > 0) {
        setSelectedPetId(petsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const findWeightSlab = (petWeight: number) => {
    return weightSlabs.find(
      (slab) => petWeight >= slab.min_weight && petWeight <= slab.max_weight
    );
  };

  const calculateDetails = () => {
    if (!meal || !selectedPetId) return { quantity: 0, price: 0 };

    const pet = pets.find((p) => p.id === selectedPetId);
    if (!pet) return { quantity: 0, price: 0 };

    const weightSlab = findWeightSlab(pet.weight);
    if (!weightSlab) return { quantity: 0, price: 0 };

    const quantity = weightSlab.food_quantity;
    const pricePerUnit = meal.sale_price || meal.base_price_per_10g;
    const price = (quantity / 10) * pricePerUnit;

    return { quantity, price };
  };

  const handleWeekdayToggle = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowWalletWarning(false);

    if (!selectedPetId) {
      setError('Please select a pet');
      return;
    }

    if (pets.length === 0) {
      setError('Please add a pet first');
      return;
    }

    if (subscriptionType === 'weekly' && selectedWeekdays.length === 0) {
      setError('Please select at least one weekday for weekly subscription');
      return;
    }

    const { quantity, price } = calculateDetails();

    if (!profile) {
      setError('Could not load profile');
      return;
    }

    if (profile.wallet_balance < price) {
      setShowWalletWarning(true);
      setError(
        `Insufficient wallet balance. You need ₹${price.toFixed(2)} but only have ₹${profile.wallet_balance.toFixed(
          2
        )}.`
      );
      return;
    }

    setLoading(true);

    try {
      const { error: subError } = await supabase.from('subscriptions').insert({
        customer_id: user!.id,
        pet_id: selectedPetId,
        meal_id: meal!.id,
        subscription_type: subscriptionType,
        quantity,
        calculated_price: price,
        status: 'active',
        start_date: startDate,
      });

      if (subError) throw subError;

      const newBalance = profile.wallet_balance - price;
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user!.id);

      if (walletError) throw walletError;

      const { error: transactionError } = await supabase.from('wallet_transactions').insert({
        customer_id: user!.id,
        type: 'debit',
        amount: price,
        description: `Subscription payment for ${meal!.name}`,
        balance_after: newBalance,
      });

      if (transactionError) throw transactionError;

      navigate('/dashboard');
    } catch (err) {
      console.error('Subscription error:', err);
      setError('Failed to create subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRechargeWallet = () => {
    navigate('/wallet');
  };

  if (!meal) {
    return null;
  }

  const { quantity, price } = calculateDetails();
  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const weightSlab = selectedPet ? findWeightSlab(selectedPet.weight) : null;

  const weekdays = [
    { day: 1, name: 'Mon' },
    { day: 2, name: 'Tue' },
    { day: 3, name: 'Wed' },
    { day: 4, name: 'Thu' },
    { day: 5, name: 'Fri' },
    { day: 6, name: 'Sat' },
    { day: 0, name: 'Sun' },
  ];

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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Subscription</h1>
            {profile && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-orange-50 rounded-lg">
                <Wallet className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-gray-600">Wallet:</span>
                <span className="font-semibold text-orange-600">
                  ₹{profile.wallet_balance.toFixed(2)}
                </span>
              </div>
            )}
          </div>

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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-700 text-sm">{error}</p>
                      {showWalletWarning && (
                        <button
                          type="button"
                          onClick={handleRechargeWallet}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium underline"
                        >
                          Recharge Wallet →
                        </button>
                      )}
                    </div>
                  </div>
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
                  <p className="text-sm text-orange-600 font-medium mt-1">
                    ₹{meal.sale_price || meal.base_price_per_10g}/10g
                  </p>
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
                      {pet.name} - {pet.breed} ({pet.weight}kg)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSubscriptionType('daily')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      subscriptionType === 'daily'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionType('weekly')}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      subscriptionType === 'weekly'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>

              {subscriptionType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Weekdays *
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {weekdays.map((wd) => (
                      <button
                        key={wd.day}
                        type="button"
                        onClick={() => handleWeekdayToggle(wd.day)}
                        className={`py-2 px-1 rounded-lg font-medium text-sm transition-colors ${
                          selectedWeekdays.includes(wd.day)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {wd.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="bg-orange-50 rounded-xl p-6">
                {selectedPet && weightSlab ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">Pet Weight:</span>
                      <span className="font-medium text-gray-900">{selectedPet.weight}kg</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">Weight Range:</span>
                      <span className="font-medium text-gray-900">
                        {weightSlab.min_weight} - {weightSlab.max_weight}kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">Daily Food Quantity:</span>
                      <span className="font-medium text-gray-900">{quantity}g</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">Price per 10g:</span>
                      <span className="font-medium text-gray-900">
                        ₹{(meal.sale_price || meal.base_price_per_10g).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-orange-200 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">
                          Daily Price:
                        </span>
                        <span className="text-3xl font-bold text-orange-500">
                          ₹{price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600 text-center">
                    {selectedPet
                      ? 'No weight slab configured for this pet weight'
                      : 'Select a pet to see pricing'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !weightSlab || !selectedPet}
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
