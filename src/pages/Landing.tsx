import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Meal, Banner, BannerSettings, MealLayoutConfig } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag, User, LogOut, Settings, LogIn } from 'lucide-react';
import { WhatsAppBubble } from '../components/WhatsAppBubble';
import { CustomFooter } from '../components/CustomFooter';
import { DynamicMenu } from '../components/DynamicMenu';
import HeroSection from '../components/HeroSection';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { FeaturedBanners } from '../components/FeaturedBanners';

interface SectionLayout {
  id: string;
  section_name: 'all_meals' | 'featured_collections';
  display_order: number;
  is_visible: boolean;
}

export function Landing() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerSettings, setBannerSettings] = useState<BannerSettings | null>(null);
  const [mealLayoutConfig, setMealLayoutConfig] = useState<MealLayoutConfig | null>(null);
  const [bannerMeals, setBannerMeals] = useState<Record<string, string[]>>({});
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandSettings, setBrandSettings] = useState<{ business_name: string; logo_url?: string } | null>(null);
  const [sectionLayout, setSectionLayout] = useState<SectionLayout[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (brandSettings) {
      document.title = brandSettings.business_name;
      if (brandSettings.logo_url) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = brandSettings.logo_url;
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    }
  }, [brandSettings]);

  const loadData = async () => {
    try {
      const [mealsRes, bannersRes, bannerMealsRes, settingsRes, layoutConfigRes, brandRes, sectionLayoutRes] = await Promise.all([
        supabase.from('meals').select('*').eq('is_active', true).order('sort_order').order('created_at'),
        supabase.from('banners').select('*').eq('is_active', true).order('display_order'),
        supabase.from('banner_meals').select('*'),
        supabase.from('banner_settings').select('*').limit(1).maybeSingle(),
        supabase.from('meal_layout_config').select('*').limit(1).maybeSingle(),
        supabase.from('brand_settings').select('*').limit(1).maybeSingle(),
        supabase.from('section_layout').select('*').eq('is_visible', true).order('display_order'),
      ]);

      if (mealsRes.error) throw mealsRes.error;
      if (bannersRes.error) throw bannersRes.error;
      if (bannerMealsRes.error) throw bannerMealsRes.error;

      const allMealsData = mealsRes.data || [];
      setAllMeals(allMealsData);
      setMeals(allMealsData);
      setBanners(bannersRes.data || []);
      setBannerSettings(settingsRes.data);
      setMealLayoutConfig(layoutConfigRes.data || { id: '', desktop_items_per_row: 3, mobile_items_per_row: 1, created_at: '', updated_at: '' });
      setBrandSettings(brandRes.data || { business_name: 'PetMeals' });
      setSectionLayout(sectionLayoutRes.data || []);

      const mealsByBanner: Record<string, string[]> = {};
      (bannerMealsRes.data || []).forEach((bm) => {
        if (!mealsByBanner[bm.banner_id]) {
          mealsByBanner[bm.banner_id] = [];
        }
        mealsByBanner[bm.banner_id].push(bm.meal_id);
      });
      setBannerMeals(mealsByBanner);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = (banner: Banner) => {
    const assignedMealIds = bannerMeals[banner.id] || [];

    if (assignedMealIds.length > 0) {
      const filteredMeals = allMeals.filter((meal) => assignedMealIds.includes(meal.id));
      setMeals(filteredMeals);
    } else {
      setMeals(allMeals);
    }
    setSelectedBannerId(banner.id);

    const mealsSection = document.getElementById('meals-section');
    if (mealsSection) {
      mealsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleShowAllMeals = () => {
    setMeals(allMeals);
    setSelectedBannerId(null);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getMealGridClass = () => {
    if (!mealLayoutConfig) {
      return 'grid-cols-1 md:grid-cols-3';
    }

    const mobileClassMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    };

    const desktopClassMap: Record<number, string> = {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
      5: 'md:grid-cols-5',
      6: 'md:grid-cols-6',
    };

    const mobileClass = mobileClassMap[mealLayoutConfig.mobile_items_per_row] || 'grid-cols-1';
    const desktopClass = desktopClassMap[mealLayoutConfig.desktop_items_per_row] || 'md:grid-cols-3';

    return `${mobileClass} ${desktopClass}`;
  };

  const displayedBanners = bannerSettings
    ? banners.slice(0, bannerSettings.rows_to_display * bannerSettings.banners_per_row)
    : banners.slice(0, 6);

  const gridColsClass = bannerSettings
    ? `grid-cols-1 md:grid-cols-${Math.min(bannerSettings.banners_per_row, 3)} lg:grid-cols-${
        bannerSettings.banners_per_row
      }`
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  const renderFeaturedCollections = () => {
    if (displayedBanners.length === 0) return null;

    return (
      <section className="mb-12">
        <FeaturedBanners position="above_featured_collections" />
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Featured Collections</h2>
        <div className={`grid ${gridColsClass} gap-6`}>
          {displayedBanners.map((banner) => (
            <div
              key={banner.id}
              onClick={() => handleBannerClick(banner)}
              className={`relative rounded-xl overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl ${
                selectedBannerId === banner.id ? 'ring-4 ring-orange-500' : ''
              }`}
            >
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-white text-xl font-bold">{banner.title}</h3>
                <p className="text-white/90 text-sm line-clamp-2">{banner.description}</p>
              </div>
            </div>
          ))}
        </div>
        <FeaturedBanners position="below_featured_collections" />
      </section>
    );
  };

  const renderAllMeals = () => {
    return (
      <section id="meals-section">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {selectedBannerId ? 'Selected Meals' : 'All Meals'}
          </h2>
          {selectedBannerId && (
            <button
              onClick={handleShowAllMeals}
              className="px-4 py-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              Show All Meals
            </button>
          )}
        </div>

        {loading ? (
          <div className={`grid ${getMealGridClass()} gap-6`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No meals available at the moment.</p>
          </div>
        ) : (
          <div className={`grid ${getMealGridClass()} gap-6`}>
            {meals.map((meal) => (
              <div
                key={meal.id}
                onClick={() => navigate(`/meals/${meal.id}`)}
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
              >
                <img src={meal.image_url} alt={meal.name} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{meal.name}</h3>
                  <p className="text-gray-600 line-clamp-2">{meal.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    {meal.mrp && meal.sale_price ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400 line-through">
                          ₹{meal.mrp}/10g
                        </span>
                        <span className="text-sm text-orange-600 font-semibold">
                          ₹{meal.sale_price}/10g
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        From ₹{meal.sale_price || meal.base_price_per_10g}/10g
                      </span>
                    )}
                    <button className="text-orange-500 hover:text-orange-600 font-medium">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderSections = () => {
    return sectionLayout.map((section) => {
      switch (section.section_name) {
        case 'featured_collections':
          return <div key={section.id}>{renderFeaturedCollections()}</div>;
        case 'all_meals':
          return <div key={section.id}>{renderAllMeals()}</div>;
        default:
          return null;
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AnnouncementBar />
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              {brandSettings?.logo_url ? (
                <img src={brandSettings.logo_url} alt={brandSettings.business_name} className="h-8 object-contain" />
              ) : (
                <ShoppingBag className="w-8 h-8 text-orange-500" />
              )}
              <span className="text-xl font-bold text-gray-900">{brandSettings?.business_name || 'PetMeals'}</span>
            </div>
            <div className="hidden lg:flex items-center flex-1 justify-center px-8">
              <DynamicMenu />
            </div>
            <div className="flex items-center space-x-4">
              {!user ? (
                <button
                  onClick={() => navigate('/auth')}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline">Login</span>
                </button>
              ) : (
                <>
                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      <span className="hidden sm:inline">Admin Panel</span>
                    </button>
                  )}
                  {profile?.role === 'customer' && (
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-orange-500 transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="lg:hidden border-t border-gray-200 py-3">
            <DynamicMenu isMobile={true} />
          </div>
        </div>
      </nav>

      <FeaturedBanners position="below_header" />

      <FeaturedBanners position="above_hero" />

      <HeroSection />

      <FeaturedBanners position="below_hero" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderSections()}

        <FeaturedBanners position="middle" />
      </main>

      <FeaturedBanners position="above_footer" />

      <CustomFooter />
      <WhatsAppBubble pageType="customer" />
    </div>
  );
}
