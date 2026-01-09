import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Save, MoveUp, MoveDown, Eye, EyeOff } from 'lucide-react';

interface HeroBanner {
  id: string;
  title: string;
  type: 'image' | 'html' | 'video';
  content: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function HeroBannerManagement() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'image' as 'image' | 'html' | 'video',
    content: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error loading hero banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('hero_banners')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hero_banners')
          .insert([formData]);
        if (error) throw error;
      }

      resetForm();
      await loadBanners();
    } catch (error) {
      console.error('Error saving hero banner:', error);
      alert('Failed to save hero banner');
    }
  };

  const handleEdit = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      type: banner.type,
      content: banner.content,
      display_order: banner.display_order,
      is_active: banner.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hero banner?')) return;
    try {
      const { error } = await supabase.from('hero_banners').delete().eq('id', id);
      if (error) throw error;
      await loadBanners();
    } catch (error) {
      console.error('Error deleting hero banner:', error);
      alert('Failed to delete hero banner');
    }
  };

  const handleToggleStatus = async (banner: HeroBanner) => {
    try {
      const { error } = await supabase
        .from('hero_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);
      if (error) throw error;
      await loadBanners();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status');
    }
  };

  const handleReorder = async (banner: HeroBanner, direction: 'up' | 'down') => {
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
          .from('hero_banners')
          .update({ display_order: otherBanner.display_order })
          .eq('id', banner.id),
        supabase
          .from('hero_banners')
          .update({ display_order: banner.display_order })
          .eq('id', otherBanner.id),
      ]);
      await loadBanners();
    } catch (error) {
      console.error('Error reordering:', error);
      alert('Failed to reorder hero banner');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'image',
      content: '',
      display_order: banners.length,
      is_active: true,
    });
    setEditingBanner(null);
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
        <div>
          <h3 className="text-xl font-bold text-gray-900">Hero Banner Management</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage hero banners displayed at the top of your website
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Hero Banner</span>
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Active banners: {banners.filter((b) => b.is_active).length} | Total banners: {banners.length}
          {banners.filter((b) => b.is_active).length > 1 && ' | Multiple active banners will display as a slider'}
        </p>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-200">
          <h4 className="text-lg font-bold text-gray-900 mb-4">
            {editingBanner ? 'Edit Hero Banner' : 'Add New Hero Banner'}
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
                  placeholder="e.g., Spring Sale Banner"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">For admin reference only</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'image' | 'html' | 'video' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="image">Image</option>
                  <option value="html">HTML</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content *
              </label>
              {formData.type === 'image' && (
                <>
                  <input
                    type="url"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    placeholder="https://images.pexels.com/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Image URL (use Pexels for stock photos)</p>
                </>
              )}
              {formData.type === 'video' && (
                <>
                  <input
                    type="url"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    placeholder="https://example.com/video.mp4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Video URL (MP4 recommended)</p>
                </>
              )}
              {formData.type === 'html' && (
                <>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={6}
                    placeholder='<div class="text-center"><h1 class="text-5xl font-bold text-white">Welcome!</h1></div>'
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Custom HTML content (Tailwind CSS classes supported)</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="active">Active (Visible on website)</option>
                  <option value="inactive">Disabled (Hidden)</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center space-x-2 transition-colors"
              >
                <Save className="w-5 h-5" />
                <span>{editingBanner ? 'Update Banner' : 'Add Banner'}</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`bg-white rounded-xl shadow-md overflow-hidden border-2 ${
              banner.is_active ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col md:flex-row">
              <div className="md:w-64 h-48 md:h-auto bg-gray-100 flex-shrink-0 relative">
                {banner.type === 'image' && (
                  <img src={banner.content} alt={banner.title} className="w-full h-full object-cover" />
                )}
                {banner.type === 'video' && (
                  <video src={banner.content} className="w-full h-full object-cover" muted />
                )}
                {banner.type === 'html' && (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white p-4">
                    <div className="text-center">
                      <span className="text-2xl font-bold">HTML</span>
                      <p className="text-xs mt-1 opacity-75">Custom Content</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-2">
                  <span className="bg-black/75 text-white px-2 py-1 rounded text-xs font-medium">
                    {banner.type.toUpperCase()}
                  </span>
                  <span className="bg-black/75 text-white px-2 py-1 rounded text-xs">
                    Order: {banner.display_order}
                  </span>
                </div>
                {!banner.is_active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Disabled
                  </div>
                )}
              </div>

              <div className="flex-1 p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{banner.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Created: {new Date(banner.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      banner.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {banner.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 font-medium mb-1">Content Preview:</p>
                  <div className="bg-gray-50 rounded p-3 border border-gray-200">
                    <p className="text-xs text-gray-700 font-mono break-all line-clamp-2">
                      {banner.content}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      banner.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{banner.is_active ? 'Active' : 'Disabled'}</span>
                  </button>
                  <button
                    onClick={() => handleReorder(banner, 'up')}
                    disabled={index === 0}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReorder(banner, 'down')}
                    disabled={index === banners.length - 1}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="text-sm font-medium">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">No hero banners yet</p>
          <p className="text-gray-400 text-sm">Create your first hero banner to get started!</p>
        </div>
      )}
    </div>
  );
}
