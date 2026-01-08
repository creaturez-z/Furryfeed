import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, LogOut, LayoutDashboard, UtensilsCrossed, Building, ChefHat, Truck, Weight, Image, Wallet, Users, Package, BarChart3 } from 'lucide-react';
import { MealManagement } from '../components/admin/MealManagement';
import { KitchenManagement } from '../components/admin/KitchenManagement';
import { StaffManagement } from '../components/admin/StaffManagement';
import { DeliveryManagement } from '../components/admin/DeliveryManagement';
import { WeightSlabManagement } from '../components/admin/WeightSlabManagement';
import { BannerManagement } from '../components/admin/BannerManagement';
import { WalletManagement } from '../components/admin/WalletManagement';
import { CustomersManagement } from '../components/admin/CustomersManagement';
import { SubscriptionsManagement } from '../components/admin/SubscriptionsManagement';

type AdminTab = 'dashboard' | 'meals' | 'weight-slabs' | 'banners' | 'kitchens' | 'staff' | 'delivery' | 'wallet' | 'customers' | 'subscriptions' | 'reports';

export function AdminPanel() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const handleLogout = async () => {
    await signOut();
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
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
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
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('meals')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'meals'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UtensilsCrossed className="w-5 h-5" />
              <span>Meals</span>
            </button>
            <button
              onClick={() => setActiveTab('weight-slabs')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'weight-slabs'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Weight className="w-5 h-5" />
              <span>Weight Slabs</span>
            </button>
            <button
              onClick={() => setActiveTab('banners')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'banners'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Image className="w-5 h-5" />
              <span>Banners</span>
            </button>
            <button
              onClick={() => setActiveTab('kitchens')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'kitchens'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building className="w-5 h-5" />
              <span>Kitchens</span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ChefHat className="w-5 h-5" />
              <span>Kitchen Staff</span>
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'delivery'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Truck className="w-5 h-5" />
              <span>Delivery</span>
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'wallet'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span>Wallet</span>
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Customers</span>
            </button>
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
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Reports</span>
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
            <p className="text-gray-600">Welcome to the admin panel. Use the tabs above to manage your platform.</p>
          </div>
        )}
        {activeTab === 'meals' && <MealManagement />}
        {activeTab === 'weight-slabs' && <WeightSlabManagement />}
        {activeTab === 'banners' && <BannerManagement />}
        {activeTab === 'kitchens' && <KitchenManagement />}
        {activeTab === 'staff' && <StaffManagement />}
        {activeTab === 'delivery' && <DeliveryManagement />}
        {activeTab === 'wallet' && <WalletManagement />}
        {activeTab === 'customers' && <CustomersManagement />}
        {activeTab === 'subscriptions' && <SubscriptionsManagement />}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reports & Analytics</h2>
            <p className="text-gray-600">Reports coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
