import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Meal, Pet, WeightSlab, Profile } from '../types/database';
import { ArrowLeft, Wallet as WalletIcon, AlertCircle, Calendar as CalendarIcon, Copy, Plus, Minus, Check } from 'lucide-react';
import { calculateSubscriptionTax, TaxCalculation } from '../utils/tax';
import { ensureWalletExists } from '../utils/wallet';
import { WhatsAppBubble } from '../components/WhatsAppBubble';

type Wallet = {
  id: string;
  customer_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

type DailyMeal = {
  mealId: string;
  quantity: number;
  price: number;
};

type CalendarDay = {
  date: Date;
  dateString: string;
  meals: DailyMeal[];
};

export function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedMealId = searchParams.get('mealId');

  const [pets, setPets] = useState<Pet[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([]);

  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentStep, setCurrentStep] = useState<'selection' | 'calendar'>('selection');

  const [petsWithSubscriptions, setPetsWithSubscriptions] = useState<string[]>([]);
  const [showReplicateModal, setShowReplicateModal] = useState(false);
  const [replicateTargetPetId, setReplicateTargetPetId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    setStartDate(tomorrowString);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [petsRes, mealsRes, weightSlabsRes, profileRes] = await Promise.all([
        supabase.from('pets').select('*').eq('customer_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('meals').select('*').eq('is_active', true).order('name'),
        supabase.from('weight_slabs').select('*').order('min_weight'),
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
      ]);

      if (petsRes.error) throw petsRes.error;
      if (mealsRes.error) throw mealsRes.error;
      if (weightSlabsRes.error) throw weightSlabsRes.error;
      if (profileRes.error) throw profileRes.error;

      const petsData = petsRes.data || [];
      const mealsData = mealsRes.data || [];

      setPets(petsData);
      setMeals(mealsData);
      setWeightSlabs(weightSlabsRes.data || []);
      setProfile(profileRes.data);

      if (profileRes.data?.is_banned) {
        setError('Your account is temporarily restricted. Please contact support.');
        return;
      }

      const walletData = await ensureWalletExists(user!.id);
      setWallet(walletData);

      if (petsData.length === 1) {
        setSelectedPetId(petsData[0].id);
      }

      if (preselectedMealId && mealsData.some(m => m.id === preselectedMealId)) {
        setSelectedMealIds([preselectedMealId]);
      } else if (mealsData.length > 0) {
        setSelectedMealIds([mealsData[0].id]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    }
  };

  const findWeightSlab = (pet: Pet, mealId: string) => {
    const petWeightInKg = pet.weight_in_kg || pet.weight / 1000;
    return weightSlabs.find(
      (slab) =>
        slab.meal_id === mealId &&
        petWeightInKg >= slab.min_weight &&
        petWeightInKg <= slab.max_weight
    );
  };

  const getMealPrice = (mealId: string, pet: Pet): { quantity: number; price: number } => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return { quantity: 0, price: 0 };

    const weightSlab = findWeightSlab(pet, mealId);
    if (!weightSlab) return { quantity: 0, price: 0 };

    const quantity = weightSlab.food_quantity;
    const pricePerUnit = meal.sale_price || meal.base_price_per_10g;
    const price = (quantity / 10) * pricePerUnit;

    return { quantity, price };
  };

  const generateCalendarDays = () => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError('End date must be after start date');
      return;
    }

    const days: CalendarDay[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateString = currentDate.toISOString().split('T')[0];
      days.push({
        date: new Date(currentDate),
        dateString,
        meals: [],
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setCalendarDays(days);
    setCurrentStep('calendar');
  };

  const addMealToDay = (dayIndex: number, mealId: string) => {
    if (!selectedPetId) return;

    const pet = pets.find(p => p.id === selectedPetId);
    if (!pet) return;

    const { quantity, price } = getMealPrice(mealId, pet);
    if (quantity === 0) {
      setError('No weight slab configured for this pet and meal combination');
      return;
    }

    setCalendarDays(prev => {
      const updated = [...prev];
      updated[dayIndex].meals.push({
        mealId,
        quantity,
        price,
      });
      return updated;
    });
  };

  const removeMealFromDay = (dayIndex: number, mealIndex: number) => {
    setCalendarDays(prev => {
      const updated = [...prev];
      updated[dayIndex].meals.splice(mealIndex, 1);
      return updated;
    });
  };

  const updateMealQuantity = (dayIndex: number, mealIndex: number, change: number) => {
    if (!selectedPetId) return;

    const pet = pets.find(p => p.id === selectedPetId);
    if (!pet) return;

    setCalendarDays(prev => {
      const updated = [...prev];
      const meal = updated[dayIndex].meals[mealIndex];
      const mealData = meals.find(m => m.id === meal.mealId);
      if (!mealData) return prev;

      const newQuantity = Math.max(10, meal.quantity + change);
      const pricePerUnit = mealData.sale_price || mealData.base_price_per_10g;
      const newPrice = (newQuantity / 10) * pricePerUnit;

      updated[dayIndex].meals[mealIndex] = {
        ...meal,
        quantity: newQuantity,
        price: newPrice,
      };

      return updated;
    });
  };

  const calculateTotalCost = () => {
    let subtotal = 0;
    calendarDays.forEach(day => {
      day.meals.forEach(meal => {
        subtotal += meal.price;
      });
    });
    return subtotal;
  };

  useEffect(() => {
    const loadTaxCalculation = async () => {
      if (calendarDays.length === 0) {
        setTaxCalculation(null);
        return;
      }
      const subtotal = calculateTotalCost();
      if (subtotal > 0) {
        const taxCalc = await calculateSubscriptionTax(subtotal);
        setTaxCalculation(taxCalc);
      } else {
        setTaxCalculation(null);
      }
    };
    loadTaxCalculation();
  }, [calendarDays]);

  const handleSubmit = async () => {
    setError('');
    setShowWalletWarning(false);

    if (!selectedPetId) {
      setError('Please select a pet');
      return;
    }

    if (calendarDays.length === 0) {
      setError('Please configure your subscription calendar');
      return;
    }

    const totalMeals = calendarDays.reduce((sum, day) => sum + day.meals.length, 0);
    if (totalMeals === 0) {
      setError('Please add at least one meal to your subscription');
      return;
    }

    const subtotal = calculateTotalCost();
    const finalAmount = taxCalculation?.total || subtotal;

    if (!wallet) {
      setError('Could not load wallet');
      return;
    }

    if (wallet.balance < finalAmount) {
      setShowWalletWarning(true);
      setError(
        `Insufficient wallet balance. You need ₹${finalAmount.toFixed(2)} but only have ₹${wallet.balance.toFixed(2)}.`
      );
      return;
    }

    setLoading(true);

    try {
      const pet = pets.find(p => p.id === selectedPetId);
      if (!pet) throw new Error('Pet not found');

      const firstMeal = calendarDays.find(d => d.meals.length > 0)?.meals[0];
      if (!firstMeal) throw new Error('No meals configured');

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          customer_id: user!.id,
          pet_id: selectedPetId,
          meal_id: firstMeal.mealId,
          subscription_type: 'daily',
          quantity: firstMeal.quantity,
          calculated_price: finalAmount,
          subtotal_amount: taxCalculation?.subtotal || subtotal,
          tax_name: taxCalculation?.taxName,
          tax_percentage: taxCalculation?.taxPercentage,
          tax_amount: taxCalculation?.taxAmount || 0,
          status: 'active',
          start_date: startDate,
          end_date: endDate,
          selected_weekdays: null,
        })
        .select()
        .single();

      if (subError) throw subError;

      const { data: subPet, error: petError } = await supabase
        .from('subscription_pets')
        .insert({
          subscription_id: subscription.id,
          pet_id: selectedPetId,
        })
        .select()
        .single();

      if (petError) throw petError;

      for (const day of calendarDays) {
        for (const meal of day.meals) {
          const { error: dailyItemError } = await supabase
            .from('subscription_daily_items')
            .insert({
              subscription_id: subscription.id,
              pet_id: selectedPetId,
              meal_id: meal.mealId,
              delivery_date: day.dateString,
              quantity: meal.quantity,
              price: meal.price,
            });

          if (dailyItemError) throw dailyItemError;
        }
      }

      const newBalance = wallet.balance - finalAmount;
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      const { error: transactionError } = await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        customer_id: user!.id,
        type: 'debit',
        amount: finalAmount,
        reason: `Subscription for ${pet.name}`,
        reference_type: 'subscription_charge',
      });

      if (transactionError) throw transactionError;

      setPetsWithSubscriptions(prev => [...prev, selectedPetId]);

      if (pets.length > 1 && pets.some(p => !petsWithSubscriptions.includes(p.id) && p.id !== selectedPetId)) {
        setShowReplicateModal(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError('Failed to create subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReplicateSubscription = async () => {
    if (!replicateTargetPetId) {
      setError('Please select a pet to replicate for');
      return;
    }

    const targetPet = pets.find(p => p.id === replicateTargetPetId);
    if (!targetPet) return;

    setSelectedPetId(replicateTargetPetId);

    const updatedDays = calendarDays.map(day => ({
      ...day,
      meals: day.meals.map(meal => {
        const { quantity, price } = getMealPrice(meal.mealId, targetPet);
        return { mealId: meal.mealId, quantity, price };
      }),
    }));

    setCalendarDays(updatedDays);
    setShowReplicateModal(false);
    setCurrentStep('calendar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const availableMeals = preselectedMealId
    ? [meals.find(m => m.id === preselectedMealId), ...meals.filter(m => m.id !== preselectedMealId)].filter(Boolean) as Meal[]
    : meals;

  const availablePetsForReplication = pets.filter(
    p => !petsWithSubscriptions.includes(p.id) && p.id !== selectedPetId
  );

  const toggleMealSelection = (mealId: string) => {
    setSelectedMealIds(prev =>
      prev.includes(mealId) ? prev.filter(id => id !== mealId) : [...prev, mealId]
    );
  };

  const handleRechargeWallet = () => {
    navigate('/wallet');
  };

  const subtotal = calculateTotalCost();

  if (currentStep === 'selection') {
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

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Create Subscription</h1>
              {wallet && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-orange-50 rounded-lg">
                  <WalletIcon className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-gray-600">Wallet:</span>
                  <span className="font-semibold text-orange-600">
                    ₹{wallet.balance.toFixed(2)}
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
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Pet *
                  </label>
                  {pets.length === 1 && (
                    <div className="mb-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <Check className="w-4 h-4 inline mr-2 text-blue-600" />
                      Your pet has been auto-selected
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pets.map((pet) => {
                      const displayWeight = pet.weight_in_kg || pet.weight / 1000;
                      return (
                        <div
                          key={pet.id}
                          onClick={() => setSelectedPetId(pet.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedPetId === pet.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              checked={selectedPetId === pet.id}
                              onChange={() => {}}
                              className="w-5 h-5 text-orange-500"
                            />
                            {pet.image_url && (
                              <img
                                src={pet.image_url}
                                alt={pet.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{pet.name}</p>
                              <p className="text-sm text-gray-600">
                                {pet.breed} • {displayWeight.toFixed(2)}kg • {pet.age} years
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Meals * (You can select multiple)
                  </label>
                  {preselectedMealId && (
                    <div className="mb-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <Check className="w-4 h-4 inline mr-2 text-blue-600" />
                      Your selected meal appears first and is pre-checked
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableMeals.map((meal) => (
                      <div
                        key={meal.id}
                        onClick={() => toggleMealSelection(meal.id)}
                        className={`border-2 rounded-lg cursor-pointer transition-all overflow-hidden ${
                          selectedMealIds.includes(meal.id)
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={meal.image_url}
                          alt={meal.name}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-3">
                          <div className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedMealIds.includes(meal.id)}
                              onChange={() => {}}
                              className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500 mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{meal.name}</p>
                              <p className="text-xs text-gray-600 line-clamp-2">{meal.description}</p>
                              <p className="text-sm text-orange-600 font-medium mt-1">
                                ₹{(meal.sale_price || meal.base_price_per_10g).toFixed(2)}/10g
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Date Range *
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Subscriptions must start from tomorrow. Same-day subscriptions are not allowed.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={tomorrowString}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || tomorrowString}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={generateCalendarDays}
                  disabled={!selectedPetId || selectedMealIds.length === 0 || !startDate || !endDate}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CalendarIcon className="w-5 h-5" />
                  <span>Continue to Calendar View</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <WhatsAppBubble pageType="customer" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setCurrentStep('selection')}
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Selection</span>
            </button>
            {wallet && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-orange-50 rounded-lg">
                <WalletIcon className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-gray-600">Wallet:</span>
                <span className="font-semibold text-orange-600">
                  ₹{wallet.balance.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar View</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Pet: <strong>{pets.find(p => p.id === selectedPetId)?.name}</strong></span>
              <span>•</span>
              <span>Period: <strong>{startDate}</strong> to <strong>{endDate}</strong></span>
              <span>•</span>
              <span><strong>{calendarDays.length}</strong> days</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Available Meals:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedMealIds.map(mealId => {
                const meal = meals.find(m => m.id === mealId);
                if (!meal) return null;
                return (
                  <span key={mealId} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {meal.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {calendarDays.map((day, dayIndex) => {
              const dayTotal = day.meals.reduce((sum, meal) => sum + meal.price, 0);
              return (
                <div key={dayIndex} className="border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </h4>
                      <p className="text-sm text-gray-600">{day.dateString}</p>
                    </div>
                    <span className="text-sm font-medium text-orange-600">
                      ₹{dayTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    {day.meals.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No meals added</p>
                    ) : (
                      day.meals.map((meal, mealIndex) => {
                        const mealData = meals.find(m => m.id === meal.mealId);
                        return (
                          <div key={mealIndex} className="bg-gray-50 rounded-lg p-2">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900 flex-1">
                                {mealData?.name}
                              </p>
                              <button
                                onClick={() => removeMealFromDay(dayIndex, mealIndex)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateMealQuantity(dayIndex, mealIndex, -10)}
                                  className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm text-gray-700 w-12 text-center">
                                  {meal.quantity}g
                                </span>
                                <button
                                  onClick={() => updateMealQuantity(dayIndex, mealIndex, 10)}
                                  className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-xs text-gray-600">
                                ₹{meal.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-1">
                    {selectedMealIds.map(mealId => {
                      const meal = meals.find(m => m.id === mealId);
                      return (
                        <button
                          key={mealId}
                          onClick={() => addMealToDay(dayIndex, mealId)}
                          className="w-full text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 py-1 px-2 rounded transition-colors"
                        >
                          + Add {meal?.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-orange-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  ₹{(taxCalculation?.subtotal || subtotal).toFixed(2)}
                </span>
              </div>
              {taxCalculation && taxCalculation.taxPercentage > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {taxCalculation.taxName} ({taxCalculation.taxPercentage}%):
                  </span>
                  <span className="font-medium text-gray-900">
                    ₹{(taxCalculation.taxAmount || 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-orange-200 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-3xl font-bold text-orange-500">
                    ₹{(taxCalculation?.total || subtotal).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || calendarDays.every(d => d.meals.length === 0)}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Subscription...' : 'Confirm and Create Subscription'}
          </button>
        </div>
      </div>

      {showReplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <Copy className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900">Replicate Subscription</h2>
            </div>
            <p className="text-gray-600 mb-6">
              You have {availablePetsForReplication.length} more {availablePetsForReplication.length === 1 ? 'pet' : 'pets'} without subscriptions.
              Would you like to create a subscription for another pet?
            </p>

            {availablePetsForReplication.length > 0 && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Pet to Replicate For:
                </label>
                <select
                  value={replicateTargetPetId}
                  onChange={(e) => setReplicateTargetPetId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-6"
                >
                  <option value="">Choose a pet...</option>
                  {availablePetsForReplication.map(pet => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({(pet.weight_in_kg || pet.weight / 1000).toFixed(2)}kg)
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleReplicateSubscription}
                disabled={!replicateTargetPetId}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Replicate
              </button>
              <button
                onClick={() => {
                  setShowReplicateModal(false);
                  navigate('/dashboard');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Skip & Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <WhatsAppBubble pageType="customer" />
    </div>
  );
}
