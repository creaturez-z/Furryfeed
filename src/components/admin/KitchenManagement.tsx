import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Kitchen } from '../../types/database';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export function KitchenManagement() {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState<Kitchen | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });

  useEffect(() => {
    loadKitchens();
  }, []);

  const loadKitchens = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKitchens(data || []);
    } catch (error) {
      console.error('Error loading kitchens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingKitchen) {
        const { error } = await supabase
          .from('kitchens')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingKitchen.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kitchens').insert(formData);
        if (error) throw error;
      }
      resetForm();
      await loadKitchens();
    } catch (error) {
      console.error('Error saving kitchen:', error);
    }
  };

  const handleEdit = (kitchen: Kitchen) => {
    setEditingKitchen(kitchen);
    setFormData({
      name: kitchen.name,
      address: kitchen.address,
    });
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('kitchens')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      await loadKitchens();
    } catch (error) {
      console.error('Error toggling kitchen status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this kitchen?')) return;
    try {
      const { error } = await supabase.from('kitchens').delete().eq('id', id);
      if (error) throw error;
      await loadKitchens();
    } catch (error) {
      console.error('Error deleting kitchen:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', address: '' });
    setEditingKitchen(null);
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
          <span>Add New Kitchen</span>
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingKitchen ? 'Edit Kitchen' : 'Add New Kitchen'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kitchen Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                {editingKitchen ? 'Update Kitchen' : 'Add Kitchen'}
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
        {kitchens.map((kitchen) => (
          <div key={kitchen.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{kitchen.name}</h3>
                <p className="text-gray-600 text-sm">{kitchen.address}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleToggleActive(kitchen.id, kitchen.is_active)}
                  className={`p-2 rounded-lg ${
                    kitchen.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {kitchen.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleEdit(kitchen)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(kitchen.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                kitchen.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {kitchen.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
