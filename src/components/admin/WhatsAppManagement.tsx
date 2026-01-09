import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageCircle, Save, AlertCircle } from 'lucide-react';

interface WhatsAppConfig {
  id: string;
  enabled: boolean;
  phone_number: string;
  display_text: string;
  default_message: string;
  position: 'bottom-right' | 'bottom-left';
  show_on_customer: boolean;
  show_on_kitchen: boolean;
  icon_url: string;
}

export function WhatsAppManagement() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setConfig(data);
      } else {
        setConfig({
          id: '',
          enabled: false,
          phone_number: '',
          display_text: 'Chat with us',
          default_message: 'Hi! I need help with...',
          position: 'bottom-right',
          show_on_customer: true,
          show_on_kitchen: true,
          icon_url: '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+\d{1,4}\d{6,14}$/;
    return phoneRegex.test(phone);
  };

  const handleSave = async () => {
    if (!config) return;

    setError('');
    setSuccess('');

    if (!config.phone_number.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!validatePhoneNumber(config.phone_number)) {
      setError('Please enter a valid phone number with country code (e.g., +919876543210)');
      return;
    }

    try {
      setSaving(true);

      if (config.id) {
        const { error: updateError } = await supabase
          .from('whatsapp_config')
          .update({
            enabled: config.enabled,
            phone_number: config.phone_number,
            display_text: config.display_text,
            default_message: config.default_message,
            position: config.position,
            show_on_customer: config.show_on_customer,
            show_on_kitchen: config.show_on_kitchen,
            icon_url: config.icon_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (updateError) throw updateError;
      } else {
        const { data: newConfig, error: insertError } = await supabase
          .from('whatsapp_config')
          .insert({
            enabled: config.enabled,
            phone_number: config.phone_number,
            display_text: config.display_text,
            default_message: config.default_message,
            position: config.position,
            show_on_customer: config.show_on_customer,
            show_on_kitchen: config.show_on_kitchen,
            icon_url: config.icon_url || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newConfig);
      }

      setSuccess('WhatsApp configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center space-x-3 mb-6">
        <MessageCircle className="w-8 h-8 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">WhatsApp Chat Configuration</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="enabled"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-5 h-5 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
            Enable WhatsApp Chat Bubble
          </label>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="phone"
            value={config.phone_number}
            onChange={(e) => setConfig({ ...config, phone_number: e.target.value })}
            placeholder="+919876543210"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Include country code (e.g., +91 for India, +1 for USA)
          </p>
        </div>

        <div>
          <label htmlFor="iconUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Icon URL (Optional)
          </label>
          <input
            type="text"
            id="iconUrl"
            value={config.icon_url}
            onChange={(e) => setConfig({ ...config, icon_url: e.target.value })}
            placeholder="https://example.com/icon.png"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to use the default WhatsApp icon. Recommended size: 24x24px or larger.
          </p>
          {config.icon_url && (
            <div className="mt-3 flex items-center space-x-3">
              <span className="text-sm text-gray-600">Preview:</span>
              <div className="bg-green-500 rounded-full p-3">
                <img
                  src={config.icon_url}
                  alt="Custom icon preview"
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="displayText" className="block text-sm font-medium text-gray-700 mb-2">
            Display Text (Optional)
          </label>
          <input
            type="text"
            id="displayText"
            value={config.display_text}
            onChange={(e) => setConfig({ ...config, display_text: e.target.value })}
            placeholder="Chat with us"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="defaultMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Default Message (Optional)
          </label>
          <textarea
            id="defaultMessage"
            value={config.default_message}
            onChange={(e) => setConfig({ ...config, default_message: e.target.value })}
            placeholder="Hi! I need help with..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            This message will be pre-filled when users click the chat button
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="position"
                value="bottom-right"
                checked={config.position === 'bottom-right'}
                onChange={(e) => setConfig({ ...config, position: e.target.value as 'bottom-right' | 'bottom-left' })}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Bottom Right</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="position"
                value="bottom-left"
                checked={config.position === 'bottom-left'}
                onChange={(e) => setConfig({ ...config, position: e.target.value as 'bottom-right' | 'bottom-left' })}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Bottom Left</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.show_on_customer}
                onChange={(e) => setConfig({ ...config, show_on_customer: e.target.checked })}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Show on Customer Pages</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.show_on_kitchen}
                onChange={(e) => setConfig({ ...config, show_on_kitchen: e.target.checked })}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Show on Kitchen/Delivery Pages</span>
            </label>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
