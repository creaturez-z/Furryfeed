import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, Kitchen } from '../../types/database';
import { Plus } from 'lucide-react';

export function DeliveryManagement() {
  const [deliveryPersons, setDeliveryPersons] = useState<(Profile & { kitchen?: Kitchen; is_available?: boolean })[]>([]);
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
      await Promise.all([loadDeliveryPersons(), loadKitchens()]);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryPersons = async () => {
    try {
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'delivery_person');

      if (deliveryError) throw deliveryError;

      const { data: assignmentData } = await supabase
        .from('delivery_persons')
        .select('profile_id, kitchen_id, is_available, kitchens(*)');

      const deliveryWithKitchens = (deliveryData || []).map((d) => {
        const assignment = assignmentData?.find((a) => a.profile_id === d.id);
        return {
          ...d,
          kitchen: assignment?.kitchens as Kitchen | undefined,
          is_available: assignment?.is_available,
        };
      });

      setDeliveryPersons(deliveryWithKitchens);
    } catch (error) {
      console.error('Error loading delivery persons:', error);
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
          role: 'delivery_person',
        });

        if (profileError) throw profileError;

        const { error: assignmentError } = await supabase.from('delivery_persons').insert({
          profile_id: authData.user.id,
          kitchen_id: formData.kitchen_id,
        });

        if (assignmentError) throw assignmentError;
      }

      resetForm();
      await loadDeliveryPersons();
    } catch (error) {
      console.error('Error creating delivery person:', error);
      alert('Failed to create delivery person. Please try again.');
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
          <span>Add Delivery Person</span>
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Add Delivery Person</h3>
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">Delivery Charge Settings:</p>
              <p>₹25 applied if order value is less than ₹90</p>
              <p>No charge if order value is ₹90 or more</p>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Add Delivery Person
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
        {deliveryPersons.map((person) => (
          <div key={person.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900">{person.name}</h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  person.is_available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {person.is_available ? 'Available' : 'Busy'}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Phone: {person.phone}</p>
              {person.kitchen && <p>Kitchen: {person.kitchen.name}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
