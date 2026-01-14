import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Meal, Pet, WeightSlab, Profile } from '../types/database';
import { ArrowLeft, Wallet as WalletIcon, AlertCircle, Calendar as CalendarIcon, Copy, Check, Plus, Tag, X } from 'lucide-react';
import { calculateSubscriptionTax, TaxCalculation } from '../utils/tax';
import { ensureWalletExists } from '../utils/wallet';
import { WhatsAppBubble } from '../components/WhatsAppBubble';
import { PetForm } from '../components/PetForm';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { generateInvoiceForSubscription } from '../utils/invoiceGenerator';
import { validateCoupon, recordCouponUsage, getEligibleCoupons, getCouponsNearEligibility, validateMultipleReferralCoupons, recordMultipleCouponUsage, getReferralCouponSettings, Coupon, CouponValidationResult, MultiCouponValidationResult, ReferralCouponSettings } from '../utils/couponValidator';
import PaymentModal from '../components/PaymentModal';

type Wallet = {
  id: string;
  customer_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

type DailyMeal = {
  mealId: string;
  count: number;
  quantityPerUnit: number;
  pricePerUnit: number;
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
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentStep, setCurrentStep] = useState<'selection' | 'calendar'>('selection');
  const [showPetForm, setShowPetForm] = useState(false);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);

  const [petsWithSubscriptions, setPetsWithSubscriptions] = useState<string[]>([]);
  const [showReplicateModal, setShowReplicateModal] = useState(false);
  const [replicateTargetPetId, setReplicateTargetPetId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [appliedReferralCoupons, setAppliedReferralCoupons] = useState<string[]>([]);
  const [referralCouponResult, setReferralCouponResult] = useState<MultiCouponValidationResult | null>(null);
  const [referralSettings, setReferralSettings] = useState<ReferralCouponSettings | null>(null);
  const [couponError, setCouponError] = useState('');
  const [eligibleCoupons, setEligibleCoupons] = useState<Coupon[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [nearEligibilityCoupons, setNearEligibilityCoupons] = useState<Array<Coupon & { amountNeeded: number }>>([]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setStartDate(tomorrowString);
    loadData();
    loadReferralSettings();
  }, [user, navigate]);

  const loadReferralSettings = async () => {
    const settings = await getReferralCouponSettings();
    setReferralSettings(settings);
  };

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

      if (profileRes.data?.delivery_address) {
        setDeliveryAddress(profileRes.data.delivery_address);
      }

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

    if (wallet && wallet.balance <= 0) {
      setShowWalletPopup(true);
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

  const addMealToDay = (dayIndex: number, mealId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedPetId) return;

    const pet = pets.find(p => p.id === selectedPetId);
    if (!pet) return;

    const { quantity, price } = getMealPrice(mealId, pet);
    if (quantity === 0) {
      setError('No weight slab configured for this pet and meal combination');
      return;
    }

    setCalendarDays(prev => {
      const updated = prev.map((day, idx) => {
        if (idx !== dayIndex) return day;

        const existingMealIndex = day.meals.findIndex(m => m.mealId === mealId);
        const newMeals = day.meals.map(m => ({ ...m }));

        if (existingMealIndex >= 0) {
          newMeals[existingMealIndex] = {
            ...newMeals[existingMealIndex],
            count: newMeals[existingMealIndex].count + 1,
          };
        } else {
          newMeals.push({
            mealId,
            count: 1,
            quantityPerUnit: quantity,
            pricePerUnit: price,
          });
        }

        return {
          ...day,
          date: new Date(day.date),
          dateString: day.dateString,
          meals: newMeals,
        };
      });
      return updated;
    });
  };

  const removeMealFromDay = (dayIndex: number, mealId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCalendarDays(prev => {
      return prev.map((day, idx) => {
        if (idx !== dayIndex) return day;

        const mealIndex = day.meals.findIndex(m => m.mealId === mealId);
        if (mealIndex < 0) return day;

        const newMeals = day.meals.map(m => ({ ...m }));

        if (newMeals[mealIndex].count > 1) {
          newMeals[mealIndex] = {
            ...newMeals[mealIndex],
            count: newMeals[mealIndex].count - 1,
          };
        } else {
          newMeals.splice(mealIndex, 1);
        }

        return {
          ...day,
          date: new Date(day.date),
          dateString: day.dateString,
          meals: newMeals,
        };
      });
    });
  };

  const calculateTotalCost = () => {
    let subtotal = 0;
    calendarDays.forEach(day => {
      day.meals.forEach(meal => {
        subtotal += meal.pricePerUnit * meal.count;
      });
    });
    return subtotal;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponError('');
    const subtotal = calculateTotalCost();
    const mealIds = [...new Set(calendarDays.flatMap(day => day.meals.map(m => m.mealId)))];

    const result = await validateCoupon(couponCode, user!.id, taxCalculation?.total || subtotal, mealIds);

    if (result.valid && result.coupon) {
      if (result.coupon.is_referral) {
        if (appliedReferralCoupons.includes(couponCode.toUpperCase())) {
          setCouponError('This coupon is already applied');
          return;
        }

        const newReferralCoupons = [...appliedReferralCoupons, couponCode.toUpperCase()];
        await validateReferralCoupons(newReferralCoupons);
      } else {
        if (appliedReferralCoupons.length > 0) {
          setCouponError('Cannot mix regular coupons with referral coupons');
          return;
        }
        setAppliedCoupon(result);
        setCouponError('');
        setCouponCode('');
      }
    } else {
      setCouponError(result.error || 'Invalid coupon');
    }
  };

  const validateReferralCoupons = async (codes: string[]) => {
    const subtotal = calculateTotalCost();
    const mealIds = [...new Set(calendarDays.flatMap(day => day.meals.map(m => m.mealId)))];

    const result = await validateMultipleReferralCoupons(
      codes,
      user!.id,
      taxCalculation?.total || subtotal,
      mealIds
    );

    if (result.valid) {
      setAppliedReferralCoupons(codes);
      setReferralCouponResult(result);
      setCouponError('');
      setCouponCode('');
    } else {
      setCouponError(result.error || 'Invalid referral coupons');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleRemoveReferralCoupon = async (code: string) => {
    const newCoupons = appliedReferralCoupons.filter(c => c !== code);
    setAppliedReferralCoupons(newCoupons);

    if (newCoupons.length === 0) {
      setReferralCouponResult(null);
    } else {
      await validateReferralCoupons(newCoupons);
    }
  };

  const handleClearAllReferralCoupons = () => {
    setAppliedReferralCoupons([]);
    setReferralCouponResult(null);
    setCouponError('');
  };

  const loadEligibleCoupons = async () => {
    const mealIds = [...new Set(calendarDays.flatMap(day => day.meals.map(m => m.mealId)))];
    const currentOrderValue = taxCalculation?.total || calculateTotalCost();

    const [coupons, nearCoupons] = await Promise.all([
      getEligibleCoupons(user!.id, mealIds, currentOrderValue),
      getCouponsNearEligibility(user!.id, currentOrderValue, mealIds)
    ]);

    setEligibleCoupons(coupons);
    setNearEligibilityCoupons(nearCoupons);
  };

  useEffect(() => {
    if (user && calendarDays.length > 0) {
      loadEligibleCoupons();
    }
  }, [user, calendarDays, taxCalculation]);

  const getFinalAmount = () => {
    const subtotal = calculateTotalCost();
    const totalWithTax = taxCalculation?.total || subtotal;
    const regularDiscount = appliedCoupon?.discountAmount || 0;
    const referralDiscount = referralCouponResult?.totalDiscount || 0;
    return Math.max(0, totalWithTax - regularDiscount - referralDiscount);
  };

  const getTotalDiscount = () => {
    const regularDiscount = appliedCoupon?.discountAmount || 0;
    const referralDiscount = referralCouponResult?.totalDiscount || 0;
    return regularDiscount + referralDiscount;
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
    const finalAmount = getFinalAmount();

    if (!wallet) {
      setError('Could not load wallet');
      return;
    }

    const hasInsufficientBalance = wallet.balance < finalAmount;

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
          delivery_address: deliveryAddress,
          status: hasInsufficientBalance ? 'paused' : 'active',
          payment_status: hasInsufficientBalance ? 'pending_payment' : 'paid',
          payment_method: hasInsufficientBalance ? null : 'wallet',
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

      if (!hasInsufficientBalance) {
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

        await generateInvoiceForSubscription(subscription.id, user!.id);
      }

      if (appliedCoupon && appliedCoupon.coupon) {
        await recordCouponUsage(
          appliedCoupon.coupon.id,
          user!.id,
          subscription.id,
          appliedCoupon.discountAmount || 0
        );
      }

      if (referralCouponResult && referralCouponResult.coupons.length > 0) {
        await recordMultipleCouponUsage(
          referralCouponResult.coupons,
          user!.id,
          subscription.id
        );
      }

      setPetsWithSubscriptions(prev => [...prev, selectedPetId]);

      if (hasInsufficientBalance) {
        setPendingSubscriptionId(subscription.id);
        setPendingPaymentAmount(finalAmount);
        setShowPaymentModal(true);
      } else if (pets.length > 1 && pets.some(p => !petsWithSubscriptions.includes(p.id) && p.id !== selectedPetId)) {
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
        return {
          mealId: meal.mealId,
          count: meal.count,
          quantityPerUnit: quantity,
          pricePerUnit: price
        };
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
        <AnnouncementBar />
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

                  {!showPetForm && (
                    <button
                      type="button"
                      onClick={() => setShowPetForm(true)}
                      className="mt-3 w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 border border-gray-300"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Pet</span>
                    </button>
                  )}

                  {showPetForm && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <PetForm
                        onSuccess={async () => {
                          setShowPetForm(false);
                          await loadPets();
                        }}
                        onCancel={() => setShowPetForm(false)}
                      />
                    </div>
                  )}
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
                  <div className="grid grid-cols-2 gap-4 mb-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address *
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                      rows={3}
                      placeholder="Enter your complete delivery address..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This address will be used for all deliveries. You can update it later from your dashboard.
                    </p>
                  </div>
                </div>

                <button
                  onClick={generateCalendarDays}
                  disabled={!selectedPetId || selectedMealIds.length === 0 || !startDate || !endDate || !deliveryAddress.trim()}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CalendarIcon className="w-5 h-5" />
                  <span>Continue to Calendar View</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {showWalletPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <WalletIcon className="w-8 h-8 text-orange-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Insufficient Balance
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Your wallet balance is low or zero. Please recharge your wallet to continue with the subscription.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/wallet')}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Recharge Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalletPopup(false)}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <WhatsAppBubble pageType="customer" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AnnouncementBar />
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Available Meals:</h3>
              <button
                type="button"
                onClick={() => setShowAddMealModal(true)}
                className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Meal</span>
              </button>
            </div>
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
              const dayTotal = day.meals.reduce((sum, meal) => sum + (meal.pricePerUnit * meal.count), 0);
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
                      day.meals.map((meal) => {
                        const mealData = meals.find(m => m.id === meal.mealId);
                        const totalQuantity = meal.quantityPerUnit * meal.count;
                        const totalPrice = meal.pricePerUnit * meal.count;
                        return (
                          <div key={meal.mealId} className="bg-gray-50 rounded-lg p-2">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {mealData?.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {meal.count} × {meal.quantityPerUnit}g = {totalQuantity}g
                                </p>
                              </div>
                              <span className="text-xs text-gray-600 ml-2">
                                ₹{totalPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={(e) => removeMealFromDay(dayIndex, meal.mealId, e)}
                                className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 py-1 px-2 rounded transition-colors"
                              >
                                − Remove
                              </button>
                              <button
                                type="button"
                                onClick={(e) => addMealToDay(dayIndex, meal.mealId, e)}
                                className="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-600 py-1 px-2 rounded transition-colors"
                              >
                                + Add More
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-1">
                    {selectedMealIds.map(mealId => {
                      const meal = meals.find(m => m.id === mealId);
                      const alreadyAdded = day.meals.some(m => m.mealId === mealId);
                      if (alreadyAdded) return null;
                      return (
                        <button
                          key={mealId}
                          type="button"
                          onClick={(e) => addMealToDay(dayIndex, mealId, e)}
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

              <div className="border-t border-orange-200 pt-3 mt-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                      <Tag className="w-4 h-4" />
                      <span>Have a coupon code?</span>
                    </label>
                    {eligibleCoupons.length > 0 && (
                      <button
                        onClick={() => setShowCoupons(!showCoupons)}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        {showCoupons ? 'Hide' : 'View'} {eligibleCoupons.length} available {eligibleCoupons.length === 1 ? 'coupon' : 'coupons'}
                      </button>
                    )}
                  </div>

                  {showCoupons && eligibleCoupons.length > 0 && (
                    <div className="bg-white rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                      {eligibleCoupons.map((coupon) => (
                        <button
                          key={coupon.id}
                          onClick={() => {
                            setCouponCode(coupon.code);
                            setShowCoupons(false);
                          }}
                          className="w-full flex items-center justify-between p-2 hover:bg-orange-50 rounded transition-colors text-left"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{coupon.code}</div>
                            <div className="text-xs text-gray-600">
                              {coupon.discount_type === 'percentage'
                                ? `${coupon.discount_value}% off`
                                : `₹${coupon.discount_value} off`}
                            </div>
                          </div>
                          <div className="text-xs text-orange-600">Apply</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {nearEligibilityCoupons.length > 0 && !appliedCoupon && appliedReferralCoupons.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-medium text-blue-900 mb-2">Almost there! Add more to unlock these coupons:</div>
                      {nearEligibilityCoupons.map((coupon) => (
                        <div key={coupon.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <div className="font-medium text-blue-900">{coupon.code}</div>
                            <div className="text-xs text-blue-700">
                              {coupon.discount_type === 'percentage'
                                ? `${coupon.discount_value}% off`
                                : `₹${coupon.discount_value} off`}
                            </div>
                          </div>
                          <div className="text-xs font-medium text-blue-900">
                            Add ₹{coupon.amountNeeded.toFixed(2)} more
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {appliedReferralCoupons.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-purple-900">
                          Referral Coupons Applied ({appliedReferralCoupons.length})
                        </div>
                        <button
                          onClick={handleClearAllReferralCoupons}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                      {referralCouponResult?.coupons.map((item) => (
                        <div key={item.coupon.id} className="flex items-center justify-between bg-white rounded p-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{item.coupon.code}</div>
                            <div className="text-xs text-gray-600">
                              Saves ₹{item.discountAmount.toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveReferralCoupon(item.coupon.code)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-purple-200">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-purple-900">Total Referral Discount:</span>
                          <span className="font-bold text-purple-900">₹{referralCouponResult?.totalDiscount.toFixed(2)}</span>
                        </div>
                        {referralCouponResult && referralCouponResult.remainingAmount < (taxCalculation?.total || calculateTotalCost()) && (
                          <div className="text-xs text-purple-700 mt-1">
                            Remaining to pay: ₹{referralCouponResult.remainingAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!appliedCoupon && appliedReferralCoupons.length === 0 ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim()}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  ) : appliedReferralCoupons.length > 0 && referralSettings && referralSettings.stacking_policy !== 'disabled' ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Add another referral coupon"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim()}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ) : appliedCoupon ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-green-900">
                            Coupon "{appliedCoupon.coupon?.code}" applied
                          </div>
                          <div className="text-xs text-green-700">
                            You save ₹{appliedCoupon.discountAmount?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-green-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : null}

                  {couponError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span className="text-sm text-red-800">{couponError}</span>
                    </div>
                  )}
                </div>
              </div>

              {appliedCoupon && appliedCoupon.discountAmount && appliedCoupon.discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-gray-700">Coupon Discount:</span>
                  <span className="font-medium">
                    -₹{appliedCoupon.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {referralCouponResult && referralCouponResult.totalDiscount > 0 && (
                <div className="flex justify-between items-center text-purple-600">
                  <span className="text-gray-700">Referral Discounts:</span>
                  <span className="font-medium">
                    -₹{referralCouponResult.totalDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {getTotalDiscount() > 0 && (
                <div className="flex justify-between items-center text-green-700 font-medium">
                  <span>Total Savings:</span>
                  <span>-₹{getTotalDiscount().toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-orange-200 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-3xl font-bold text-orange-500">
                    ₹{getFinalAmount().toFixed(2)}
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

      {showAddMealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add More Meals</h2>
              <button
                type="button"
                onClick={() => setShowAddMealModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6">
              {meals.filter(meal => !selectedMealIds.includes(meal.id)).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">All available meals are already selected.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meals
                    .filter(meal => !selectedMealIds.includes(meal.id))
                    .map((meal) => (
                      <div
                        key={meal.id}
                        onClick={() => {
                          setSelectedMealIds(prev => [...prev, meal.id]);
                          setShowAddMealModal(false);
                        }}
                        className="border-2 border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-start space-x-3">
                            <img
                              src={meal.image_url}
                              alt={meal.name}
                              className="w-20 h-20 object-cover rounded-lg"
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
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowAddMealModal(false)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && pendingSubscriptionId && (
        <PaymentModal
          subscriptionId={pendingSubscriptionId}
          amount={pendingPaymentAmount}
          onClose={() => {
            setShowPaymentModal(false);
            navigate('/dashboard');
          }}
          onSuccess={() => {
            loadWallet();
          }}
        />
      )}

      <WhatsAppBubble pageType="customer" />
    </div>
  );
}
