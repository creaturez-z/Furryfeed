import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Meal, Category, MealIngredient } from '../../types/database';
import { Plus, Edit, Trash2, X, Save } from 'lucide-react';

export function MealManagement() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryMappings, setInventoryMappings] = useState<any[]>([]);
  const [newMapping, setNewMapping] = useState({
    inventory_item_id: '',
    quantity_used: '',
  });
  const [newIngredient, setNewIngredient] = useState({
    ingredient_name: '',
    quantity: '',
    unit: 'grams' as 'grams' | 'kg' | 'ml' | 'liters' | 'pieces',
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    full_description: '',
    ingredients: '',
    nutritional_info: '',
    image_url: '',
    category_id: '',
    mrp: '',
    sale_price: '',
    base_price_per_10g: 10,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mealsRes, categoriesRes, inventoryRes] = await Promise.all([
        supabase.from('meals').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('is_active', true).order('name'),
        supabase.from('inventory_items').select('*').order('name'),
      ]);

      if (mealsRes.error) throw mealsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (inventoryRes.error) throw inventoryRes.error;

      setMeals(mealsRes.data || []);
      setCategories(categoriesRes.data || []);
      setInventoryItems(inventoryRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMealIngredients = async (mealId: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_ingredients')
        .select('*')
        .eq('meal_id', mealId);

      if (error) throw error;
      setMealIngredients(data || []);
    } catch (error) {
      console.error('Error loading ingredients:', error);
    }
  };

  const loadInventoryMappings = async (mealId: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_inventory_mapping')
        .select('*, inventory_items(name, unit)')
        .eq('meal_id', mealId);

      if (error) throw error;
      setInventoryMappings(data || []);
    } catch (error) {
      console.error('Error loading inventory mappings:', error);
    }
  };

  const handleAddInventoryMapping = async () => {
    if (!editingMeal || !newMapping.inventory_item_id || !newMapping.quantity_used) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('meal_inventory_mapping')
        .insert([{
          meal_id: editingMeal.id,
          inventory_item_id: newMapping.inventory_item_id,
          quantity_used: parseFloat(newMapping.quantity_used),
        }]);

      if (error) throw error;

      setNewMapping({ inventory_item_id: '', quantity_used: '' });
      loadInventoryMappings(editingMeal.id);
      alert('Inventory mapping added successfully!');
    } catch (error: any) {
      console.error('Error adding inventory mapping:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteInventoryMapping = async (mappingId: string) => {
    try {
      const { error } = await supabase
        .from('meal_inventory_mapping')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      if (editingMeal) {
        loadInventoryMappings(editingMeal.id);
      }
      alert('Inventory mapping deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting inventory mapping:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const mealData = {
        name: formData.name,
        description: formData.description,
        full_description: formData.full_description,
        ingredients: formData.ingredients,
        nutritional_info: formData.nutritional_info || null,
        image_url: formData.image_url,
        category_id: formData.category_id || null,
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        base_price_per_10g: formData.base_price_per_10g,
        is_active: formData.is_active,
      };

      if (editingMeal) {
        const { error } = await supabase
          .from('meals')
          .update({ ...mealData, updated_at: new Date().toISOString() })
          .eq('id', editingMeal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meals').insert(mealData);
        if (error) throw error;
      }
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving meal:', error);
      alert('Failed to save meal');
    }
  };

  const handleAddIngredient = async () => {
    if (!editingMeal || !newIngredient.ingredient_name || !newIngredient.quantity) {
      alert('Please fill in ingredient name and quantity');
      return;
    }

    try {
      const { error } = await supabase.from('meal_ingredients').insert({
        meal_id: editingMeal.id,
        ingredient_name: newIngredient.ingredient_name,
        quantity: parseFloat(newIngredient.quantity),
        unit: newIngredient.unit,
      });

      if (error) throw error;

      setNewIngredient({ ingredient_name: '', quantity: '', unit: 'grams' });
      await loadMealIngredients(editingMeal.id);
    } catch (error) {
      console.error('Error adding ingredient:', error);
      alert('Failed to add ingredient');
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm('Remove this ingredient?')) return;

    try {
      const { error } = await supabase.from('meal_ingredients').delete().eq('id', id);
      if (error) throw error;

      if (editingMeal) {
        await loadMealIngredients(editingMeal.id);
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      alert('Failed to delete ingredient');
    }
  };

  const handleEdit = async (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      name: meal.name,
      description: meal.description,
      full_description: meal.full_description,
      ingredients: meal.ingredients,
      nutritional_info: meal.nutritional_info || '',
      image_url: meal.image_url,
      category_id: meal.category_id || '',
      mrp: meal.mrp?.toString() || '',
      sale_price: meal.sale_price?.toString() || '',
      base_price_per_10g: meal.base_price_per_10g,
      is_active: meal.is_active,
    });
    await loadMealIngredients(meal.id);
    await loadInventoryMappings(meal.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;
    try {
      const { error } = await supabase.from('meals').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal');
    }
  };

  const handleToggleStatus = async (meal: Meal) => {
    try {
      const { error } = await supabase
        .from('meals')
        .update({ is_active: !meal.is_active })
        .eq('id', meal.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status');
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
      category_id: '',
      mrp: '',
      sale_price: '',
      base_price_per_10g: 10,
      is_active: true,
    });
    setEditingMeal(null);
    setMealIngredients([]);
    setInventoryMappings([]);
    setNewIngredient({ ingredient_name: '', quantity: '', unit: 'grams' });
    setNewMapping({ inventory_item_id: '', quantity_used: '' });
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MRP (₹)</label>
                <input
                  type="number"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  min="0"
                  step="0.01"
                  placeholder="Maximum retail price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (₹/10g) *</label>
                <input
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  placeholder="Current sale price per 10g"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Disabled</option>
                </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients (display text) *</label>
              <textarea
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                required
                rows={3}
                placeholder="List of ingredients for display purposes"
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

            {editingMeal && (
              <div className="border-t pt-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Raw Ingredients (for kitchen)</h4>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Ingredient name"
                      value={newIngredient.ingredient_name}
                      onChange={(e) =>
                        setNewIngredient({ ...newIngredient, ingredient_name: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={newIngredient.quantity}
                      onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <select
                      value={newIngredient.unit}
                      onChange={(e) =>
                        setNewIngredient({
                          ...newIngredient,
                          unit: e.target.value as 'grams' | 'kg' | 'ml' | 'liters' | 'pieces',
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="grams">Grams</option>
                      <option value="kg">Kg</option>
                      <option value="ml">ML</option>
                      <option value="liters">Liters</option>
                      <option value="pieces">Pieces</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                  {mealIngredients.length > 0 && (
                    <div className="space-y-2">
                      {mealIngredients.map((ing) => (
                        <div
                          key={ing.id}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded border"
                        >
                          <span className="text-sm text-gray-700">
                            {ing.ingredient_name} - {ing.quantity} {ing.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteIngredient(ing.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {editingMeal && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Inventory Mapping</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Link this meal to inventory items. Stock will auto-deduct when orders are placed.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <select
                      value={newMapping.inventory_item_id}
                      onChange={(e) =>
                        setNewMapping({ ...newMapping, inventory_item_id: e.target.value })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select inventory item</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantity} {item.display_unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Quantity used per meal"
                      value={newMapping.quantity_used}
                      onChange={(e) => setNewMapping({ ...newMapping, quantity_used: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddInventoryMapping}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Mapping</span>
                    </button>
                  </div>
                  {inventoryMappings.length > 0 && (
                    <div className="space-y-2">
                      {inventoryMappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded border"
                        >
                          <span className="text-sm text-gray-700">
                            {mapping.inventory_items?.name} - {mapping.quantity_used} {mapping.inventory_items?.unit} per meal
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteInventoryMapping(mapping.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {inventoryMappings.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No inventory items linked yet
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>{editingMeal ? 'Update Meal' : 'Add Meal'}</span>
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
            <div className="relative">
              <img src={meal.image_url} alt={meal.name} className="w-full h-48 object-cover" />
              {!meal.is_active && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Disabled
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{meal.name}</h3>
                  {meal.category_id && (
                    <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {categories.find((c) => c.id === meal.category_id)?.name}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleToggleStatus(meal)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      meal.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {meal.is_active ? 'Active' : 'Disabled'}
                  </button>
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
              <div className="flex items-center space-x-3">
                {meal.mrp && (
                  <span className="text-gray-400 line-through text-sm">₹{meal.mrp}/10g</span>
                )}
                <span className="text-orange-500 font-semibold">
                  ₹{meal.sale_price || meal.base_price_per_10g}/10g
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
