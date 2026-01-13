import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Tag, Calendar, Users, Package, TrendingUp, X } from 'lucide-react';

type Coupon = {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  start_date: string;
  expiry_date: string;
  total_usage_limit: number | null;
  per_user_usage_limit: number | null;
  user_eligibility: 'all' | 'new_users' | 'existing_users' | 'specific_users';
  product_applicability: 'all' | 'specific_products';
  minimum_order_value: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  name: string;
  email: string;
};

type Meal = {
  id: string;
  name: string;
};

export function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [usageStats, setUsageStats] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'flat' | 'percentage',
    discount_value: 0,
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    total_usage_limit: '',
    per_user_usage_limit: '',
    minimum_order_value: '',
    user_eligibility: 'all' as 'all' | 'new_users' | 'existing_users' | 'specific_users',
    product_applicability: 'all' as 'all' | 'specific_products',
    is_active: true,
    selectedUsers: [] as string[],
    selectedMeals: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [couponsRes, profilesRes, mealsRes] = await Promise.all([
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, email').eq('role', 'customer').order('name'),
        supabase.from('meals').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (couponsRes.data) {
        setCoupons(couponsRes.data);
        await loadUsageStats(couponsRes.data.map(c => c.id));
      }
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (mealsRes.data) setMeals(mealsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async (couponIds: string[]) => {
    const stats: Record<string, number> = {};
    for (const id of couponIds) {
      const { count } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', id);
      stats[id] = count || 0;
    }
    setUsageStats(stats);
  };

  const openModal = async (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);

      const [usersRes, mealsRes] = await Promise.all([
        supabase.from('coupon_users').select('user_id').eq('coupon_id', coupon.id),
        supabase.from('coupon_products').select('meal_id').eq('coupon_id', coupon.id),
      ]);

      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        start_date: coupon.start_date,
        expiry_date: coupon.expiry_date,
        total_usage_limit: coupon.total_usage_limit?.toString() || '',
        per_user_usage_limit: coupon.per_user_usage_limit?.toString() || '',
        minimum_order_value: coupon.minimum_order_value?.toString() || '',
        user_eligibility: coupon.user_eligibility,
        product_applicability: coupon.product_applicability,
        is_active: coupon.is_active,
        selectedUsers: usersRes.data?.map(u => u.user_id) || [],
        selectedMeals: mealsRes.data?.map(m => m.meal_id) || [],
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        start_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        total_usage_limit: '',
        per_user_usage_limit: '',
        minimum_order_value: '',
        user_eligibility: 'all',
        product_applicability: 'all',
        is_active: true,
        selectedUsers: [],
        selectedMeals: [],
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        start_date: formData.start_date,
        expiry_date: formData.expiry_date,
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        per_user_usage_limit: formData.per_user_usage_limit ? parseInt(formData.per_user_usage_limit) : null,
        minimum_order_value: formData.minimum_order_value ? parseFloat(formData.minimum_order_value) : null,
        user_eligibility: formData.user_eligibility,
        product_applicability: formData.product_applicability,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;

        if (formData.user_eligibility === 'specific_users') {
          await supabase.from('coupon_users').delete().eq('coupon_id', editingCoupon.id);
          if (formData.selectedUsers.length > 0) {
            await supabase.from('coupon_users').insert(
              formData.selectedUsers.map(userId => ({
                coupon_id: editingCoupon.id,
                user_id: userId,
              }))
            );
          }
        }

        if (formData.product_applicability === 'specific_products') {
          await supabase.from('coupon_products').delete().eq('coupon_id', editingCoupon.id);
          if (formData.selectedMeals.length > 0) {
            await supabase.from('coupon_products').insert(
              formData.selectedMeals.map(mealId => ({
                coupon_id: editingCoupon.id,
                meal_id: mealId,
              }))
            );
          }
        }
      } else {
        const { data: newCoupon, error } = await supabase
          .from('coupons')
          .insert(couponData)
          .select()
          .single();

        if (error) throw error;

        if (newCoupon && formData.user_eligibility === 'specific_users' && formData.selectedUsers.length > 0) {
          await supabase.from('coupon_users').insert(
            formData.selectedUsers.map(userId => ({
              coupon_id: newCoupon.id,
              user_id: userId,
            }))
          );
        }

        if (newCoupon && formData.product_applicability === 'specific_products' && formData.selectedMeals.length > 0) {
          await supabase.from('coupon_products').insert(
            formData.selectedMeals.map(mealId => ({
              coupon_id: newCoupon.id,
              meal_id: mealId,
            }))
          );
        }
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving coupon:', error);
      alert('Failed to save coupon');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Failed to delete coupon');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Coupon Management</h2>
        <button
          onClick={() => openModal()}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-orange-500" />
                <span className="text-xl font-bold text-gray-900">{coupon.code}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openModal(coupon)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(coupon.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Discount:</span>
                <span className="font-semibold text-orange-500">
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}%`
                    : `₹${coupon.discount_value}`}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(coupon.start_date).toLocaleDateString()} - {new Date(coupon.expiry_date).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Used: {usageStats[coupon.id] || 0}</span>
                {coupon.total_usage_limit && <span>/ {coupon.total_usage_limit}</span>}
              </div>

              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="capitalize">{coupon.user_eligibility.replace('_', ' ')}</span>
              </div>

              <div className="flex items-center space-x-2 text-gray-600">
                <Package className="w-4 h-4" />
                <span className="capitalize">{coupon.product_applicability.replace('_', ' ')}</span>
              </div>

              {coupon.minimum_order_value && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <span className="text-sm">Min. order: ₹{coupon.minimum_order_value.toFixed(2)}</span>
                </div>
              )}

              <div className="mt-3 pt-3 border-t">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {coupon.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.is_active.toString()}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'flat' | 'percentage' })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Usage Limit (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.total_usage_limit}
                    onChange={(e) => setFormData({ ...formData, total_usage_limit: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Per User Usage Limit (optional)
                  </label>
                  <input
                    type="number"
                    value={formData.per_user_usage_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_usage_limit: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Value (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minimum_order_value}
                    onChange={(e) => setFormData({ ...formData, minimum_order_value: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="No minimum"
                  />
                  <p className="text-xs text-gray-500 mt-1">Coupon applies only if order value meets this amount</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User Eligibility</label>
                <select
                  value={formData.user_eligibility}
                  onChange={(e) => setFormData({ ...formData, user_eligibility: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Users</option>
                  <option value="new_users">New Users Only</option>
                  <option value="existing_users">Existing Users Only</option>
                  <option value="specific_users">Specific Users</option>
                </select>
              </div>

              {formData.user_eligibility === 'specific_users' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Users</label>
                  <div className="border rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
                    {profiles.map((profile) => (
                      <label key={profile.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.selectedUsers.includes(profile.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedUsers: [...formData.selectedUsers, profile.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedUsers: formData.selectedUsers.filter((id) => id !== profile.id),
                              });
                            }
                          }}
                          className="rounded text-orange-500"
                        />
                        <span className="text-sm">{profile.name} ({profile.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Applicability</label>
                <select
                  value={formData.product_applicability}
                  onChange={(e) => setFormData({ ...formData, product_applicability: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Products</option>
                  <option value="specific_products">Specific Products</option>
                </select>
              </div>

              {formData.product_applicability === 'specific_products' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Products</label>
                  <div className="border rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
                    {meals.map((meal) => (
                      <label key={meal.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.selectedMeals.includes(meal.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedMeals: [...formData.selectedMeals, meal.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedMeals: formData.selectedMeals.filter((id) => id !== meal.id),
                              });
                            }
                          }}
                          className="rounded text-orange-500"
                        />
                        <span className="text-sm">{meal.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
