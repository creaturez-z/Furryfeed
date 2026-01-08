import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, Kitchen } from '../../types/database';
import { Plus } from 'lucide-react';

export function StaffManagement() {
  const [staff, setStaff] = useState<(Profile & { kitchen?: Kitchen })[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    kitchen_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadStaff(), loadKitchens()]);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'kitchen_staff');

      if (staffError) throw staffError;

      const { data: assignmentData } = await supabase
        .from('kitchen_staff')
        .select('profile_id, kitchen_id, kitchens(*)');

      const staffWithKitchens = (staffData || []).map((s) => {
        const assignment = assignmentData?.find((a) => a.profile_id === s.id);
        return {
          ...s,
          kitchen: assignment?.kitchens as Kitchen | undefined,
        };
      });

      setStaff(staffWithKitchens);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const loadKitchens = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setKitchens(data || []);
    } catch (error) {
      console.error('Error loading kitchens:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          name: formData.name,
          phone: formData.phone,
          role: 'kitchen_staff',
        });

        if (profileError) throw profileError;

        const { error: assignmentError } = await supabase.from('kitchen_staff').insert({
          profile_id: authData.user.id,
          kitchen_id: formData.kitchen_id,
        });

        if (assignmentError) throw assignmentError;
      }

      resetForm();
      await loadStaff();
    } catch (error) {
      console.error('Error creating staff:', error);
      alert('Failed to create staff member. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', phone: '', kitchen_id: '' });
    setShowForm(false);
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
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Kitchen Staff</span>
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Add Kitchen Staff</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Kitchen *</label>
              <select
                value={formData.kitchen_id}
                onChange={(e) => setFormData({ ...formData, kitchen_id: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select Kitchen</option>
                {kitchens.map((kitchen) => (
                  <option key={kitchen.id} value={kitchen.id}>
                    {kitchen.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Add Staff
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staff.map((member) => (
          <div key={member.id} className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Phone: {member.phone}</p>
              {member.kitchen && <p>Kitchen: {member.kitchen.name}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
