import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface FeaturedBanner {
  id: string;
  title: string;
  content: string;
  custom_css: string;
  custom_js: string;
  position: 'below_header' | 'middle' | 'above_footer';
  display_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function FeaturedBannersManagement() {
  const [banners, setBanners] = useState<FeaturedBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<FeaturedBanner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    custom_css: '',
    custom_js: '',
    position: 'below_header' as 'below_header' | 'middle' | 'above_footer',
    is_enabled: true,
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_banners')
        .select('*')
        .order('position')
        .order('display_order');

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error loading featured banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('featured_banners')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBanner.id);

        if (error) throw error;
      } else {
        const maxOrder = banners
          .filter(b => b.position === formData.position)
          .reduce((max, b) => Math.max(max, b.display_order), -1);

        const { error } = await supabase
          .from('featured_banners')
          .insert([{
            ...formData,
            display_order: maxOrder + 1,
          }]);

        if (error) throw error;
      }

      await loadBanners();
      closeModal();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { error } = await supabase
        .from('featured_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  const handleToggleEnabled = async (banner: FeaturedBanner) => {
    try {
      const { error } = await supabase
        .from('featured_banners')
        .update({ is_enabled: !banner.is_enabled })
        .eq('id', banner.id);

      if (error) throw error;
      await loadBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
    }
  };

  const handleMoveUp = async (banner: FeaturedBanner) => {
    const samePosiBanners = banners.filter(b => b.position === banner.position);
    const currentIndex = samePosiBanners.findIndex(b => b.id === banner.id);

    if (currentIndex <= 0) return;

    const prevBanner = samePosiBanners[currentIndex - 1];

    try {
      await supabase
        .from('featured_banners')
        .update({ display_order: prevBanner.display_order })
        .eq('id', banner.id);

      await supabase
        .from('featured_banners')
        .update({ display_order: banner.display_order })
        .eq('id', prevBanner.id);

      await loadBanners();
    } catch (error) {
      console.error('Error moving banner:', error);
    }
  };

  const handleMoveDown = async (banner: FeaturedBanner) => {
    const samePosiBanners = banners.filter(b => b.position === banner.position);
    const currentIndex = samePosiBanners.findIndex(b => b.id === banner.id);

    if (currentIndex >= samePosiBanners.length - 1) return;

    const nextBanner = samePosiBanners[currentIndex + 1];

    try {
      await supabase
        .from('featured_banners')
        .update({ display_order: nextBanner.display_order })
        .eq('id', banner.id);

      await supabase
        .from('featured_banners')
        .update({ display_order: banner.display_order })
        .eq('id', nextBanner.id);

      await loadBanners();
    } catch (error) {
      console.error('Error moving banner:', error);
    }
  };

  const openModal = (banner?: FeaturedBanner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title,
        content: banner.content,
        custom_css: banner.custom_css,
        custom_js: banner.custom_js,
        position: banner.position,
        is_enabled: banner.is_enabled,
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        content: '',
        custom_css: '',
        custom_js: '',
        position: 'below_header',
        is_enabled: true,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
  };

  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'below_header': return 'Below Header';
      case 'middle': return 'Middle';
      case 'above_footer': return 'Above Footer';
      default: return position;
    }
  };

  const groupedBanners = {
    below_header: banners.filter(b => b.position === 'below_header'),
    middle: banners.filter(b => b.position === 'middle'),
    above_footer: banners.filter(b => b.position === 'above_footer'),
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Featured Banners</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Plus className="w-5 h-5" />
          <span>Add Banner</span>
        </button>
      </div>

      {Object.entries(groupedBanners).map(([position, positionBanners]) => (
        <div key={position} className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">{getPositionLabel(position)}</h3>

          {positionBanners.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No banners in this position</p>
          ) : (
            <div className="space-y-4">
              {positionBanners.map((banner) => (
                <div
                  key={banner.id}
                  className={`border rounded-lg p-4 ${banner.is_enabled ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold">{banner.title}</h4>
                        {!banner.is_enabled && (
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Order: {banner.display_order}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleEnabled(banner)}
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title={banner.is_enabled ? 'Disable' : 'Enable'}
                      >
                        {banner.is_enabled ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleMoveUp(banner)}
                        className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                        disabled={positionBanners[0]?.id === banner.id}
                        title="Move Up"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleMoveDown(banner)}
                        className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30"
                        disabled={positionBanners[positionBanners.length - 1]?.id === banner.id}
                        title="Move Down"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => openModal(banner)}
                        className="p-2 text-blue-600 hover:text-blue-700"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingBanner ? 'Edit Banner' : 'Add Banner'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (Admin Reference)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="below_header">Below Header</option>
                  <option value="middle">Middle</option>
                  <option value="above_footer">Above Footer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  rows={8}
                  placeholder="<div>Your HTML content here</div>"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom CSS
                </label>
                <textarea
                  value={formData.custom_css}
                  onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  rows={6}
                  placeholder=".my-class { color: red; }"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom JavaScript
                </label>
                <textarea
                  value={formData.custom_js}
                  onChange={(e) => setFormData({ ...formData, custom_js: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  rows={6}
                  placeholder="console.log('Hello World');"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_enabled"
                  checked={formData.is_enabled}
                  onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="is_enabled" className="ml-2 text-sm text-gray-700">
                  Enabled
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingBanner ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
