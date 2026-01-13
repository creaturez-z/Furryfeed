import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Gift, TrendingUp, Settings, Save, UserPlus, Calendar, Tag } from 'lucide-react';

type ReferralSettings = {
  id: string;
  max_coupons_per_order: number | null;
  max_discount_percentage: number | null;
  stacking_policy: 'enabled' | 'partial' | 'disabled';
};

type CustomerReferralStats = {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  referral_code: string;
  total_earned: number;
  total_used: number;
  discount_earned: number;
  discount_used: number;
  coupons: Array<{
    code: string;
    status: 'active' | 'used' | 'expired';
    discount_value: number;
    discount_type: 'flat' | 'percentage';
    expiry_date: string;
    times_used: number;
  }>;
};

type ReferralRelationship = {
  referrer_id: string;
  referrer_name: string;
  referrer_email: string;
  referrer_code: string;
  referred_id: string;
  referred_name: string;
  referred_email: string;
  referral_date: string;
};

export function ReferralCouponsManagement() {
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics' | 'customers'>('analytics');
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerReferralStats[]>([]);
  const [referralRelationships, setReferralRelationships] = useState<ReferralRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    max_coupons_per_order: '',
    max_discount_percentage: '100',
    stacking_policy: 'enabled' as 'enabled' | 'partial' | 'disabled',
  });

  const [analyticsData, setAnalyticsData] = useState({
    totalReferrals: 0,
    totalCustomersWithReferrals: 0,
    totalReferralCouponsEarned: 0,
    totalReferralCouponsUsed: 0,
    totalDiscountGiven: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSettings(),
        loadAnalytics(),
        loadCustomerStats(),
        loadReferralRelationships(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('referral_coupon_settings')
      .select('*')
      .maybeSingle();

    if (!error && data) {
      setSettings(data);
      setFormData({
        max_coupons_per_order: data.max_coupons_per_order?.toString() || '',
        max_discount_percentage: data.max_discount_percentage?.toString() || '100',
        stacking_policy: data.stacking_policy,
      });
    }
  };

  const loadAnalytics = async () => {
    const { data: referrals } = await supabase
      .from('profiles')
      .select('id, referred_by_user_id, referral_date')
      .not('referred_by_user_id', 'is', null);

    const { data: earnedCoupons } = await supabase
      .from('referral_coupons_earned')
      .select('id, coupon_id');

    const { data: usedCoupons } = await supabase
      .from('coupon_usage')
      .select('discount_amount, coupon_id')
      .in('coupon_id', (await supabase.from('coupons').select('id').eq('is_referral', true)).data?.map(c => c.id) || []);

    const totalDiscountGiven = usedCoupons?.reduce((sum, u) => sum + u.discount_amount, 0) || 0;

    setAnalyticsData({
      totalReferrals: referrals?.length || 0,
      totalCustomersWithReferrals: new Set(referrals?.map(r => r.referred_by_user_id)).size,
      totalReferralCouponsEarned: earnedCoupons?.length || 0,
      totalReferralCouponsUsed: usedCoupons?.length || 0,
      totalDiscountGiven,
    });
  };

  const loadCustomerStats = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, referral_code')
      .eq('role', 'customer')
      .order('name');

    if (!profiles) return;

    const stats: CustomerReferralStats[] = [];

    for (const profile of profiles) {
      const { data: earnedCoupons } = await supabase
        .from('referral_coupons_earned')
        .select('coupon_id, coupons(code, discount_type, discount_value, expiry_date, is_active)')
        .eq('customer_id', profile.id);

      const couponIds = earnedCoupons?.map(ec => ec.coupon_id) || [];

      const { data: usageData } = await supabase
        .from('coupon_usage')
        .select('coupon_id, discount_amount')
        .eq('user_id', profile.id)
        .in('coupon_id', couponIds);

      const usedCouponIds = new Set(usageData?.map(u => u.coupon_id) || []);
      const totalDiscountUsed = usageData?.reduce((sum, u) => sum + u.discount_amount, 0) || 0;

      const coupons = earnedCoupons?.map(ec => {
        const coupon = ec.coupons as any;
        const isExpired = new Date(coupon.expiry_date) < new Date();
        const isUsed = usedCouponIds.has(ec.coupon_id);
        const timesUsed = usageData?.filter(u => u.coupon_id === ec.coupon_id).length || 0;

        let status: 'active' | 'used' | 'expired' = 'active';
        if (isExpired) status = 'expired';
        else if (isUsed) status = 'used';

        return {
          code: coupon.code,
          status,
          discount_value: coupon.discount_value,
          discount_type: coupon.discount_type,
          expiry_date: coupon.expiry_date,
          times_used: timesUsed,
        };
      }) || [];

      const totalEarned = coupons.length;
      const totalUsed = coupons.filter(c => c.status === 'used').length;
      const discountEarned = coupons.reduce((sum, c) => {
        if (c.discount_type === 'flat') return sum + c.discount_value;
        return sum;
      }, 0);

      if (totalEarned > 0) {
        stats.push({
          customer_id: profile.id,
          customer_name: profile.name,
          customer_email: profile.email,
          referral_code: profile.referral_code || '',
          total_earned: totalEarned,
          total_used: totalUsed,
          discount_earned: discountEarned,
          discount_used: totalDiscountUsed,
          coupons,
        });
      }
    }

    setCustomerStats(stats);
  };

  const loadReferralRelationships = async () => {
    const { data: referrals } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        email,
        referral_date,
        referred_by_user_id,
        referrer:profiles!profiles_referred_by_user_id_fkey(id, name, email, referral_code)
      `)
      .not('referred_by_user_id', 'is', null)
      .order('referral_date', { ascending: false });

    if (!referrals) return;

    const relationships: ReferralRelationship[] = referrals
      .filter(r => r.referrer)
      .map(r => ({
        referrer_id: (r.referrer as any).id,
        referrer_name: (r.referrer as any).name,
        referrer_email: (r.referrer as any).email,
        referrer_code: (r.referrer as any).referral_code,
        referred_id: r.id,
        referred_name: r.name,
        referred_email: r.email,
        referral_date: r.referral_date || '',
      }));

    setReferralRelationships(relationships);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
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

  const selectedCustomer = customerStats.find(c => c.customer_id === selectedCustomerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Gift className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-900">Referral Coupons Management</h2>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Analytics</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'customers'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Customer Tracking</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3">
                <UserPlus className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-sm text-gray-600">Total Referrals</div>
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.totalReferrals}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-green-500" />
                <div>
                  <div className="text-sm text-gray-600">Active Referrers</div>
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.totalCustomersWithReferrals}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3">
                <Gift className="w-8 h-8 text-purple-500" />
                <div>
                  <div className="text-sm text-gray-600">Coupons Earned</div>
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.totalReferralCouponsEarned}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3">
                <Tag className="w-8 h-8 text-orange-500" />
                <div>
                  <div className="text-sm text-gray-600">Coupons Used</div>
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.totalReferralCouponsUsed}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-red-500" />
                <div>
                  <div className="text-sm text-gray-600">Total Discount</div>
                  <div className="text-2xl font-bold text-gray-900">₹{analyticsData.totalDiscountGiven.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Referral Relationships</h3>
              <p className="text-sm text-gray-600 mt-1">Who referred whom</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signup Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {referralRelationships.map((rel, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rel.referrer_name}</div>
                          <div className="text-xs text-gray-500">{rel.referrer_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                          {rel.referrer_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{rel.referred_name}</div>
                          <div className="text-xs text-gray-500">{rel.referred_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {rel.referral_date ? new Date(rel.referral_date).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {referralRelationships.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No referral relationships found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Customer Referral Tracking</h3>
              <p className="text-sm text-gray-600 mt-1">View earned and used referral coupons per customer</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Code</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Earned</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount Earned</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount Used</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customerStats.map((customer) => (
                    <tr key={customer.customer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.customer_name}</div>
                          <div className="text-xs text-gray-500">{customer.customer_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          {customer.referral_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {customer.total_earned}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {customer.total_used}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                        ₹{customer.discount_earned.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-orange-600">
                        ₹{customer.discount_used.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedCustomerId(customer.customer_id)}
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customerStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No customers with referral coupons found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedCustomer && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedCustomer.customer_name}</h3>
                  <p className="text-sm text-gray-600">{selectedCustomer.customer_email}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>
              <div className="p-6">
                <h4 className="font-medium text-gray-900 mb-4">Referral Coupons</h4>
                <div className="space-y-3">
                  {selectedCustomer.coupons.map((coupon, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-gray-900">{coupon.code}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            coupon.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : coupon.status === 'used'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {coupon.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% off`
                            : `₹${coupon.discount_value} off`}
                          {' • '}
                          Expires: {new Date(coupon.expiry_date).toLocaleDateString()}
                          {' • '}
                          Used {coupon.times_used} {coupon.times_used === 1 ? 'time' : 'times'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Referral Coupon Settings</h3>
            <p className="text-sm text-gray-600 mt-1">Configure how referral coupons can be stacked and used</p>
          </div>

          <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
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
        </div>
      )}
    </div>
  );
}
