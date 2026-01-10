import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CustomCSS } from '../../types/database';
import { Save, RotateCcw, Power } from 'lucide-react';

const DEFAULT_CSS = `/* Custom CSS for PetMeals Website */

/* IMPORTANT: Use !important to override existing styles */

/* Example 1: Hide price on meal cards */
/* .text-sm.text-gray-500 { display: none !important; } */

/* Example 2: Change primary brand color */
/* .bg-orange-500 { background-color: #your-color !important; } */
/* .text-orange-500 { color: #your-color !important; } */
/* .border-orange-500 { border-color: #your-color !important; } */

/* Example 3: Customize buttons */
/* button {
  border-radius: 12px !important;
  font-weight: 600 !important;
} */

/* Example 4: Meal Cards styling */
/* .bg-white.rounded-xl.shadow-md {
  border: 2px solid #e5e7eb !important;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
} */

/* Example 5: Header customization */
/* nav.bg-white {
  background-color: #1f2937 !important;
  color: white !important;
} */

/* Example 6: Adjust font sizes */
/* .text-3xl { font-size: 2.5rem !important; } */
/* .text-xl { font-size: 1.5rem !important; } */

/* Add your custom styles below */
`;

export function CustomCSSManagement() {
  const [cssData, setCssData] = useState<CustomCSS | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCSS();
  }, []);

  const loadCSS = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('custom_css')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;

      setCssData(data || {
        id: '',
        css_content: DEFAULT_CSS,
        is_enabled: false,
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
    if (!cssData) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (cssData.id) {
        const { error: updateError } = await supabase
          .from('custom_css')
          .update({
            css_content: cssData.css_content,
            is_enabled: cssData.is_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('id', cssData.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('custom_css')
          .insert({
            css_content: cssData.css_content,
            is_enabled: cssData.is_enabled
          });

        if (insertError) throw insertError;
      }

      setSuccess('Custom CSS saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadCSS();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default CSS? This cannot be undone.')) {
      setCssData(prev => prev ? { ...prev, css_content: DEFAULT_CSS } : null);
    }
  };

  const handleToggle = async () => {
    if (!cssData) return;

    const newEnabled = !cssData.is_enabled;
    setCssData({ ...cssData, is_enabled: newEnabled });

    try {
      await supabase
        .from('custom_css')
        .update({
          is_enabled: newEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', cssData.id);

      setSuccess(`Custom CSS ${newEnabled ? 'enabled' : 'disabled'}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setCssData({ ...cssData, is_enabled: !newEnabled });
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
          <h2 className="text-2xl font-bold text-gray-900">Custom CSS</h2>
          <p className="text-sm text-gray-600 mt-1">Add custom styles to your website</p>
        </div>
        {cssData && (
          <button
            onClick={handleToggle}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              cssData.is_enabled
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Power className="w-5 h-5" />
            <span>{cssData.is_enabled ? 'Enabled' : 'Disabled'}</span>
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

      {cssData && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How to Use Custom CSS</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Use <code className="bg-blue-100 px-1 rounded">!important</code> to override existing styles</li>
                <li>Changes apply instantly after saving and enabling (no page refresh needed)</li>
                <li>Uncomment examples by removing <code className="bg-blue-100 px-1 rounded">/*</code> and <code className="bg-blue-100 px-1 rounded">*/</code></li>
                <li>Test CSS on both desktop and mobile devices</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Quick Test</h3>
              <p className="text-sm text-green-800">
                To test if CSS is working, try this simple example:
              </p>
              <code className="block bg-green-100 px-3 py-2 rounded mt-2 text-sm">
                .text-sm.text-gray-500 {"{ display: none !important; }"}
              </code>
              <p className="text-sm text-green-800 mt-2">
                This will hide price text on meal cards. If it works, your CSS is applying correctly!
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Troubleshooting</h3>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Make sure "Enabled" toggle is ON</li>
                <li>Check browser console (F12) for CSS syntax errors</li>
                <li>Use browser DevTools to inspect elements and verify selectors</li>
                <li>Always add <code className="bg-amber-100 px-1 rounded">!important</code> to override Tailwind CSS</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSS Content
            </label>
            <textarea
              value={cssData.css_content}
              onChange={(e) => setCssData({ ...cssData, css_content: e.target.value })}
              className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter your custom CSS here..."
            />
            <p className="text-sm text-gray-500 mt-2">
              Total characters: {cssData.css_content.length}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save CSS'}</span>
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reset to Default</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
