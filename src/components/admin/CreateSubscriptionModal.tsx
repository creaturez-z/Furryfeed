import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Plus, Minus } from 'lucide-react';
import { ProfileWithEmail, Pet, Meal, WeightSlab } from '../../types/database';

interface CreateSubscriptionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedCustomerId?: string;
}

interface DailyMeal {
  mealId: string;
  mealName: string;
  count: number;
  quantityPerUnit: number;
  pricePerUnit: number;
}

interface CalendarDay {
  date: Date;
  dateString: string;
  meals: DailyMeal[];
}

export function CreateSubscriptionModal({ onClose, onSuccess, preselectedCustomerId }: CreateSubscriptionModalProps) {
  const [customers, setCustomers] = useState<ProfileWithEmail[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentStep, setCurrentStep] = useState<'selection' | 'calendar'>('selection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    setStartDate(tomorrowString);
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerPets();
    }
  }, [selectedCustomerId]);

  const loadData = async () => {
    try {
      const [customersRes, mealsRes, slabsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'customer').order('name'),
        supabase.from('meals').select('*').eq('is_active', true).order('name'),
        supabase.from('weight_slabs').select('*').order('min_weight'),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (mealsRes.error) throw mealsRes.error;
      if (slabsRes.error) throw slabsRes.error;

      setCustomers(customersRes.data || []);
      setMeals(mealsRes.data || []);
      setWeightSlabs(slabsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadCustomerPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('customer_id', selectedCustomerId);

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const getMealPrice = (mealId: string, pet: Pet): { quantity: number; price: number } => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return { quantity: 0, price: 0 };

    const petWeight = pet.weight_in_kg || pet.weight / 1000;
    const slab = weightSlabs
      .filter(s => s.meal_id === mealId)
      .find(s => petWeight >= s.min_weight && petWeight <= s.max_weight);

    return {
      quantity: slab?.food_quantity || 100,
      price: slab?.price || 100,
    };
  };

  const generateCalendarDays = () => {
    if (!selectedPetId || selectedMealIds.length === 0 || !startDate || !endDate) {
      setError('Please fill all required fields');
      return;
    }

    const pet = pets.find(p => p.id === selectedPetId);
    if (!pet) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: CalendarDay[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      const dailyMeals: DailyMeal[] = selectedMealIds.map(mealId => {
        const meal = meals.find(m => m.id === mealId);
        const { quantity, price } = getMealPrice(mealId, pet);

        return {
          mealId,
          mealName: meal?.name || '',
          count: 1,
          quantityPerUnit: quantity,
          pricePerUnit: price,
        };
      });

      days.push({
        date: new Date(d),
        dateString,
        meals: dailyMeals,
      });
    }

    setCalendarDays(days);
    setCurrentStep('calendar');
    setError('');
  };

  const updateMealCount = (dayIndex: number, mealIndex: number, change: number) => {
    setCalendarDays(prev => {
      const updated = [...prev];
      const newCount = updated[dayIndex].meals[mealIndex].count + change;
      if (newCount >= 0) {
        updated[dayIndex].meals[mealIndex].count = newCount;
      }
      return updated;
    });
  };

  const calculateTotal = () => {
    return calendarDays.reduce((total, day) => {
      return total + day.meals.reduce((dayTotal, meal) => {
        return dayTotal + (meal.count * meal.pricePerUnit);
      }, 0);
    }, 0);
  };

  const handleCreateSubscription = async () => {
    if (!selectedCustomerId || !selectedPetId || calendarDays.length === 0) {
      setError('Missing required information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const totalAmount = calculateTotal();
      const firstMeal = calendarDays.find(d => d.meals.length > 0)?.meals[0];
      if (!firstMeal) throw new Error('No meals configured');

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          customer_id: selectedCustomerId,
          pet_id: selectedPetId,
          meal_id: firstMeal.mealId,
          subscription_type: 'daily',
          quantity: firstMeal.quantityPerUnit,
          calculated_price: totalAmount,
          subtotal_amount: totalAmount,
          delivery_address: deliveryAddress,
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
          if (meal.count > 0) {
            for (let i = 0; i < meal.count; i++) {
              const { error: dailyItemError } = await supabase
                .from('subscription_daily_items')
                .insert({
                  subscription_id: subscription.id,
                  pet_id: selectedPetId,
                  meal_id: meal.mealId,
                  delivery_date: day.dateString,
                  quantity: meal.quantityPerUnit,
                  price: meal.pricePerUnit,
                });

              if (dailyItemError) throw dailyItemError;
            }
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      setError('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const selectedPet = pets.find(p => p.id === selectedPetId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Subscription</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {currentStep === 'selection' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  disabled={!!preselectedCustomerId}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.email || customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pet *</label>
                    <select
                      value={selectedPetId}
                      onChange={(e) => setSelectedPetId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Pet</option>
                      {pets.map(pet => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({(pet.weight_in_kg || pet.weight / 1000).toFixed(2)}kg)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPetId && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Meals *</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {meals.map(meal => (
                            <label
                              key={meal.id}
                              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedMealIds.includes(meal.id)
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedMealIds.includes(meal.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMealIds([...selectedMealIds, meal.id]);
                                  } else {
                                    setSelectedMealIds(selectedMealIds.filter(id => id !== meal.id));
                                  }
                                }}
                                className="mr-3"
                              />
                              <span className="font-medium">{meal.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={tomorrowString}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || tomorrowString}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
                        <textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          rows={3}
                          placeholder="Enter delivery address..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                        />
                      </div>

                      <button
                        onClick={generateCalendarDays}
                        disabled={!selectedMealIds.length || !startDate || !endDate || !deliveryAddress.trim()}
                        className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue to Calendar
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => setCurrentStep('selection')}
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                ← Back to Selection
              </button>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Subscription Summary</h3>
                <p className="text-sm text-gray-600">Total: ₹{calculateTotal().toFixed(2)}</p>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {calendarDays.map((day, dayIndex) => (
                  <div key={day.dateString} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h4>
                    <div className="space-y-2">
                      {day.meals.map((meal, mealIndex) => (
                        <div key={meal.mealId} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{meal.mealName}</p>
                            <p className="text-sm text-gray-500">
                              {meal.quantityPerUnit}g × ₹{meal.pricePerUnit.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => updateMealCount(dayIndex, mealIndex, -1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-semibold w-8 text-center">{meal.count}</span>
                            <button
                              onClick={() => updateMealCount(dayIndex, mealIndex, 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreateSubscription}
                disabled={loading}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Subscription'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
