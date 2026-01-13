import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, LogOut, Menu } from 'lucide-react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { OrdersDashboard } from '../components/admin/OrdersDashboard';
import { MealManagement } from '../components/admin/MealManagement';
import { MealLayoutManagement } from '../components/admin/MealLayoutManagement';
import { KitchenManagement } from '../components/admin/KitchenManagement';
import { StaffManagement } from '../components/admin/StaffManagement';
import { DeliveryManagement } from '../components/admin/DeliveryManagement';
import { WeightSlabManagement } from '../components/admin/WeightSlabManagement';
import { TaxConfigurationManagement } from '../components/admin/TaxConfigurationManagement';
import { BannerManagement } from '../components/admin/BannerManagement';
import { HeroBannerManagement } from '../components/admin/HeroBannerManagement';
import { FeaturedBannersManagement } from '../components/admin/FeaturedBannersManagement';
import { AnnouncementBarManagement } from '../components/admin/AnnouncementBarManagement';
import { WalletManagement } from '../components/admin/WalletManagement';
import { CustomersManagement } from '../components/admin/CustomersManagement';
import { SubscriptionsManagement } from '../components/admin/SubscriptionsManagement';
import { ReportsManagement } from '../components/admin/ReportsManagement';
import { WhatsAppManagement } from '../components/admin/WhatsAppManagement';
import { BrandSettingsManagement } from '../components/admin/BrandSettingsManagement';
import { MenuBuilderManagement } from '../components/admin/MenuBuilderManagement';
import { LabelSettingsManagement } from '../components/admin/LabelSettingsManagement';
import { CustomCSSManagement } from '../components/admin/CustomCSSManagement';
import { PagesManagement } from '../components/admin/PagesManagement';
import { FooterBuilderManagement } from '../components/admin/FooterBuilderManagement';
import { SectionOrderManagement } from '../components/admin/SectionOrderManagement';
import { AdminCalendarView } from '../components/admin/AdminCalendarView';
import { ActivityLogsManagement } from '../components/admin/ActivityLogsManagement';
import { InvoiceManagement } from '../components/admin/InvoiceManagement';
import { InvoiceSettingsManagement } from '../components/admin/InvoiceSettingsManagement';
import { AdminManagement } from '../components/admin/AdminManagement';
import { CouponManagement } from '../components/admin/CouponManagement';

type AdminTab = 'dashboard' | 'calendar' | 'meals' | 'meal-layout' | 'weight-slabs' | 'tax-config' | 'banners' | 'hero-banners' | 'featured-banners' | 'announcement-bar' | 'section-order' | 'kitchens' | 'staff' | 'delivery' | 'wallet' | 'customers' | 'subscriptions' | 'reports' | 'whatsapp' | 'brand-settings' | 'menu-builder' | 'label-settings' | 'custom-css' | 'pages' | 'footer' | 'invoices' | 'invoice-settings' | 'activity-logs' | 'admin-management' | 'coupons';

export function AdminPanel() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        <nav className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-700 hover:text-orange-500 transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Home</span>
                </button>
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Admin Panel</h1>
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && <OrdersDashboard />}
          {activeTab === 'calendar' && <AdminCalendarView />}
          {activeTab === 'meals' && <MealManagement />}
          {activeTab === 'meal-layout' && <MealLayoutManagement />}
          {activeTab === 'weight-slabs' && <WeightSlabManagement />}
          {activeTab === 'tax-config' && <TaxConfigurationManagement />}
          {activeTab === 'banners' && <BannerManagement />}
          {activeTab === 'hero-banners' && <HeroBannerManagement />}
          {activeTab === 'featured-banners' && <FeaturedBannersManagement />}
          {activeTab === 'announcement-bar' && <AnnouncementBarManagement />}
          {activeTab === 'section-order' && <SectionOrderManagement />}
          {activeTab === 'kitchens' && <KitchenManagement />}
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'delivery' && <DeliveryManagement />}
          {activeTab === 'wallet' && <WalletManagement />}
          {activeTab === 'customers' && <CustomersManagement />}
          {activeTab === 'subscriptions' && <SubscriptionsManagement />}
          {activeTab === 'reports' && <ReportsManagement />}
          {activeTab === 'whatsapp' && <WhatsAppManagement />}
          {activeTab === 'brand-settings' && <BrandSettingsManagement />}
          {activeTab === 'menu-builder' && <MenuBuilderManagement />}
          {activeTab === 'label-settings' && <LabelSettingsManagement />}
          {activeTab === 'custom-css' && <CustomCSSManagement />}
          {activeTab === 'pages' && <PagesManagement />}
          {activeTab === 'footer' && <FooterBuilderManagement />}
          {activeTab === 'invoices' && <InvoiceManagement />}
          {activeTab === 'invoice-settings' && <InvoiceSettingsManagement />}
          {activeTab === 'activity-logs' && <ActivityLogsManagement />}
          {activeTab === 'admin-management' && <AdminManagement />}
          {activeTab === 'coupons' && <CouponManagement />}
        </main>
      </div>
    </div>
  );
}
