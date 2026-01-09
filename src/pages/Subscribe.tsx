import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Meal, Pet, WeightSlab, Profile } from '../types/database';
import { ArrowLeft, Wallet as WalletIcon, AlertCircle, Plus, Trash2 } from 'lucide-react';
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

type PetMealCalculation = {
  petId: string;
  petName: string;
  petWeight: number;
  mealId: string;
  mealName: string;
  quantity: number;
  pricePerDay: number;
  weightSlab: WeightSlab | null;
};

export function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([]);

  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [subscriptionType, setSubscriptionType] = useState<'daily' | 'weekly'>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setStartDate(today);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [petsRes, mealsRes, weightSlabsRes, profileRes] = await Promise.all([
        supabase.from('pets').select('*').order('created_at', { ascending: false }),
        supabase.from('meals').select('*').eq('is_active', true).order('name'),
        supabase.from('weight_slabs').select('*').order('min_weight'),
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
      ]);

      if (petsRes.error) throw petsRes.error;
      if (mealsRes.error) throw mealsRes.error;
      if (weightSlabsRes.error) throw weightSlabsRes.error;
      if (profileRes.error) throw profileRes.error;

      setPets(petsRes.data || []);
      setMeals(mealsRes.data || []);
      setWeightSlabs(weightSlabsRes.data || []);
      setProfile(profileRes.data);

      if (profileRes.data?.is_banned) {
        setError('Your account is temporarily restricted. Please contact support.');
        return;
      }

      const walletData = await ensureWalletExists(user!.id);
      setWallet(walletData);

      if (petsRes.data && petsRes.data.length > 0) {
        setSelectedPetIds([petsRes.data[0].id]);
      }
      if (mealsRes.data && mealsRes.data.length > 0) {
        setSelectedMealIds([mealsRes.data[0].id]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

  const countDeliveryDays = () => {
    if (!startDate || !endDate) return 1;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return 1;

    if (subscriptionType === 'daily') {
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } else {
      let count = 0;
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (selectedWeekdays.includes(dayOfWeek)) {
          count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return count > 0 ? count : 1;
    }
  };

  const getWeeksFromStartDate = () => {
    if (!startDate) return [];

    const start = new Date(startDate);
    const startDayOfWeek = start.getDay();

    const weeks = [];
    const weekdays = [
      { day: 1, name: 'Mon' },
      { day: 2, name: 'Tue' },
      { day: 3, name: 'Wed' },
      { day: 4, name: 'Thu' },
      { day: 5, name: 'Fri' },
      { day: 6, name: 'Sat' },
      { day: 0, name: 'Sun' },
    ];

    for (let i = 0; i < 7; i++) {
      const dayIndex = (startDayOfWeek + i) % 7;
      const weekday = weekdays.find((wd) => wd.day === dayIndex);
      if (weekday) {
        weeks.push(weekday);
      }
    }

    return weeks;
  };

  const calculateAllItems = (): PetMealCalculation[] => {
    const calculations: PetMealCalculation[] = [];

    selectedPetIds.forEach((petId) => {
      const pet = pets.find((p) => p.id === petId);
      if (!pet) return;

      selectedMealIds.forEach((mealId) => {
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) return;

        const weightSlab = findWeightSlab(pet, mealId);
        if (!weightSlab) {
          calculations.push({
            petId: pet.id,
            petName: pet.name,
            petWeight: pet.weight_in_kg ? pet.weight_in_kg * 1000 : pet.weight,
            mealId: meal.id,
            mealName: meal.name,
            quantity: 0,
            pricePerDay: 0,
            weightSlab: null,
          });
          return;
        }

        const quantity = weightSlab.food_quantity;
        const pricePerUnit = meal.sale_price || meal.base_price_per_10g;
        const pricePerDay = (quantity / 10) * pricePerUnit;

        calculations.push({
          petId: pet.id,
          petName: pet.name,
          petWeight: pet.weight_in_kg ? pet.weight_in_kg * 1000 : pet.weight,
          mealId: meal.id,
          mealName: meal.name,
          quantity,
          pricePerDay,
          weightSlab,
        });
      });
    });

    return calculations;
  };

  const calculateTotals = () => {
    const calculations = calculateAllItems();
    const dailyTotal = calculations.reduce((sum, calc) => sum + calc.pricePerDay, 0);
    const totalDays = countDeliveryDays();
    const subtotal = dailyTotal * totalDays;

    return {
      calculations,
      dailyTotal,
      totalDays,
      subtotal,
    };
  };

  useEffect(() => {
    const loadTaxCalculation = async () => {
      const { subtotal } = calculateTotals();
      if (subtotal > 0) {
        const taxCalc = await calculateSubscriptionTax(subtotal);
        setTaxCalculation(taxCalc);
      } else {
        setTaxCalculation(null);
      }
    };
    loadTaxCalculation();
  }, [selectedPetIds, selectedMealIds, startDate, endDate, subscriptionType, selectedWeekdays, pets, meals]);

  const handleWeekdayToggle = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const togglePetSelection = (petId: string) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    );
  };

  const toggleMealSelection = (mealId: string) => {
    setSelectedMealIds((prev) =>
      prev.includes(mealId) ? prev.filter((id) => id !== mealId) : [...prev, mealId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowWalletWarning(false);

    if (selectedPetIds.length === 0) {
      setError('Please select at least one pet');
      return;
    }

    if (selectedMealIds.length === 0) {
      setError('Please select at least one meal');
      return;
    }

    if (subscriptionType === 'weekly' && selectedWeekdays.length === 0) {
      setError('Please select at least one weekday for weekly subscription');
      return;
    }

    if (!endDate) {
      setError('Please select an end date');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    const calculations = calculateAllItems();
    const missingWeightSlabs = calculations.filter((calc) => !calc.weightSlab);

    if (missingWeightSlabs.length > 0) {
      const missing = missingWeightSlabs.map(
        (calc) => `${calc.petName} (${(calc.petWeight / 1000).toFixed(2)}kg) - ${calc.mealName}`
      );
      setError(
        `No weight slab configured for the following combinations:\n${missing.join('\n')}`
      );
      return;
    }

    const { subtotal } = calculateTotals();
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
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          customer_id: user!.id,
          pet_id: selectedPetIds[0],
          meal_id: selectedMealIds[0],
          subscription_type: subscriptionType,
          quantity: calculations[0].quantity,
          calculated_price: finalAmount,
          subtotal_amount: taxCalculation?.subtotal || subtotal,
          tax_name: taxCalculation?.taxName,
          tax_percentage: taxCalculation?.taxPercentage,
          tax_amount: taxCalculation?.taxAmount || 0,
          status: 'active',
          start_date: startDate,
          end_date: endDate,
          selected_weekdays: subscriptionType === 'weekly' ? selectedWeekdays : null,
        })
        .select()
        .single();

      if (subError) throw subError;

      for (const petId of selectedPetIds) {
        const { data: subPet, error: petError } = await supabase
          .from('subscription_pets')
          .insert({
            subscription_id: subscription.id,
            pet_id: petId,
          })
          .select()
          .single();

        if (petError) throw petError;

        for (const calc of calculations.filter((c) => c.petId === petId)) {
          const { error: itemError } = await supabase.from('subscription_items').insert({
            subscription_id: subscription.id,
            subscription_pet_id: subPet.id,
            meal_id: calc.mealId,
            quantity: calc.quantity,
            price_per_day: calc.pricePerDay,
          });

          if (itemError) throw itemError;
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
        reason: `Multi-item subscription payment`,
        reference_type: 'subscription_charge',
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

  const { calculations, dailyTotal, totalDays, subtotal } = calculateTotals();

  const weekdays = subscriptionType === 'weekly' && startDate
    ? getWeeksFromStartDate()
    : [
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  Select Pets * (You can select multiple)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pets.map((pet) => {
                    const displayWeight = pet.weight_in_kg || pet.weight / 1000;
                    return (
                      <div
                        key={pet.id}
                        onClick={() => togglePetSelection(pet.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedPetIds.includes(pet.id)
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedPetIds.includes(pet.id)}
                            onChange={() => {}}
                            className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {meals.map((meal) => (
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

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || today}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {calculations.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Subscription Summary
                  </h3>

                  <div className="space-y-4 mb-4">
                    {selectedPetIds.map((petId) => {
                      const pet = pets.find((p) => p.id === petId);
                      const petCalcs = calculations.filter((c) => c.petId === petId);
                      const petDailyTotal = petCalcs.reduce((sum, c) => sum + c.pricePerDay, 0);

                      return (
                        <div key={petId} className="bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">
                              {pet?.name} ({(pet!.weight / 1000).toFixed(2)}kg)
                            </h4>
                            <span className="text-sm font-medium text-orange-600">
                              ₹{petDailyTotal.toFixed(2)}/day
                            </span>
                          </div>
                          <div className="space-y-2">
                            {petCalcs.map((calc) => (
                              <div
                                key={`${calc.petId}-${calc.mealId}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <div>
                                  <span className="text-gray-700">{calc.mealName}</span>
                                  <span className="text-gray-500 ml-2">
                                    ({calc.quantity}g)
                                  </span>
                                </div>
                                <span className="text-gray-900 font-medium">
                                  ₹{calc.pricePerDay.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-orange-200 pt-4 space-y-2">
                    {endDate && (
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-orange-200">
                        <span className="text-gray-700">
                          {subscriptionType === 'weekly' ? 'Number of Deliveries:' : 'Number of Days:'}
                        </span>
                        <span className="font-medium text-gray-900">{totalDays} days</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Total per Day:</span>
                      <span className="font-medium text-gray-900">
                        ₹{dailyTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">
                        Subtotal ({totalDays} {totalDays === 1 ? 'day' : 'days'}):
                      </span>
                      <span className="font-medium text-gray-900">
                        ₹{((taxCalculation?.subtotal ?? subtotal) || 0).toFixed(2)}
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
                        <span className="text-lg font-semibold text-gray-900">
                          Total Amount:
                        </span>
                        <span className="text-3xl font-bold text-orange-500">
                          ₹{((taxCalculation?.total ?? subtotal) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  selectedPetIds.length === 0 ||
                  selectedMealIds.length === 0 ||
                  calculations.some((c) => !c.weightSlab)
                }
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Subscription...' : 'Create Subscription'}
              </button>
            </form>
          )}
        </div>
      </div>
      <WhatsAppBubble pageType="customer" />
    </div>
  );
}
