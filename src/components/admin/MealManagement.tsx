import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Meal } from '../../types/database';
import { Plus, Edit, Trash2 } from 'lucide-react';

export function MealManagement() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    full_description: '',
    ingredients: '',
    nutritional_info: '',
    image_url: '',
    base_price_per_10g: 10,
  });

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMeal) {
        const { error } = await supabase
          .from('meals')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingMeal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meals').insert(formData);
        if (error) throw error;
      }
      resetForm();
      await loadMeals();
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      name: meal.name,
      description: meal.description,
      full_description: meal.full_description,
      ingredients: meal.ingredients,
      nutritional_info: meal.nutritional_info || '',
      image_url: meal.image_url,
      base_price_per_10g: meal.base_price_per_10g,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;
    try {
      const { error } = await supabase.from('meals').delete().eq('id', id);
      if (error) throw error;
      await loadMeals();
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      full_description: '',
      ingredients: '',
      nutritional_info: '',
      image_url: '',
      base_price_per_10g: 10,
    });
    setEditingMeal(null);
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
          <span>Add New Meal</span>
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingMeal ? 'Edit Meal' : 'Add New Meal'}
          </h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per 10g (₹) *</label>
                <input
                  type="number"
                  value={formData.base_price_per_10g}
                  onChange={(e) => setFormData({ ...formData, base_price_per_10g: parseFloat(e.target.value) })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                required
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Short Description *</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Description *</label>
              <textarea
                value={formData.full_description}
                onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients *</label>
              <textarea
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nutritional Info</label>
              <textarea
                value={formData.nutritional_info}
                onChange={(e) => setFormData({ ...formData, nutritional_info: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                {editingMeal ? 'Update Meal' : 'Add Meal'}
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
        {meals.map((meal) => (
          <div key={meal.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <img src={meal.image_url} alt={meal.name} className="w-full h-48 object-cover" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">{meal.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(meal)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{meal.description}</p>
              <p className="text-orange-500 font-semibold">₹{meal.base_price_per_10g}/10g</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
