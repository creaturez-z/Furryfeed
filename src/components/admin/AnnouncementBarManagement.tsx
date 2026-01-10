import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Save } from 'lucide-react';

interface AnnouncementBar {
  id: string;
  content: string;
  custom_css: string;
  custom_js: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function AnnouncementBarManagement() {
  const [announcementBar, setAnnouncementBar] = useState<AnnouncementBar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    content: '',
    custom_css: '',
    custom_js: '',
    is_enabled: false,
  });

  useEffect(() => {
    loadAnnouncementBar();
  }, []);

  const loadAnnouncementBar = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_bar')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAnnouncementBar(data);
        setFormData({
          content: data.content,
          custom_css: data.custom_css,
          custom_js: data.custom_js,
          is_enabled: data.is_enabled,
        });
      }
    } catch (error) {
      console.error('Error loading announcement bar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (announcementBar) {
        const { error } = await supabase
          .from('announcement_bar')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', announcementBar.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcement_bar')
          .insert([formData]);

        if (error) throw error;
      }

      await loadAnnouncementBar();
      alert('Announcement bar saved successfully!');
    } catch (error) {
      console.error('Error saving announcement bar:', error);
      alert('Failed to save announcement bar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!announcementBar) return;

    try {
      const { error } = await supabase
        .from('announcement_bar')
        .update({ is_enabled: !announcementBar.is_enabled })
        .eq('id', announcementBar.id);

      if (error) throw error;
      await loadAnnouncementBar();
    } catch (error) {
      console.error('Error toggling announcement bar:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Announcement Bar</h2>
        {announcementBar && (
          <button
            onClick={handleToggleEnabled}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              announcementBar.is_enabled
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
          >
            {announcementBar.is_enabled ? (
              <>
                <Eye className="w-5 h-5" />
                <span>Enabled</span>
              </>
            ) : (
              <>
                <EyeOff className="w-5 h-5" />
                <span>Disabled</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The announcement bar appears at the very top of the website above the header.
            Only one announcement bar can be active at a time. Toggle the enabled/disabled button to show or hide it.
          </p>
        </div>

        {announcementBar?.is_enabled && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Status:</strong> Announcement bar is currently visible to customers
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              rows={6}
              placeholder="<div>Your announcement content here</div>"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use HTML to format your announcement. You can include links, icons, and other elements.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom CSS
            </label>
            <textarea
              value={formData.custom_css}
              onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              rows={8}
              placeholder=".announcement-bar { background: #f97316; color: white; }"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add custom CSS to style your announcement bar. Changes will apply immediately.
            </p>
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
              placeholder="// Add custom JavaScript functionality"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add custom JavaScript for interactive features like countdown timers or animations.
            </p>
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
              Enabled (Show on customer site)
            </label>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 border-b border-gray-300">
              Preview (This is how it will appear on the website)
            </div>
            <div className="relative">
              <style>{formData.custom_css}</style>
              <div dangerouslySetInnerHTML={{ __html: formData.content }} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Note: JavaScript will not run in the preview. Save and view on the actual site to see JS effects.
          </p>
        </div>
      </div>
    </div>
  );
}
