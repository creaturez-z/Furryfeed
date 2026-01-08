import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WeightSlab } from '../../types/database';

export function WeightSlabManagement() {
  const [slabs, setSlabs] = useState<WeightSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlab, setEditingSlab] = useState<WeightSlab | null>(null);
  const [formData, setFormData] = useState({
    min_weight: '',
    max_weight: '',
    food_quantity: '',
  });

  useEffect(() => {
    fetchSlabs();
  }, []);

  const fetchSlabs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('weight_slabs')
      .select('*')
      .order('min_weight', { ascending: true });

    if (error) {
      console.error('Error fetching slabs:', error);
    } else {
      setSlabs(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slabData = {
      min_weight: parseFloat(formData.min_weight),
      max_weight: parseFloat(formData.max_weight),
      food_quantity: parseFloat(formData.food_quantity),
    };

    if (editingSlab) {
      const { error } = await supabase
        .from('weight_slabs')
        .update(slabData)
        .eq('id', editingSlab.id);

      if (error) {
        console.error('Error updating slab:', error);
        alert('Failed to update weight slab');
        return;
      }
    } else {
      const { error } = await supabase
        .from('weight_slabs')
        .insert([slabData]);

      if (error) {
        console.error('Error creating slab:', error);
        alert('Failed to create weight slab');
        return;
      }
    }

    setFormData({ min_weight: '', max_weight: '', food_quantity: '' });
    setShowForm(false);
    setEditingSlab(null);
    fetchSlabs();
  };

  const handleEdit = (slab: WeightSlab) => {
    setEditingSlab(slab);
    setFormData({
      min_weight: slab.min_weight.toString(),
      max_weight: slab.max_weight.toString(),
      food_quantity: slab.food_quantity.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weight slab?')) return;

    const { error } = await supabase
      .from('weight_slabs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting slab:', error);
      alert('Failed to delete weight slab');
      return;
    }

    fetchSlabs();
  };

  const handleCancel = () => {
    setFormData({ min_weight: '', max_weight: '', food_quantity: '' });
    setShowForm(false);
    setEditingSlab(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Weight-Based Pricing Slabs</h3>
          <p className="text-sm text-gray-600 mt-1">Define pet weight ranges and required food quantities</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Slab</span>
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSlab ? 'Edit Weight Slab' : 'Add New Weight Slab'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.min_weight}
                onChange={(e) => setFormData({ ...formData, min_weight: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.max_weight}
                onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Food Quantity (grams)
              </label>
              <input
                type="number"
                step="1"
                required
                value={formData.food_quantity}
                onChange={(e) => setFormData({ ...formData, food_quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 350"
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{editingSlab ? 'Update' : 'Create'}</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center space-x-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Weight Range</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Food Quantity</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slabs.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  No weight slabs found. Add your first slab to get started.
                </td>
              </tr>
            ) : (
              slabs.map((slab) => (
                <tr key={slab.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">
                      {slab.min_weight} - {slab.max_weight} kg
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-700">{slab.food_quantity}g per day</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(slab)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(slab.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How Weight Slabs Work:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Weight slabs determine the required daily food quantity based on pet weight</li>
          <li>Example: A 7kg pet falls in the 5-10kg range and needs 350g of food per day</li>
          <li>Final price = (food_quantity ÷ 10g) × meal_sale_price_per_10g</li>
          <li>Slabs should not overlap and should cover all expected pet weight ranges</li>
        </ul>
      </div>
    </div>
  );
}
