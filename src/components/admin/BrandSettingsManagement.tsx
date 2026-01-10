import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BrandSettings } from '../../types/database';
import { Save, Upload } from 'lucide-react';

export function BrandSettingsManagement() {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('brand_settings')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;

      setSettings(data || {
        id: '',
        business_name: 'PetMeals',
        logo_url: '',
        favicon_url: '',
        created_at: '',
        updated_at: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (settings.id) {
        const { error: updateError } = await supabase
          .from('brand_settings')
          .update({
            business_name: settings.business_name,
            logo_url: settings.logo_url,
            favicon_url: settings.favicon_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('brand_settings')
          .insert({
            business_name: settings.business_name,
            logo_url: settings.logo_url,
            favicon_url: settings.favicon_url
          });

        if (insertError) throw insertError;
      }

      setSuccess('Brand settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Brand Settings</h2>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {settings && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={settings.business_name}
              onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="PetMeals"
            />
            <p className="text-sm text-gray-500 mt-1">This will appear across the website</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={settings.logo_url || ''}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://example.com/logo.png"
              />
              <button
                type="button"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
            {settings.logo_url && (
              <div className="mt-2">
                <img src={settings.logo_url} alt="Logo Preview" className="h-16 object-contain" />
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">Recommended size: 200x50px</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favicon URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={settings.favicon_url || ''}
                onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://example.com/favicon.ico"
              />
              <button
                type="button"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
            {settings.favicon_url && (
              <div className="mt-2">
                <img src={settings.favicon_url} alt="Favicon Preview" className="h-8 w-8 object-contain" />
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">Recommended size: 32x32px or 64x64px</p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
