import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Plus, Minus, Tag, Percent } from 'lucide-react';
import { ProfileWithEmail, Pet, Meal, WeightSlab } from '../../types/database';
import { generateInvoiceForSubscription } from '../../utils/invoiceGenerator';
import { logActivity } from '../../utils/activityLogger';
import { useAuth } from '../../contexts/AuthContext';
import { debitWallet } from '../../utils/wallet';
import { creditSubscriptionWallet } from '../../utils/subscriptionWallet';

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
  overriddenPrice?: number;
}

interface CalendarDay {
  date: Date;
  dateString: string;
  meals: DailyMeal[];
}

interface Coupon {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  minimum_order_value: number | null;
  is_active: boolean;
}

export function CreateSubscriptionModal({ onClose, onSuccess, preselectedCustomerId }: CreateSubscriptionModalProps) {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<ProfileWithEmail[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [weightSlabs, setWeightSlabs] = useState<WeightSlab[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

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

  const [manualDiscountType, setManualDiscountType] = useState<'percentage' | 'flat' | ''>('');
  const [manualDiscountValue, setManualDiscountValue] = useState('');
  const [manualDiscountAppliesTo, setManualDiscountAppliesTo] = useState<'total' | 'specific_items'>('total');
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [couponValidationMessage, setCouponValidationMessage] = useState('');

  const [discountMode, setDiscountMode] = useState<'bulk' | 'specific'>('specific');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDiscountType, setBulkDiscountType] = useState<'percentage' | 'flat' | ''>('');
  const [bulkDiscountValue, setBulkDiscountValue] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerPets();
    }
  }, [selectedCustomerId]);

  const loadData = async () => {
    try {
      const [customersRes, mealsRes, slabsRes, couponsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'customer').order('name'),
        supabase.from('meals').select('*').eq('is_active', true).order('name'),
        supabase.from('weight_slabs').select('*').order('min_weight'),
        supabase.from('coupons').select('id, code, discount_type, discount_value, minimum_order_value, is_active').eq('is_active', true).order('code'),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (mealsRes.error) throw mealsRes.error;
      if (slabsRes.error) throw slabsRes.error;

      setCustomers(customersRes.data || []);
      setMeals(mealsRes.data || []);
      setWeightSlabs(slabsRes.data || []);
      setAvailableCoupons(couponsRes.data || []);
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
      const updated = prev.map((day, dIdx) => {
        if (dIdx === dayIndex) {
          return {
            ...day,
            meals: day.meals.map((meal, mIdx) => {
              if (mIdx === mealIndex) {
                const newCount = meal.count + change;
                return newCount >= 0 ? { ...meal, count: newCount } : meal;
              }
              return meal;
            })
          };
        }
        return day;
      });
      return updated;
    });
  };

  const updatePriceOverride = (dayIndex: number, mealIndex: number, price: number | undefined) => {
    setCalendarDays(prev => {
      return prev.map((day, dIdx) => {
        if (dIdx === dayIndex) {
          return {
            ...day,
            meals: day.meals.map((meal, mIdx) => {
              if (mIdx === mealIndex) {
                return { ...meal, overriddenPrice: price };
              }
              return meal;
            })
          };
        }
        return day;
      });
    });
  };

  const calculateTotal = () => {
    return calendarDays.reduce((total, day) => {
      return total + day.meals.reduce((dayTotal, meal) => {
        const basePrice = meal.overriddenPrice !== undefined ? meal.overriddenPrice : meal.pricePerUnit;
        const effectivePrice = meal.discountedPrice ?? basePrice;
        return dayTotal + (meal.count * effectivePrice);
      }, 0);
    }, 0);
  };

  const calculateManualDiscount = (subtotal: number): number => {
    if (!manualDiscountType || !manualDiscountValue) return 0;

    const value = parseFloat(manualDiscountValue);
    if (isNaN(value) || value <= 0) return 0;

    if (manualDiscountType === 'flat') {
      return Math.min(value, subtotal);
    } else if (manualDiscountType === 'percentage') {
      const percentage = Math.min(value, 100);
      return (subtotal * percentage) / 100;
    }

    return 0;
  };

  const calculateCouponDiscount = (subtotal: number): number => {
    if (!selectedCouponId) return 0;

    const coupon = availableCoupons.find(c => c.id === selectedCouponId);
    if (!coupon) return 0;

    if (coupon.minimum_order_value && subtotal < coupon.minimum_order_value) {
      return 0;
    }

    if (coupon.discount_type === 'flat') {
      return Math.min(coupon.discount_value, subtotal);
    } else {
      const percentage = Math.min(coupon.discount_value, 100);
      return (subtotal * percentage) / 100;
    }
  };

  const toggleItemSelection = (dayIndex: number, mealIndex: number) => {
    const key = `${dayIndex}-${mealIndex}`;
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === 0) {
      const allKeys = new Set<string>();
      calendarDays.forEach((day, dayIndex) => {
        day.meals.forEach((meal, mealIndex) => {
          if (meal.count > 0) {
            allKeys.add(`${dayIndex}-${mealIndex}`);
          }
        });
      });
      setSelectedItems(allKeys);
    } else {
      setSelectedItems(new Set());
    }
  };

  const updateItemDiscount = (dayIndex: number, mealIndex: number, type: string, value: number) => {
    setCalendarDays(prev => {
      return prev.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day;

        return {
          ...day,
          meals: day.meals.map((meal, mIdx) => {
            if (mIdx !== mealIndex) return meal;

            if (!type || type === '') {
              return {
                ...meal,
                itemDiscountType: '',
                itemDiscountValue: 0,
                discountedPrice: meal.pricePerUnit,
              };
            }

            let discountedPrice = meal.pricePerUnit;

            if (type === 'flat') {
              discountedPrice = Math.max(0, meal.pricePerUnit - value);
            } else if (type === 'percentage') {
              const percentage = Math.min(value, 100);
              discountedPrice = meal.pricePerUnit * (1 - percentage / 100);
            }

            return {
              ...meal,
              itemDiscountType: type,
              itemDiscountValue: value,
              discountedPrice,
            };
          })
        };
      });
    });
  };

  const handleDiscountModeChange = (mode: 'bulk' | 'specific') => {
    setDiscountMode(mode);

    if (mode === 'specific') {
      setSelectedItems(new Set());
      setBulkDiscountType('');
      setBulkDiscountValue('');
    } else {
      setCalendarDays(prev => {
        return prev.map(day => ({
          ...day,
          meals: day.meals.map(meal => ({
            ...meal,
            itemDiscountType: '',
            itemDiscountValue: 0,
            discountedPrice: meal.pricePerUnit,
          }))
        }));
      });
    }
  };

  const applyBulkDiscount = () => {
    if (!bulkDiscountType || !bulkDiscountValue || selectedItems.size === 0) {
      return;
    }

    const discountVal = parseFloat(bulkDiscountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      return;
    }

    setCalendarDays(prev => {
      return prev.map((day, dayIndex) => {
        return {
          ...day,
          meals: day.meals.map((meal, mealIndex) => {
            const key = `${dayIndex}-${mealIndex}`;

            if (selectedItems.has(key)) {
              let discountedPrice = meal.pricePerUnit;

              if (bulkDiscountType === 'flat') {
                discountedPrice = Math.max(0, meal.pricePerUnit - discountVal);
              } else if (bulkDiscountType === 'percentage') {
                const percentage = Math.min(discountVal, 100);
                discountedPrice = meal.pricePerUnit * (1 - percentage / 100);
              }

              return {
                ...meal,
                itemDiscountType: bulkDiscountType,
                itemDiscountValue: discountVal,
                discountedPrice,
              };
            }

            return meal;
          })
        };
      });
    });
  };

  const calculateFinalPrice = () => {
    const subtotal = calculateTotal();
    const manualDiscount = calculateManualDiscount(subtotal);
    const couponDiscount = calculateCouponDiscount(subtotal - manualDiscount);
    return Math.max(0, subtotal - manualDiscount - couponDiscount);
  };

  const validateCoupon = (couponId: string) => {
    const coupon = availableCoupons.find(c => c.id === couponId);
    if (!coupon) {
      setCouponValidationMessage('Coupon not found');
      return false;
    }

    const subtotal = calculateTotal();
    const manualDiscount = calculateManualDiscount(subtotal);
    const afterManualDiscount = subtotal - manualDiscount;

    if (coupon.minimum_order_value && afterManualDiscount < coupon.minimum_order_value) {
      setCouponValidationMessage(`Minimum order value is ₹${coupon.minimum_order_value}`);
      return false;
    }

    setCouponValidationMessage('Coupon is valid');
    return true;
  };

  useEffect(() => {
    if (selectedCouponId) {
      validateCoupon(selectedCouponId);
    } else {
      setCouponValidationMessage('');
    }
  }, [selectedCouponId, manualDiscountValue, calendarDays]);

  const handleCreateSubscription = async () => {
    if (!selectedCustomerId || !selectedPetId || calendarDays.length === 0) {
      setError('Missing required information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const subtotalAmount = calculateTotal();
      const manualDiscount = calculateManualDiscount(subtotalAmount);
      const couponDiscount = calculateCouponDiscount(subtotalAmount - manualDiscount);
      const finalPrice = calculateFinalPrice();
      const firstMeal = calendarDays.find(d => d.meals.length > 0)?.meals[0];
      if (!firstMeal) throw new Error('No meals configured');

      const hasPriceOverride = calendarDays.some(day =>
        day.meals.some(meal => meal.overriddenPrice !== undefined)
      );

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          customer_id: selectedCustomerId,
          pet_id: selectedPetId,
          meal_id: firstMeal.mealId,
          subscription_type: 'daily',
          quantity: firstMeal.quantityPerUnit,
          calculated_price: subtotalAmount,
          subtotal_amount: subtotalAmount,
          manual_discount_type: manualDiscountType || null,
          manual_discount_value: manualDiscountValue ? parseFloat(manualDiscountValue) : null,
          manual_discount_applies_to: manualDiscountType ? manualDiscountAppliesTo : null,
          applied_coupon_id: selectedCouponId || null,
          coupon_discount_amount: couponDiscount,
          final_price: finalPrice,
          price_override: hasPriceOverride ? finalPrice : null,
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
              const effectivePrice = meal.overriddenPrice !== undefined ? meal.overriddenPrice : meal.pricePerUnit;
              const { error: dailyItemError } = await supabase
                .from('subscription_daily_items')
                .insert({
                  subscription_id: subscription.id,
                  pet_id: selectedPetId,
                  meal_id: meal.mealId,
                  delivery_date: day.dateString,
                  quantity: meal.quantityPerUnit,
                  price: effectivePrice,
                });

              if (dailyItemError) throw dailyItemError;
            }
          }
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const uniqueDates = [...new Set(calendarDays.map(d => d.dateString))];
        for (const date of uniqueDates) {
          const { error: deductError } = await supabase.rpc('deduct_inventory_for_order', {
            p_subscription_id: subscription.id,
            p_order_date: date,
            p_created_by: user.id,
          });

          if (deductError) {
            console.error('Error deducting inventory:', deductError);
          }
        }
      }

      await generateInvoiceForSubscription(subscription.id, selectedCustomerId);

      try {
        await debitWallet(
          selectedCustomerId,
          finalPrice,
          `Subscription ${subscription.id}`,
          'subscription_charge',
          subscription.id
        );

        await creditSubscriptionWallet(
          selectedCustomerId,
          finalPrice,
          subscription.id,
          `Credit from main wallet for subscription ${subscription.id}`
        );
      } catch (walletError: any) {
        console.error('Failed to deduct from main wallet:', walletError);
        throw new Error(`Wallet deduction failed: ${walletError.message}`);
      }

      if (profile) {
        await logActivity(
          profile.name,
          `Created subscription for customer ${customers.find(c => c.id === selectedCustomerId)?.name}`,
          'subscription',
          subscription.id,
          'subscription'
        );
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Admin can select past dates</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
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
                <h3 className="font-semibold text-gray-900 mb-3">Subscription Pricing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  {manualDiscountType && manualDiscountValue && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Manual Discount ({manualDiscountType === 'percentage' ? `${manualDiscountValue}%` : `₹${manualDiscountValue}`}):</span>
                      <span className="font-medium text-green-600">-₹{calculateManualDiscount(calculateTotal()).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedCouponId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Coupon Discount:</span>
                      <span className="font-medium text-green-600">-₹{calculateCouponDiscount(calculateTotal() - calculateManualDiscount(calculateTotal())).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-300 flex justify-between">
                    <span className="font-semibold text-gray-900">Final Total:</span>
                    <span className="font-bold text-lg text-orange-600">₹{calculateFinalPrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <Tag className="w-5 h-5 text-orange-500" />
                  <span>Apply Discounts (Admin Only)</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Manual Discount</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={manualDiscountType}
                        onChange={(e) => setManualDiscountType(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">None</option>
                        <option value="percentage">Percentage</option>
                        <option value="flat">Flat Amount</option>
                      </select>
                      <input
                        type="number"
                        value={manualDiscountValue}
                        onChange={(e) => setManualDiscountValue(e.target.value)}
                        disabled={!manualDiscountType}
                        placeholder={manualDiscountType === 'percentage' ? '0-100' : 'Amount'}
                        min="0"
                        max={manualDiscountType === 'percentage' ? '100' : undefined}
                        step={manualDiscountType === 'percentage' ? '1' : '0.01'}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                      />
                      <select
                        value={manualDiscountAppliesTo}
                        onChange={(e) => setManualDiscountAppliesTo(e.target.value as any)}
                        disabled={!manualDiscountType}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                      >
                        <option value="total">Total</option>
                        <option value="specific_items">Specific Items</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {manualDiscountType === 'percentage' ? 'Enter percentage (0-100%)' : manualDiscountType === 'flat' ? 'Enter flat amount in ₹' : 'Select discount type'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apply Coupon</label>
                    <select
                      value={selectedCouponId}
                      onChange={(e) => setSelectedCouponId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">No Coupon</option>
                      {availableCoupons.map(coupon => (
                        <option key={coupon.id} value={coupon.id}>
                          {coupon.code} - {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                          {coupon.minimum_order_value ? ` (Min: ₹${coupon.minimum_order_value})` : ''}
                        </option>
                      ))}
                    </select>
                    {couponValidationMessage && (
                      <p className={`text-xs mt-1 ${couponValidationMessage.includes('valid') ? 'text-green-600' : 'text-red-600'}`}>
                        {couponValidationMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-3">Item Discount Mode</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountMode"
                      value="specific"
                      checked={discountMode === 'specific'}
                      onChange={() => handleDiscountModeChange('specific')}
                      className="w-4 h-4 text-orange-500"
                    />
                    <span className="text-gray-900">Specific Item Discount</span>
                    <span className="text-xs text-gray-500">(Edit each item individually)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountMode"
                      value="bulk"
                      checked={discountMode === 'bulk'}
                      onChange={() => handleDiscountModeChange('bulk')}
                      className="w-4 h-4 text-orange-500"
                    />
                    <span className="text-gray-900">Bulk Discount</span>
                    <span className="text-xs text-gray-500">(Same discount for multiple items)</span>
                  </label>
                </div>
              </div>

              {discountMode === 'bulk' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.size > 0 && selectedItems.size === calendarDays.reduce((acc, day) => acc + day.meals.filter(m => m.count > 0).length, 0)}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-orange-500 rounded"
                      />
                      Bulk Discount ({selectedItems.size} selected)
                    </h4>
                    {selectedItems.size > 0 && (
                      <button
                        onClick={() => setSelectedItems(new Set())}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkDiscountType}
                      onChange={(e) => setBulkDiscountType(e.target.value as 'percentage' | 'flat' | '')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Type</option>
                      <option value="flat">Flat Amount ₹</option>
                      <option value="percentage">Percentage %</option>
                    </select>
                    <input
                      type="number"
                      value={bulkDiscountValue}
                      onChange={(e) => setBulkDiscountValue(e.target.value)}
                      disabled={!bulkDiscountType}
                      placeholder={bulkDiscountType === 'percentage' ? '0-100' : 'Amount'}
                      min="0"
                      max={bulkDiscountType === 'percentage' ? '100' : undefined}
                      step={bulkDiscountType === 'percentage' ? '1' : '0.01'}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                    />
                    <button
                      onClick={applyBulkDiscount}
                      disabled={!bulkDiscountType || !bulkDiscountValue || selectedItems.size === 0}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Apply to Selected
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {calendarDays.map((day, dayIndex) => (
                  <div key={day.dateString} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h4>
                    <div className="space-y-2">
                      {day.meals.map((meal, mealIndex) => {
                        const itemKey = `${dayIndex}-${mealIndex}`;
                        const isSelectedForBulk = selectedItems.has(itemKey);
                        const hasDiscount = meal.itemDiscountType && meal.itemDiscountValue && meal.itemDiscountValue > 0;

                        return (
                          <div key={`${meal.mealId}-${mealIndex}`} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-start gap-3 mb-2">
                              {discountMode === 'bulk' && (
                                <input
                                  type="checkbox"
                                  checked={isSelectedForBulk}
                                  onChange={() => toggleItemSelection(dayIndex, mealIndex)}
                                  className="mt-1 w-4 h-4 text-orange-500 rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{meal.mealName}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>{meal.quantityPerUnit}g × </span>
                                  <div className="flex items-center gap-1">
                                    <span className={meal.overriddenPrice !== undefined ? 'line-through text-gray-400' : ''}>
                                      ₹{meal.pricePerUnit.toFixed(2)}
                                    </span>
                                    {meal.overriddenPrice !== undefined && (
                                      <span className="text-orange-600 font-medium">
                                        → ₹{meal.overriddenPrice.toFixed(2)}
                                      </span>
                                    )}
                                    {hasDiscount && (
                                      <>
                                        {' '}→{' '}
                                        <span className="text-green-600 font-medium">
                                          ₹{(meal.discountedPrice ?? (meal.overriddenPrice !== undefined ? meal.overriddenPrice : meal.pricePerUnit)).toFixed(2)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {discountMode === 'bulk' && hasDiscount && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Item Discount: {meal.itemDiscountType === 'percentage' ? `${meal.itemDiscountValue}%` : `₹${meal.itemDiscountValue}`} (from bulk)
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <label className="text-xs text-gray-600 whitespace-nowrap">Override Price:</label>
                                  <input
                                    type="number"
                                    value={meal.overriddenPrice !== undefined ? meal.overriddenPrice : ''}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                      updatePriceOverride(dayIndex, mealIndex, value);
                                    }}
                                    placeholder={`Default: ₹${meal.pricePerUnit.toFixed(2)}`}
                                    min="0"
                                    step="0.01"
                                    className="text-xs w-28 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                                  />
                                </div>
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

                            {discountMode === 'specific' && (
                              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                                <label className="text-xs text-gray-600 whitespace-nowrap">Item Discount:</label>
                                <select
                                  value={meal.itemDiscountType || ''}
                                  onChange={(e) => {
                                    const type = e.target.value as 'percentage' | 'flat' | '';
                                    updateItemDiscount(dayIndex, mealIndex, type, meal.itemDiscountValue || 0);
                                  }}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                                >
                                  <option value="">None</option>
                                  <option value="flat">Flat ₹</option>
                                  <option value="percentage">% Off</option>
                                </select>
                                <input
                                  type="number"
                                  value={meal.itemDiscountValue || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    updateItemDiscount(dayIndex, mealIndex, meal.itemDiscountType || '', value);
                                  }}
                                  disabled={!meal.itemDiscountType}
                                  placeholder={meal.itemDiscountType === 'percentage' ? '0-100' : 'Amount'}
                                  min="0"
                                  max={meal.itemDiscountType === 'percentage' ? '100' : undefined}
                                  step={meal.itemDiscountType === 'percentage' ? '1' : '0.01'}
                                  className="text-xs w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 disabled:bg-gray-100"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
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
