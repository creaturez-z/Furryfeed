import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Save } from 'lucide-react';

type ReferralSettings = {
  id: string;
  max_coupons_per_order: number | null;
  max_discount_percentage: number | null;
  stacking_policy: 'enabled' | 'partial' | 'disabled';
  updated_at: string;
  created_at: string;
};

export function ReferralCouponSettings() {
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    max_coupons_per_order: '',
    max_discount_percentage: '100',
    stacking_policy: 'enabled' as 'enabled' | 'partial' | 'disabled',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_coupon_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setFormData({
          max_coupons_per_order: data.max_coupons_per_order?.toString() || '',
          max_discount_percentage: data.max_discount_percentage?.toString() || '100',
          stacking_policy: data.stacking_policy,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const updateData = {
        max_coupons_per_order: formData.max_coupons_per_order
          ? parseInt(formData.max_coupons_per_order)
          : null,
        max_discount_percentage: formData.max_discount_percentage
          ? parseInt(formData.max_discount_percentage)
          : null,
        stacking_policy: formData.stacking_policy,
        updated_at: new Date().toISOString(),
      };

      if (settings) {
        const { error } = await supabase
          .from('referral_coupon_settings')
          .update(updateData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('referral_coupon_settings')
          .insert(updateData);

        if (error) throw error;
      }

      setMessage('Settings saved successfully');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="w-6 h-6 text-orange-500" />
        <h2 className="text-2xl font-bold text-gray-900">Referral Coupon Settings</h2>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stacking Policy
            </label>
            <select
              value={formData.stacking_policy}
              onChange={(e) =>
                setFormData({ ...formData, stacking_policy: e.target.value as any })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="enabled">Enabled - Customers can stack multiple referral coupons</option>
              <option value="partial">Partial - Limited stacking allowed</option>
              <option value="disabled">Disabled - Only one coupon per order</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Controls whether customers can apply multiple referral coupons in a single order
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Coupons Per Order
            </label>
            <input
              type="number"
              min="1"
              value={formData.max_coupons_per_order}
              onChange={(e) =>
                setFormData({ ...formData, max_coupons_per_order: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Unlimited"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for unlimited. Only applies when stacking is enabled.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Discount Percentage
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="100"
                value={formData.max_discount_percentage}
                onChange={(e) =>
                  setFormData({ ...formData, max_discount_percentage: e.target.value })
                }
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="100"
              />
              <span className="text-gray-700 font-medium">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum percentage of order value that can be covered by referral coupons (1-100%)
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes('success')
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How Referral Coupons Work</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Mark coupons as "Referral Coupon" when creating/editing them</li>
          <li>Customers can apply multiple referral coupons based on your settings</li>
          <li>Discounts are applied sequentially to the remaining order value</li>
          <li>Set limits to control maximum discount and number of coupons</li>
        </ul>
      </div>
    </div>
  );
}
