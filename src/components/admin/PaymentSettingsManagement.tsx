import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Upload, Eye, EyeOff, Save, CheckCircle } from 'lucide-react';

interface PaymentSettings {
  id: string;
  razorpay_enabled: boolean;
  manual_payment_enabled: boolean;
  razorpay_key_id: string | null;
  razorpay_key_secret: string | null;
  upi_id: string | null;
  phone_number: string | null;
  qr_code_url: string | null;
  contact_phone: string | null;
}

export default function PaymentSettingsManagement() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [formData, setFormData] = useState({
    razorpay_enabled: false,
    manual_payment_enabled: true,
    razorpay_key_id: '',
    razorpay_key_secret: '',
    upi_id: '',
    phone_number: '',
    qr_code_url: '',
    contact_phone: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setFormData({
          razorpay_enabled: data.razorpay_enabled || false,
          manual_payment_enabled: data.manual_payment_enabled || false,
          razorpay_key_id: data.razorpay_key_id || '',
          razorpay_key_secret: data.razorpay_key_secret || '',
          upi_id: data.upi_id || '',
          phone_number: data.phone_number || '',
          qr_code_url: data.qr_code_url || '',
          contact_phone: data.contact_phone || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    try {
      setUploadingQR(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-code-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);

      setFormData({ ...formData, qr_code_url: urlData.publicUrl });
      alert('QR code uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading QR code:', error);
      alert('Error uploading QR code: ' + error.message);
    } finally {
      setUploadingQR(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('payment_settings')
        .upsert({
          id: settings?.id,
          ...formData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      alert('Payment settings saved successfully!');
      loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Payment Settings</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enable or disable payment methods for customers
          </p>

          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.razorpay_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, razorpay_enabled: e.target.checked })
                }
                className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-700 font-medium">Enable Razorpay</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.manual_payment_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, manual_payment_enabled: e.target.checked })
                }
                className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-700 font-medium">Enable Manual Payment (UPI/QR)</span>
            </label>
          </div>
        </div>

        {formData.razorpay_enabled && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Razorpay Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razorpay Key ID
                </label>
                <input
                  type="text"
                  value={formData.razorpay_key_id}
                  onChange={(e) => setFormData({ ...formData, razorpay_key_id: e.target.value })}
                  placeholder="rzp_test_xxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razorpay Key Secret
                </label>
                <div className="relative">
                  <input
                    type={showRazorpaySecret ? 'text' : 'password'}
                    value={formData.razorpay_key_secret}
                    onChange={(e) =>
                      setFormData({ ...formData, razorpay_key_secret: e.target.value })
                    }
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showRazorpaySecret ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your keys from Razorpay Dashboard → Settings → API Keys
                </p>
              </div>
            </div>
          </div>
        )}

        {formData.manual_payment_enabled && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manual Payment Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure UPI details that will be shown to customers
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  placeholder="yourname@paytm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (for UPI)
                </label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phone number displayed for UPI payments
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Customer support phone number displayed in payment popup
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Image
                </label>
                {formData.qr_code_url && (
                  <div className="mb-3 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={formData.qr_code_url}
                      alt="Payment QR Code"
                      className="w-48 h-48 object-contain mx-auto border rounded"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQRUpload}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300">
                      <Upload className="w-4 h-4" />
                      <span>{uploadingQR ? 'Uploading...' : 'Upload QR Code'}</span>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload a QR code image for customers to scan and make payment
                </p>
              </div>
            </div>
          </div>
        )}

        {!formData.razorpay_enabled && !formData.manual_payment_enabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              Warning: No payment methods are enabled. Customers will not be able to make
              payments.
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">Active Payment Methods:</p>
              <ul className="list-disc list-inside text-green-700 text-sm mt-1">
                {formData.razorpay_enabled && <li>Razorpay (Online Payment)</li>}
                {formData.manual_payment_enabled && <li>Manual Payment (UPI/QR Code)</li>}
                {!formData.razorpay_enabled && !formData.manual_payment_enabled && (
                  <li className="text-red-600">None - Please enable at least one method</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
