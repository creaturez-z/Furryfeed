import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Plus, Trash2, Save, Eye, EyeOff, Send, Check, X, RefreshCw } from 'lucide-react';

interface EmailSettings {
  id: string;
  email_provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  resend_api_key: string | null;
  is_enabled: boolean;
}

interface EmailRecipient {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
}

interface EmailTemplate {
  id: string;
  event_type: string;
  subject: string;
  body: string;
  is_enabled: boolean;
}

interface EmailLog {
  id: string;
  event_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'customer_signup', label: 'Customer Signup' },
  { value: 'wallet_recharge', label: 'Wallet Recharge' },
  { value: 'manual_payment_submitted', label: 'Manual Payment Submitted' },
  { value: 'manual_payment_approved', label: 'Manual Payment Approved' },
  { value: 'manual_payment_rejected', label: 'Manual Payment Rejected' },
  { value: 'profile_updated', label: 'Profile Updated' },
  { value: 'pet_added', label: 'Pet Added' },
  { value: 'pet_updated', label: 'Pet Updated' },
  { value: 'subscription_created', label: 'Subscription Created' },
  { value: 'subscription_cancelled', label: 'Subscription Cancelled' },
  { value: 'invoice_generated', label: 'Invoice Generated' },
  { value: 'manual_payment_pending', label: 'Manual Payment Pending' },
];

export function EmailSettingsManagement() {
  const [activeTab, setActiveTab] = useState<'settings' | 'recipients' | 'templates' | 'logs'>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    email_provider: 'resend',
    smtp_host: 'smtp.zoho.com',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    sender_email: '',
    sender_name: 'Pet Subscription Service',
    resend_api_key: '',
    is_enabled: false,
  });

  // Recipients State
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [newRecipient, setNewRecipient] = useState({ email: '', name: '' });
  const [showAddRecipient, setShowAddRecipient] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({ subject: '', body: '' });

  // Logs State
  const [logs, setLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSettings(),
        loadRecipients(),
        loadTemplates(),
        loadLogs(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading settings:', error);
      return;
    }

    if (data) {
      setSettings(data);
      setSettingsForm({
        email_provider: data.email_provider || 'resend',
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_username: data.smtp_username,
        smtp_password: data.smtp_password,
        sender_email: data.sender_email,
        sender_name: data.sender_name,
        resend_api_key: data.resend_api_key || '',
        is_enabled: data.is_enabled,
      });
    }
  };

  const loadRecipients = async () => {
    const { data, error } = await supabase
      .from('email_recipients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading recipients:', error);
      return;
    }

    setRecipients(data || []);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('event_type');

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading logs:', error);
      return;
    }

    setLogs(data || []);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from('email_settings')
          .update(settingsForm)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_settings')
          .insert([settingsForm]);

        if (error) throw error;
      }

      alert('Settings saved successfully!');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.email || !newRecipient.name) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('email_recipients')
        .insert([{ ...newRecipient, is_active: true }]);

      if (error) throw error;

      alert('Recipient added successfully!');
      setNewRecipient({ email: '', name: '' });
      setShowAddRecipient(false);
      await loadRecipients();
    } catch (error) {
      console.error('Error adding recipient:', error);
      alert('Failed to add recipient');
    }
  };

  const handleToggleRecipient = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('email_recipients')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await loadRecipients();
    } catch (error) {
      console.error('Error toggling recipient:', error);
      alert('Failed to update recipient');
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipient?')) return;

    try {
      const { error } = await supabase
        .from('email_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadRecipients();
    } catch (error) {
      console.error('Error deleting recipient:', error);
      alert('Failed to delete recipient');
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({ subject: template.subject, body: template.body });
    setEditingTemplate(false);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: templateForm.subject,
          body: templateForm.body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      alert('Template saved successfully!');
      setEditingTemplate(false);
      await loadTemplates();
      const updatedTemplate = templates.find(t => t.id === selectedTemplate.id);
      if (updatedTemplate) {
        setSelectedTemplate({ ...updatedTemplate, subject: templateForm.subject, body: templateForm.body });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTemplate = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_enabled: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await loadTemplates();
      if (selectedTemplate?.id === id) {
        setSelectedTemplate({ ...selectedTemplate, is_enabled: !currentStatus });
      }
    } catch (error) {
      console.error('Error toggling template:', error);
      alert('Failed to update template');
    }
  };

  const handleTestEmail = async () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
      return;
    }

    if (!settingsForm.is_enabled) {
      alert('Email system is disabled. Please enable it first.');
      return;
    }

    setTestingEmail(true);
    try {
      const testVariables: Record<string, string> = {
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '+1234567890',
        amount: '100.00',
        new_balance: '500.00',
        pet_name: 'Max',
        pet_type: 'Dog',
        breed: 'Golden Retriever',
        weight: '25',
        age: '3 years',
        meal_plan: 'Premium Dog Food',
        frequency: 'Daily',
        start_date: new Date().toLocaleDateString(),
        invoice_number: 'INV-TEST-001',
        invoice_date: new Date().toLocaleDateString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        total_amount: '1500.00',
        invoice_status: 'Pending',
        invoice_items: 'Sample Item 1\nSample Item 2',
        transaction_date: new Date().toLocaleString(),
        transaction_id: 'TXN-TEST-001',
        payment_method: 'Bank Transfer',
        notes: 'This is a test email',
        submitted_date: new Date().toLocaleString(),
        approved_date: new Date().toLocaleString(),
        approved_by: 'Admin User',
        rejected_date: new Date().toLocaleString(),
        rejected_by: 'Admin User',
        rejection_reason: 'Test rejection reason',
        reason: 'Test transaction',
        updated_fields: 'Name, Email, Phone',
        update_date: new Date().toLocaleString(),
        added_date: new Date().toLocaleString(),
        signup_date: new Date().toLocaleString(),
        cancellation_date: new Date().toLocaleString(),
        cancellation_reason: 'Test cancellation',
        status: 'Active',
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: selectedTemplate.event_type,
            variables: testVariables,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Test email sent successfully! Check your inbox.');
        await loadLogs();
      } else {
        alert(`Failed to send test email: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email');
    } finally {
      setTestingEmail(false);
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
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Mail className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900">Email Management</h2>
          </div>
          <button
            onClick={loadData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex space-x-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            SMTP Settings
          </button>
          <button
            onClick={() => setActiveTab('recipients')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'recipients'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recipients
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Email Templates
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'logs'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Email Logs
          </button>
        </div>

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">Email System Status</h3>
                <p className="text-sm text-gray-600">
                  {settingsForm.is_enabled ? 'Emails are being sent' : 'Email system is disabled'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSettingsForm({ ...settingsForm, is_enabled: !settingsForm.is_enabled });
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  settingsForm.is_enabled
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {settingsForm.is_enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Important: Email Provider</h4>
              <p className="text-sm text-blue-800">
                SMTP doesn't work in serverless environments. Use <strong>Resend</strong> for reliable email delivery.
                Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a> to get your API key.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Provider *
              </label>
              <select
                value={settingsForm.email_provider}
                onChange={(e) => setSettingsForm({ ...settingsForm, email_provider: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="resend">Resend (Recommended)</option>
                <option value="smtp">SMTP (Not Supported)</option>
              </select>
            </div>

            {settingsForm.email_provider === 'smtp' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 font-semibold">
                  Warning: SMTP is not supported in Edge Functions. Please use Resend instead.
                </p>
              </div>
            )}

            {settingsForm.email_provider === 'resend' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resend API Key *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={settingsForm.resend_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, resend_api_key: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="re_xxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sender Email *
                    </label>
                    <input
                      type="email"
                      value={settingsForm.sender_email}
                      onChange={(e) => setSettingsForm({ ...settingsForm, sender_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="noreply@yourdomain.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be verified in Resend</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sender Name *
                    </label>
                    <input
                      type="text"
                      value={settingsForm.sender_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, sender_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Pet Subscription Service"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 pointer-events-none">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    value={settingsForm.smtp_host}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="smtp.zoho.com"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port *
                  </label>
                  <input
                    type="number"
                    value={settingsForm.smtp_port}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="587"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Username *
                  </label>
                  <input
                    type="text"
                    value={settingsForm.smtp_username}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="your-email@zoho.com"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Password *
                  </label>
                  <input
                    type="password"
                    value={settingsForm.smtp_password}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Your password"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sender Email *
                  </label>
                  <input
                    type="email"
                    value={settingsForm.sender_email}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="noreply@yourdomain.com"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sender Name *
                  </label>
                  <input
                    type="text"
                    value={settingsForm.sender_name}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Pet Subscription Service"
                    disabled
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        )}

        {activeTab === 'recipients' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Manage who receives email notifications
              </p>
              <button
                onClick={() => setShowAddRecipient(!showAddRecipient)}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Add Recipient</span>
              </button>
            </div>

            {showAddRecipient && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newRecipient.name}
                    onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newRecipient.email}
                    onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddRecipient}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddRecipient(false);
                      setNewRecipient({ email: '', name: '' });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {recipients.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No recipients added yet</p>
              ) : (
                recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{recipient.name}</p>
                      <p className="text-sm text-gray-600">{recipient.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleRecipient(recipient.id, recipient.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          recipient.is_active
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        }`}
                      >
                        {recipient.is_active ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteRecipient(recipient.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Event Types</h3>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {EVENT_TYPES.find(e => e.value === template.event_type)?.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTemplate(template.id, template.is_enabled);
                      }}
                      className={`p-1 rounded transition-colors ${
                        template.is_enabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {template.is_enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{template.subject}</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {EVENT_TYPES.find(e => e.value === selectedTemplate.event_type)?.label}
                    </h3>
                    <div className="flex space-x-2">
                      {!editingTemplate ? (
                        <>
                          <button
                            onClick={handleTestEmail}
                            disabled={testingEmail}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            <span>{testingEmail ? 'Sending...' : 'Test Email'}</span>
                          </button>
                          <button
                            onClick={() => setEditingTemplate(true)}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Edit Template
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveTemplate}
                            disabled={saving}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Save'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(false);
                              setTemplateForm({ subject: selectedTemplate.subject, body: selectedTemplate.body });
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Available Variables</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <code className="text-blue-700">{'{{customer_name}}'}</code>
                      <code className="text-blue-700">{'{{customer_email}}'}</code>
                      <code className="text-blue-700">{'{{customer_phone}}'}</code>
                      <code className="text-blue-700">{'{{amount}}'}</code>
                      <code className="text-blue-700">{'{{pet_name}}'}</code>
                      <code className="text-blue-700">{'{{pet_type}}'}</code>
                      <code className="text-blue-700">{'{{breed}}'}</code>
                      <code className="text-blue-700">{'{{weight}}'}</code>
                      <code className="text-blue-700">{'{{meal_plan}}'}</code>
                      <code className="text-blue-700">{'{{invoice_number}}'}</code>
                      <code className="text-blue-700">{'{{transaction_id}}'}</code>
                      <code className="text-blue-700">{'{{status}}'}</code>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    {editingTemplate ? (
                      <input
                        type="text"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    ) : (
                      <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                        {selectedTemplate.subject}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Body
                    </label>
                    {editingTemplate ? (
                      <textarea
                        value={templateForm.body}
                        onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                        rows={12}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                      />
                    ) : (
                      <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap font-mono text-sm">
                        {selectedTemplate.body}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select an event type to view and edit its template
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No email logs yet</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${
                    log.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.status === 'success'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {EVENT_TYPES.find(e => e.value === log.event_type)?.label || log.event_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">To: {log.recipient_email}</p>
                      <p className="text-sm text-gray-700 mb-1">Subject: {log.subject}</p>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-2">Error: {log.error_message}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{new Date(log.created_at).toLocaleDateString()}</p>
                      <p>{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
