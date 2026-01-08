import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Pet, Subscription, Meal, Wallet } from '../types/database';
import { ArrowLeft, Plus, PawPrint, Package, User, Trash2, Edit, Wallet as WalletIcon } from 'lucide-react';
import { PetForm } from '../components/PetForm';
import { ProfileForm } from '../components/ProfileForm';
import { ensureWalletExists } from '../utils/wallet';

type Tab = 'subscriptions' | 'pets' | 'profile';

export function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('subscriptions');
  const [pets, setPets] = useState<Pet[]>([]);
  const [subscriptions, setSubscriptions] = useState<(Subscription & { meal?: Meal; pet?: Pet })[]>([]);
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
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        meal:meals(*),
        pet:pets(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setSubscriptions(data || []);
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
                  subscriptions.map((sub) => (
                    <div key={sub.id} className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <img
                            src={sub.meal?.image_url}
                            alt={sub.meal?.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{sub.meal?.name}</h3>
                            <p className="text-sm text-gray-600">For: {sub.pet?.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {sub.quantity}</p>
                            <p className="text-sm text-gray-600">Type: {sub.subscription_type}</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              ₹{sub.calculated_price.toFixed(2)}
                            </p>
                          </div>
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
                  ))
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
                    {pets.map((pet) => (
                      <div key={pet.id} className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
                            <p className="text-sm text-gray-600">{pet.breed}</p>
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
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>Age: {pet.age} years</p>
                          <p>Weight: {pet.weight}g</p>
                          {pet.medical_condition && (
                            <p>Medical: {pet.medical_condition}</p>
                          )}
                          {pet.special_instructions && (
                            <p>Notes: {pet.special_instructions}</p>
                          )}
                        </div>
                      </div>
                    ))}
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
    </div>
  );
}
