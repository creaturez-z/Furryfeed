import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Meal, Banner, BannerSettings } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag, User, LogOut, Settings } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerSettings, setBannerSettings] = useState<BannerSettings | null>(null);
  const [bannerMeals, setBannerMeals] = useState<Record<string, string[]>>({});
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mealsRes, bannersRes, bannerMealsRes, settingsRes] = await Promise.all([
        supabase.from('meals').select('*').eq('is_active', true).order('name'),
        supabase.from('banners').select('*').eq('is_active', true).order('display_order'),
        supabase.from('banner_meals').select('*'),
        supabase.from('banner_settings').select('*').limit(1).maybeSingle(),
      ]);

      if (mealsRes.error) throw mealsRes.error;
      if (bannersRes.error) throw bannersRes.error;
      if (bannerMealsRes.error) throw bannerMealsRes.error;

      const allMealsData = mealsRes.data || [];
      setAllMeals(allMealsData);
      setMeals(allMealsData);
      setBanners(bannersRes.data || []);
      setBannerSettings(settingsRes.data);

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

  const displayedBanners = bannerSettings
    ? banners.slice(0, bannerSettings.rows_to_display * bannerSettings.banners_per_row)
    : banners.slice(0, 6);

  const gridColsClass = bannerSettings
    ? `grid-cols-1 md:grid-cols-${Math.min(bannerSettings.banners_per_row, 3)} lg:grid-cols-${
        bannerSettings.banners_per_row
      }`
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-8 h-8 text-orange-500" />
              <span className="text-xl font-bold text-gray-900">PetMeals</span>
            </div>
            <div className="flex items-center space-x-4">
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
            </div>
          </div>
        </div>
      </nav>

      <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Healthy Meals for Your Furry Friends
          </h1>
          <p className="text-xl md:text-2xl text-orange-100">
            Fresh, nutritious, and tailored to your pet's needs
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {displayedBanners.length > 0 && (
          <section className="mb-12">
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
          </section>
        )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </main>
    </div>
  );
}
