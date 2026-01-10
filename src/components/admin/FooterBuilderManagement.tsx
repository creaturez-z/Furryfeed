import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FooterSettings } from '../../types/database';
import { Save, Power, Eye } from 'lucide-react';

export function FooterBuilderManagement() {
  const [footer, setFooter] = useState<FooterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js' | 'preview'>('html');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadFooter();
  }, []);

  const loadFooter = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('footer_settings')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;

      setFooter(data || {
        id: '',
        content: '',
        custom_css: '',
        custom_js: '',
        is_enabled: true,
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
    if (!footer) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (footer.id) {
        const { error: updateError } = await supabase
          .from('footer_settings')
          .update({
            content: footer.content,
            custom_css: footer.custom_css,
            custom_js: footer.custom_js,
            is_enabled: footer.is_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', footer.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('footer_settings')
          .insert({
            content: footer.content,
            custom_css: footer.custom_css,
            custom_js: footer.custom_js,
            is_enabled: footer.is_enabled
          });

        if (insertError) throw insertError;
      }

      setSuccess('Footer settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadFooter();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!footer) return;

    const newEnabled = !footer.is_enabled;
    setFooter({ ...footer, is_enabled: newEnabled });

    try {
      await supabase
        .from('footer_settings')
        .update({
          is_enabled: newEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', footer.id);

      setSuccess(`Footer ${newEnabled ? 'enabled' : 'disabled'}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setFooter({ ...footer, is_enabled: !newEnabled });
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Footer Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Customize your website footer with HTML, CSS, and JS</p>
        </div>
        {footer && (
          <button
            onClick={handleToggle}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              footer.is_enabled
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Power className="w-5 h-5" />
            <span>{footer.is_enabled ? 'Enabled' : 'Disabled'}</span>
          </button>
        )}
      </div>

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

      {footer && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Important Notes</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Use Tailwind CSS classes for styling</li>
              <li>Custom CSS will be applied in addition to HTML content</li>
              <li>JavaScript will execute after the footer loads</li>
              <li>Test your footer on both desktop and mobile devices</li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('html')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'html'
                    ? 'bg-white text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                HTML
              </button>
              <button
                onClick={() => setActiveTab('css')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'css'
                    ? 'bg-white text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                CSS
              </button>
              <button
                onClick={() => setActiveTab('js')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'js'
                    ? 'bg-white text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                JavaScript
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </div>
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'html' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Content
                  </label>
                  <textarea
                    value={footer.content}
                    onChange={(e) => setFooter({ ...footer, content: e.target.value })}
                    className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    placeholder="<footer>Your HTML here</footer>"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Use Tailwind CSS classes for styling (e.g., bg-gray-900, text-white, py-12)
                  </p>
                </div>
              )}

              {activeTab === 'css' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom CSS
                  </label>
                  <textarea
                    value={footer.custom_css}
                    onChange={(e) => setFooter({ ...footer, custom_css: e.target.value })}
                    className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    placeholder="/* Custom CSS for footer */"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Additional CSS styles for your footer
                  </p>
                </div>
              )}

              {activeTab === 'js' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom JavaScript
                  </label>
                  <textarea
                    value={footer.custom_js}
                    onChange={(e) => setFooter({ ...footer, custom_js: e.target.value })}
                    className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    placeholder="// Custom JavaScript for footer"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    JavaScript code to execute after footer loads
                  </p>
                </div>
              )}

              {activeTab === 'preview' && (
                <div>
                  <div className="mb-2 text-sm font-medium text-gray-700">Preview</div>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto">
                    <style>{footer.custom_css}</style>
                    <div dangerouslySetInnerHTML={{ __html: footer.content }} />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This is a preview. JavaScript will not execute here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Footer'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
