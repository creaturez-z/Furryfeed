import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, CheckCircle, CreditCard, Smartphone, QrCode } from 'lucide-react';

interface PaymentModalProps {
  subscriptionId: string | null;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentSettings {
  razorpay_enabled: boolean;
  manual_payment_enabled: boolean;
  razorpay_key_id: string | null;
  upi_id: string | null;
  phone_number: string | null;
  qr_code_url: string | null;
}

export default function PaymentModal({
  subscriptionId,
  amount,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'razorpay' | 'manual' | null>(null);
  const [loading, setLoading] = useState(true);
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (error) throw error;
      setPaymentSettings(data);

      if (data.razorpay_enabled && !data.manual_payment_enabled) {
        setSelectedMethod('razorpay');
      } else if (!data.razorpay_enabled && data.manual_payment_enabled) {
        setSelectedMethod('manual');
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-proof-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleManualPaymentSubmit = async () => {
    if (!utrNumber && !screenshot) {
      alert('Please provide either UTR number or payment screenshot');
      return;
    }

    try {
      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let screenshotUrl = null;
      if (screenshot) {
        screenshotUrl = await handleScreenshotUpload(screenshot);
      }

      const { error } = await supabase
        .from('manual_payment_transactions')
        .insert({
          user_id: userData.user.id,
          subscription_id: subscriptionId || null,
          amount: amount,
          utr_number: utrNumber || null,
          screenshot_url: screenshotUrl,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRazorpayPayment = () => {
    alert('Razorpay integration coming soon!');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-gray-500">Loading payment options...</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Received!</h3>
            <p className="text-gray-600 mb-6">
              Your transaction will be confirmed within 6 hours. You'll receive a notification
              once your payment is approved.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onSuccess();
                onClose();
              }}
              className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {subscriptionId ? 'Complete Payment' : 'Recharge Wallet'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-gray-600">Amount to pay</p>
            <p className="text-2xl font-bold text-orange-600">₹{amount.toFixed(2)}</p>
          </div>

          {!selectedMethod && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Select Payment Method</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentSettings?.razorpay_enabled && (
                  <button
                    onClick={() => setSelectedMethod('razorpay')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <CreditCard className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">Razorpay</p>
                    <p className="text-xs text-gray-500 mt-1">Credit/Debit Card, UPI, Netbanking</p>
                  </button>
                )}
                {paymentSettings?.manual_payment_enabled && (
                  <button
                    onClick={() => setSelectedMethod('manual')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <Smartphone className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">Manual Payment</p>
                    <p className="text-xs text-gray-500 mt-1">UPI / QR Code</p>
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedMethod === 'razorpay' && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedMethod(null)}
                className="text-sm text-orange-600 hover:underline"
              >
                ← Change payment method
              </button>
              <div className="text-center py-8">
                <CreditCard className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                <button
                  onClick={handleRazorpayPayment}
                  className="bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 font-medium"
                >
                  Pay with Razorpay
                </button>
              </div>
            </div>
          )}

          {selectedMethod === 'manual' && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedMethod(null)}
                className="text-sm text-orange-600 hover:underline"
              >
                ← Change payment method
              </button>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-gray-900">Payment Details</h4>

                {paymentSettings?.upi_id && (
                  <div>
                    <label className="text-sm text-gray-600">UPI ID</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="font-mono font-medium text-gray-900">
                        {paymentSettings.upi_id}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paymentSettings.upi_id || '');
                          alert('UPI ID copied!');
                        }}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {paymentSettings?.phone_number && (
                  <div>
                    <label className="text-sm text-gray-600">Phone Number</label>
                    <p className="font-medium text-gray-900">{paymentSettings.phone_number}</p>
                  </div>
                )}

                {paymentSettings?.qr_code_url && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">
                      Scan QR Code to Pay
                    </label>
                    <div className="flex justify-center">
                      <img
                        src={paymentSettings.qr_code_url}
                        alt="Payment QR Code"
                        className="w-64 h-64 object-contain border rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Submit Payment Proof</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTR/Transaction Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter UTR or transaction number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Screenshot (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  {screenshot && (
                    <p className="text-sm text-green-600 mt-1">
                      Selected: {screenshot.name}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleManualPaymentSubmit}
                  disabled={uploading || (!utrNumber && !screenshot)}
                  className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>{uploading ? 'Submitting...' : 'Submit Payment'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
