import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Banner, BannerSettings, Meal } from '../../types/database';
import { Plus, Edit, Trash2, Save, X, Settings, MoveUp, MoveDown } from 'lucide-react';

export function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [bannerMeals, setBannerMeals] = useState<Record<string, string[]>>({});
  const [settings, setSettings] = useState<BannerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    display_order: 0,
    is_active: true,
  });
  const [settingsData, setSettingsData] = useState({
    rows_to_display: 2,
    banners_per_row: 3,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bannersRes, mealsRes, bannerMealsRes, settingsRes] = await Promise.all([
        supabase.from('banners').select('*').order('display_order'),
        supabase.from('meals').select('*').eq('is_active', true).order('name'),
        supabase.from('banner_meals').select('*'),
        supabase.from('banner_settings').select('*').limit(1).maybeSingle(),
      ]);

      if (bannersRes.error) throw bannersRes.error;
      if (mealsRes.error) throw mealsRes.error;
      if (bannerMealsRes.error) throw bannerMealsRes.error;

      setBanners(bannersRes.data || []);
      setMeals(mealsRes.data || []);

      const mealsByBanner: Record<string, string[]> = {};
      (bannerMealsRes.data || []).forEach((bm) => {
        if (!mealsByBanner[bm.banner_id]) {
          mealsByBanner[bm.banner_id] = [];
        }
        mealsByBanner[bm.banner_id].push(bm.meal_id);
      });
      setBannerMeals(mealsByBanner);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setSettingsData({
          rows_to_display: settingsRes.data.rows_to_display,
          banners_per_row: settingsRes.data.banners_per_row,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let bannerId = editingBanner?.id;

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('banners')
          .insert([formData])
          .select()
          .single();
        if (error) throw error;
        bannerId = data.id;
      }

      if (bannerId) {
        await supabase.from('banner_meals').delete().eq('banner_id', bannerId);

        if (selectedMeals.length > 0) {
          const bannerMealInserts = selectedMeals.map((mealId) => ({
            banner_id: bannerId,
            meal_id: mealId,
          }));
          const { error } = await supabase.from('banner_meals').insert(bannerMealInserts);
          if (error) throw error;
        }
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner');
    }
  };

  const handleEdit = async (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      image_url: banner.image_url,
      display_order: banner.display_order,
      is_active: banner.is_active,
    });
    setSelectedMeals(bannerMeals[banner.id] || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  const handleToggleStatus = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status');
    }
  };

  const handleMealToggle = (mealId: string) => {
    setSelectedMeals((prev) =>
      prev.includes(mealId) ? prev.filter((id) => id !== mealId) : [...prev, mealId]
    );
  };

  const handleSaveSettings = async () => {
    try {
      if (settings) {
        const { error } = await supabase
          .from('banner_settings')
          .update(settingsData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banner_settings').insert([settingsData]);
        if (error) throw error;
      }
      setShowSettings(false);
      await loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleReorder = async (banner: Banner, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === banners.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const otherBanner = banners[newIndex];

    try {
      await Promise.all([
        supabase
          .from('banners')
          .update({ display_order: otherBanner.display_order })
          .eq('id', banner.id),
        supabase
          .from('banners')
          .update({ display_order: banner.display_order })
          .eq('id', otherBanner.id),
      ]);
      await loadData();
    } catch (error) {
      console.error('Error reordering:', error);
      alert('Failed to reorder banner');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      display_order: banners.length,
      is_active: true,
    });
    setEditingBanner(null);
    setSelectedMeals([]);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Banner Management</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Banner</span>
            </button>
          )}
        </div>
      </div>

      {settings && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Current Settings: {settings.rows_to_display} rows × {settings.banners_per_row} banners
            per row = {settings.rows_to_display * settings.banners_per_row} total banners displayed
          </p>
        </div>
      )}

      {showSettings && (
        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Banner Display Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rows to Display
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settingsData.rows_to_display}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, rows_to_display: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banners Per Row
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={settingsData.banners_per_row}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, banners_per_row: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={handleSaveSettings}
              className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">
            {editingBanner ? 'Edit Banner' : 'Add New Banner'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                required
                placeholder="https://example.com/banner.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.value === 'active' })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Meals (optional)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select meals to show when banner is clicked. Leave empty to show all meals.
              </p>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                {meals.map((meal) => (
                  <label key={meal.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMeals.includes(meal.id)}
                      onChange={() => handleMealToggle(meal.id)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{meal.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>{editingBanner ? 'Update Banner' : 'Add Banner'}</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner, index) => (
          <div key={banner.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="relative">
              <img src={banner.image_url} alt={banner.title} className="w-full h-40 object-cover" />
              {!banner.is_active && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Disabled
                </div>
              )}
              <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                Order: {banner.display_order}
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-gray-900 mb-1">{banner.title}</h4>
              <p className="text-xs text-gray-600 mb-3">{banner.description}</p>
              <div className="text-xs text-gray-500 mb-3">
                {bannerMeals[banner.id]?.length > 0 ? (
                  <span>{bannerMeals[banner.id].length} meal(s) assigned</span>
                ) : (
                  <span className="italic">Shows all meals</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleToggleStatus(banner)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    banner.is_active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {banner.is_active ? 'Active' : 'Disabled'}
                </button>
                <button
                  onClick={() => handleReorder(banner, 'up')}
                  disabled={index === 0}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                  title="Move up"
                >
                  <MoveUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReorder(banner, 'down')}
                  disabled={index === banners.length - 1}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                  title="Move down"
                >
                  <MoveDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(banner)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-gray-500">No banners yet. Create your first banner to get started.</p>
        </div>
      )}
    </div>
  );
}
