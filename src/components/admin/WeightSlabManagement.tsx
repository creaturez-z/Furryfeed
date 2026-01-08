import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WeightSlab, Meal } from '../../types/database';

type WeightSlabWithMeal = WeightSlab & {
  meal?: Meal;
};

export function WeightSlabManagement() {
  const [slabs, setSlabs] = useState<WeightSlabWithMeal[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlab, setEditingSlab] = useState<WeightSlab | null>(null);
  const [formData, setFormData] = useState({
    meal_id: '',
    min_weight: '',
    max_weight: '',
    food_quantity: '',
    price: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [slabsRes, mealsRes] = await Promise.all([
      supabase
        .from('weight_slabs')
        .select(`
          *,
          meal:meals(*)
        `)
        .order('meal_id')
        .order('min_weight', { ascending: true }),
      supabase
        .from('meals')
        .select('*')
        .eq('is_active', true)
        .order('name'),
    ]);

    if (slabsRes.error) {
      console.error('Error fetching slabs:', slabsRes.error);
    } else {
      setSlabs(slabsRes.data || []);
    }

    if (mealsRes.error) {
      console.error('Error fetching meals:', mealsRes.error);
    } else {
      setMeals(mealsRes.data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slabData = {
      meal_id: formData.meal_id,
      min_weight: parseFloat(formData.min_weight),
      max_weight: parseFloat(formData.max_weight),
      food_quantity: parseFloat(formData.food_quantity),
      price: parseFloat(formData.price),
    };

    if (editingSlab) {
      const { error } = await supabase
        .from('weight_slabs')
        .update(slabData)
        .eq('id', editingSlab.id);

      if (error) {
        console.error('Error updating slab:', error);
        alert('Failed to update weight slab: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('weight_slabs')
        .insert([slabData]);

      if (error) {
        console.error('Error creating slab:', error);
        alert('Failed to create weight slab: ' + error.message);
        return;
      }
    }

    setFormData({ meal_id: '', min_weight: '', max_weight: '', food_quantity: '', price: '' });
    setShowForm(false);
    setEditingSlab(null);
    fetchData();
  };

  const handleEdit = (slab: WeightSlab) => {
    setEditingSlab(slab);
    setFormData({
      meal_id: slab.meal_id,
      min_weight: slab.min_weight.toString(),
      max_weight: slab.max_weight.toString(),
      food_quantity: slab.food_quantity.toString(),
      price: slab.price.toString(),
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

    fetchData();
  };

  const handleCancel = () => {
    setFormData({ meal_id: '', min_weight: '', max_weight: '', food_quantity: '', price: '' });
    setShowForm(false);
    setEditingSlab(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  const groupedSlabs = slabs.reduce((acc, slab) => {
    const mealId = slab.meal_id;
    if (!acc[mealId]) {
      acc[mealId] = [];
    }
    acc[mealId].push(slab);
    return acc;
  }, {} as Record<string, WeightSlabWithMeal[]>);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Weight-Based Pricing Slabs</h3>
          <p className="text-sm text-gray-600 mt-1">Define pet weight ranges and pricing for each meal</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal *
              </label>
              <select
                required
                value={formData.meal_id}
                onChange={(e) => setFormData({ ...formData, meal_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select meal</option>
                {meals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Weight (kg) *
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
                Max Weight (kg) *
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
                Food Quantity (g) *
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 150"
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

      {Object.keys(groupedSlabs).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No weight slabs found. Add your first slab to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSlabs).map(([mealId, mealSlabs]) => {
            const meal = mealSlabs[0]?.meal;
            return (
              <div key={mealId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">{meal?.name || 'Unknown Meal'}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Weight Range</th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Food Quantity</th>
                        <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Price</th>
                        <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealSlabs.map((slab) => (
                        <tr key={slab.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <span className="font-medium text-gray-900">
                              {slab.min_weight} - {slab.max_weight} kg
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-700">{slab.food_quantity}g per day</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-orange-600 font-medium">₹{slab.price.toFixed(2)}</span>
                          </td>
                          <td className="py-4 px-6">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">How Weight Slabs Work:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Weight slabs determine the required daily food quantity and price based on pet weight</li>
          <li>Example: A 7kg pet falls in the 5-10kg range and needs 350g of food per day at ₹150</li>
          <li>Each meal can have multiple weight slabs for different pet sizes</li>
          <li>Slabs for the same meal should not overlap and should cover all expected pet weight ranges</li>
        </ul>
      </div>
    </div>
  );
}
