import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid,
  Weight,
  Receipt,
  Image,
  Monitor,
  Frame,
  Megaphone,
  Settings,
  Menu,
  Type,
  Code,
  Layout,
  Building,
  ChefHat,
  Truck,
  Users,
  Package,
  Wallet,
  BarChart3,
  MessageCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  X,
  Layers,
  Calendar,
  Shield,
  Activity,
  Tag,
  Gift,
} from 'lucide-react';

type AdminTab =
  | 'dashboard'
  | 'calendar'
  | 'meals'
  | 'inventory'
  | 'meal-layout'
  | 'weight-slabs'
  | 'tax-config'
  | 'banners'
  | 'hero-banners'
  | 'featured-banners'
  | 'announcement-bar'
  | 'section-order'
  | 'brand-settings'
  | 'menu-builder'
  | 'label-settings'
  | 'custom-css'
  | 'footer'
  | 'kitchens'
  | 'staff'
  | 'delivery'
  | 'customers'
  | 'subscriptions'
  | 'wallet'
  | 'reports'
  | 'whatsapp'
  | 'pages'
  | 'invoices'
  | 'invoice-settings'
  | 'activity-logs'
  | 'admin-management'
  | 'coupons'
  | 'referral-coupons';

interface SidebarGroup {
  id: string;
  label: string;
  items: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

const sidebarGroups: SidebarGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'calendar', label: 'Calendar View', icon: Calendar },
    ],
  },
  {
    id: 'meals-pricing',
    label: 'Meals & Pricing',
    items: [
      { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'meal-layout', label: 'Meal Layout', icon: Grid },
      { id: 'weight-slabs', label: 'Weight Slabs', icon: Weight },
      { id: 'tax-config', label: 'Tax Config', icon: Receipt },
    ],
  },
  {
    id: 'design-appearance',
    label: 'Design & Appearance',
    items: [
      { id: 'banners', label: 'Banners', icon: Image },
      { id: 'hero-banners', label: 'Hero Banners', icon: Monitor },
      { id: 'featured-banners', label: 'Featured Banners', icon: Frame },
      { id: 'announcement-bar', label: 'Announcement Bar', icon: Megaphone },
      { id: 'section-order', label: 'Section Order', icon: Layers },
      { id: 'brand-settings', label: 'Brand Settings', icon: Settings },
      { id: 'menu-builder', label: 'Menu Builder', icon: Menu },
      { id: 'label-settings', label: 'Label Settings', icon: Type },
      { id: 'custom-css', label: 'Custom CSS', icon: Code },
      { id: 'footer', label: 'Footer', icon: Layout },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'kitchens', label: 'Kitchens', icon: Building },
      { id: 'staff', label: 'Kitchen Staff', icon: ChefHat },
      { id: 'delivery', label: 'Delivery', icon: Truck },
    ],
  },
  {
    id: 'customers-orders',
    label: 'Customers & Orders',
    items: [
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'subscriptions', label: 'Subscriptions', icon: Package },
      { id: 'wallet', label: 'Wallet', icon: Wallet },
      { id: 'invoices', label: 'Invoices', icon: Receipt },
      { id: 'invoice-settings', label: 'Invoice Settings', icon: Settings },
    ],
  },
  {
    id: 'analytics-reports',
    label: 'Analytics & Reports',
    items: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    id: 'marketing-communication',
    label: 'Marketing & Communication',
    items: [
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
      { id: 'coupons', label: 'Coupons', icon: Tag },
      { id: 'referral-coupons', label: 'Referral Coupons', icon: Gift },
    ],
  },
  {
    id: 'content-pages',
    label: 'Content & Pages',
    items: [
      { id: 'pages', label: 'Pages', icon: FileText },
    ],
  },
  {
    id: 'system-admin',
    label: 'System & Admin',
    items: [
      { id: 'admin-management', label: 'Admin Users', icon: Shield },
      { id: 'activity-logs', label: 'Activity Logs', icon: Activity },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange, isOpen, onClose }: AdminSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-expanded');
    if (saved) {
      try {
        setExpandedGroups(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Error loading sidebar state:', e);
      }
    } else {
      const activeGroup = sidebarGroups.find(group =>
        group.items.some(item => item.id === activeTab)
      );
      if (activeGroup) {
        setExpandedGroups(new Set([activeGroup.id]));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('admin-sidebar-expanded', JSON.stringify([...expandedGroups]));
  }, [expandedGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleTabClick = (tabId: AdminTab) => {
    onTabChange(tabId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } w-64 overflow-y-auto`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Admin Menu</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {sidebarGroups.map(group => {
            const isExpanded = expandedGroups.has(group.id);
            const hasActiveItem = group.items.some(item => item.id === activeTab);

            return (
              <div key={group.id} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hasActiveItem
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{group.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pl-3 space-y-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
