import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Pet, Subscription, Meal, Wallet, SubscriptionPet, SubscriptionItem } from '../types/database';
import { ArrowLeft, Plus, PawPrint, Package, User, Trash2, Edit, Wallet as WalletIcon } from 'lucide-react';
import { PetForm } from '../components/PetForm';
import { ProfileForm } from '../components/ProfileForm';
import { ensureWalletExists } from '../utils/wallet';
import { WhatsAppBubble } from '../components/WhatsAppBubble';

type Tab = 'subscriptions' | 'pets' | 'profile';

type EnrichedSubscription = Subscription & {
  meal?: Meal;
  pet?: Pet;
  subscription_pets?: (SubscriptionPet & { pet?: Pet })[];
  subscription_items?: (SubscriptionItem & { meal?: Meal })[];
};

export function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('subscriptions');
  const [pets, setPets] = useState<Pet[]>([]);
  const [subscriptions, setSubscriptions] = useState<EnrichedSubscription[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadPets(), loadSubscriptions(), loadWallet()]);
    } finally {
      setLoading(false);
    }
  };

  const loadWallet = async () => {
    if (!user) return;
    try {
      const walletData = await ensureWalletExists(user.id);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const loadPets = async () => {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setPets(data || []);
  };

  const loadSubscriptions = async () => {
    const { data: subs, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        meal:meals(*),
        pet:pets(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!subs || subs.length === 0) {
      setSubscriptions([]);
      return;
    }

    const enrichedSubs: EnrichedSubscription[] = await Promise.all(
      subs.map(async (sub) => {
        const { data: subPets } = await supabase
          .from('subscription_pets')
          .select('*, pet:pets(*)')
          .eq('subscription_id', sub.id);

        const { data: subItems } = await supabase
          .from('subscription_items')
          .select('*, meal:meals(*)')
          .eq('subscription_id', sub.id);

        return {
          ...sub,
          subscription_pets: subPets || [],
          subscription_items: subItems || [],
        };
      })
    );

    setSubscriptions(enrichedSubs);
  };

  const handleDeletePet = async (petId: string) => {
    if (!confirm('Are you sure you want to delete this pet?')) return;

    try {
      const { error } = await supabase.from('pets').delete().eq('id', petId);
      if (error) throw error;
      await loadPets();
    } catch (error) {
      console.error('Error deleting pet:', error);
    }
  };

  const handleUpdateSubscriptionStatus = async (id: string, status: Subscription['status']) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      await loadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Home</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
            <button
              onClick={() => navigate('/wallet')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-colors"
            >
              <WalletIcon className="w-5 h-5" />
              <span className="hidden sm:inline">₹{wallet?.balance.toFixed(2) || '0.00'}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'subscriptions'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Subscriptions</span>
            </button>
            <button
              onClick={() => setActiveTab('pets')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'pets'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PawPrint className="w-5 h-5" />
              <span>My Pets</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                {subscriptions.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-4">No subscriptions yet</p>
                    <button
                      onClick={() => navigate('/')}
                      className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Browse Meals
                    </button>
                  </div>
                ) : (
                  subscriptions.map((sub) => {
                    const isMultiItem = (sub.subscription_pets?.length || 0) > 0 && (sub.subscription_items?.length || 0) > 0;
                    const petCount = sub.subscription_pets?.length || 1;
                    const itemCount = sub.subscription_items?.length || 1;

                    return (
                      <div key={sub.id} className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                              {isMultiItem ? (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      Multi-Item Subscription
                                    </h3>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                      {petCount} {petCount === 1 ? 'Pet' : 'Pets'} × {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                    </span>
                                  </div>

                                  {sub.subscription_pets?.map((subPet) => {
                                    const petItems = sub.subscription_items?.filter(
                                      (item) => item.subscription_pet_id === subPet.id
                                    );
                                    const petWeight = subPet.pet?.weight_in_kg || (subPet.pet?.weight ? subPet.pet.weight / 1000 : 0);

                                    return (
                                      <div key={subPet.id} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
                                        <div className="flex items-center space-x-2 mb-2">
                                          {subPet.pet?.image_url && (
                                            <img
                                              src={subPet.pet.image_url}
                                              alt={subPet.pet.name}
                                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                            />
                                          )}
                                          <h4 className="font-medium text-gray-900">
                                            {subPet.pet?.name} ({petWeight.toFixed(2)}kg)
                                          </h4>
                                        </div>
                                        <div className="space-y-1 ml-4">
                                          {petItems?.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between text-sm">
                                              <div className="flex items-center space-x-2">
                                                <span className="text-gray-600">•</span>
                                                <span className="text-gray-700">{item.meal?.name}</span>
                                                <span className="text-gray-500">({item.quantity}g)</span>
                                              </div>
                                              <span className="text-gray-900 font-medium">
                                                ₹{item.price_per_day.toFixed(2)}/day
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm text-gray-600">Type: <span className="capitalize">{sub.subscription_type}</span></p>
                                    {sub.start_date && (
                                      <p className="text-sm text-gray-600">
                                        Duration: {new Date(sub.start_date).toLocaleDateString()} - {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Ongoing'}
                                      </p>
                                    )}
                                    <p className="text-sm font-semibold text-gray-900 mt-2">
                                      Total: ₹{sub.calculated_price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start space-x-4">
                                  <img
                                    src={sub.meal?.image_url}
                                    alt={sub.meal?.name}
                                    className="w-20 h-20 rounded-lg object-cover"
                                  />
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{sub.meal?.name}</h3>
                                    <p className="text-sm text-gray-600">For: {sub.pet?.name}</p>
                                    <p className="text-sm text-gray-600">Quantity: {sub.quantity}g/day</p>
                                    <p className="text-sm text-gray-600">Type: <span className="capitalize">{sub.subscription_type}</span></p>
                                    {sub.start_date && (
                                      <p className="text-sm text-gray-600">
                                        {new Date(sub.start_date).toLocaleDateString()} - {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Ongoing'}
                                      </p>
                                    )}
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                      ₹{sub.calculated_price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-start md:items-end space-y-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sub.status)}`}>
                                {sub.status}
                              </span>
                              {sub.status === 'active' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateSubscriptionStatus(sub.id, 'paused')}
                                    className="text-sm text-yellow-600 hover:text-yellow-700"
                                  >
                                    Pause
                                  </button>
                                  <button
                                    onClick={() => handleUpdateSubscriptionStatus(sub.id, 'skipped')}
                                    className="text-sm text-gray-600 hover:text-gray-700"
                                  >
                                    Skip
                                  </button>
                                  <button
                                    onClick={() => handleUpdateSubscriptionStatus(sub.id, 'cancelled')}
                                    className="text-sm text-red-600 hover:text-red-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                              {sub.status === 'paused' && (
                                <button
                                  onClick={() => handleUpdateSubscriptionStatus(sub.id, 'active')}
                                  className="text-sm text-green-600 hover:text-green-700"
                                >
                                  Resume
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'pets' && (
              <div className="space-y-4">
                {!showPetForm && !editingPet && (
                  <button
                    onClick={() => setShowPetForm(true)}
                    className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add New Pet</span>
                  </button>
                )}

                {(showPetForm || editingPet) && (
                  <PetForm
                    pet={editingPet}
                    onSuccess={async () => {
                      setShowPetForm(false);
                      setEditingPet(null);
                      await loadPets();
                    }}
                    onCancel={() => {
                      setShowPetForm(false);
                      setEditingPet(null);
                    }}
                  />
                )}

                {pets.length === 0 ? (
                  !showPetForm && (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                      <PawPrint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No pets added yet</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pets.map((pet) => {
                      const displayWeight = pet.weight_in_kg || pet.weight / 1000;
                      return (
                        <div key={pet.id} className="bg-white rounded-xl shadow-md p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start space-x-3">
                              {pet.image_url ? (
                                <img
                                  src={pet.image_url}
                                  alt={pet.name}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                                  <PawPrint className="w-8 h-8 text-orange-500" />
                                </div>
                              )}
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
                                <p className="text-sm text-gray-600">{pet.breed}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingPet(pet)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePet(pet.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <p className="text-gray-600">Age: <span className="font-medium text-gray-900">{pet.age} years</span></p>
                              <p className="text-gray-600">Weight: <span className="font-medium text-gray-900">{displayWeight.toFixed(2)} kg</span></p>
                            </div>
                            {pet.medical_condition && (
                              <div className="pt-2 border-t border-gray-100">
                                <p className="text-gray-700 font-medium text-xs mb-1">Medical Conditions:</p>
                                <p className="text-gray-600">{pet.medical_condition}</p>
                              </div>
                            )}
                            {pet.likes && (
                              <div className="pt-2 border-t border-gray-100">
                                <p className="text-gray-700 font-medium text-xs mb-1">Likes:</p>
                                <p className="text-gray-600">{pet.likes}</p>
                              </div>
                            )}
                            {pet.dislikes && (
                              <div className="pt-2 border-t border-gray-100">
                                <p className="text-gray-700 font-medium text-xs mb-1">Dislikes:</p>
                                <p className="text-gray-600">{pet.dislikes}</p>
                              </div>
                            )}
                            {pet.special_instructions && (
                              <div className="pt-2 border-t border-gray-100">
                                <p className="text-gray-700 font-medium text-xs mb-1">Special Instructions:</p>
                                <p className="text-gray-600">{pet.special_instructions}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && profile && (
              <ProfileForm profile={profile} />
            )}
          </>
        )}
      </div>
      <WhatsAppBubble pageType="customer" />
    </div>
  );
}
