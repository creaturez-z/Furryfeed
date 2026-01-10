import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Meal, MealLayoutConfig } from '../../types/database';
import { ArrowUp, ArrowDown, Monitor, Smartphone, Save } from 'lucide-react';

export function MealLayoutManagement() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<MealLayoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mealsData, configData] = await Promise.all([
        supabase
          .from('meals')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('meal_layout_config')
          .select('*')
          .maybeSingle()
      ]);

      if (mealsData.error) throw mealsData.error;
      if (configData.error) throw configData.error;

      setMeals(mealsData.data || []);
      setLayoutConfig(configData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveMealUp = async (index: number) => {
    if (index === 0) return;

    const newMeals = [...meals];
    [newMeals[index - 1], newMeals[index]] = [newMeals[index], newMeals[index - 1]];

    const updates = newMeals.map((meal, idx) => ({
      id: meal.id,
      sort_order: idx
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('meals')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      setMeals(newMeals);
      setSuccess('Meal order updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const moveMealDown = async (index: number) => {
    if (index === meals.length - 1) return;

    const newMeals = [...meals];
    [newMeals[index], newMeals[index + 1]] = [newMeals[index + 1], newMeals[index]];

    const updates = newMeals.map((meal, idx) => ({
      id: meal.id,
      sort_order: idx
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('meals')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      setMeals(newMeals);
      setSuccess('Meal order updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveLayoutConfig = async () => {
    if (!layoutConfig) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('meal_layout_config')
        .update({
          desktop_items_per_row: layoutConfig.desktop_items_per_row,
          mobile_items_per_row: layoutConfig.mobile_items_per_row,
          updated_at: new Date().toISOString()
        })
        .eq('id', layoutConfig.id);

      if (updateError) throw updateError;

      setSuccess('Layout configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Meal Layout Configuration</h2>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {layoutConfig && (
          <div className="space-y-6 mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Display Layout Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Monitor className="w-5 h-5 text-gray-700" />
                  <label className="block text-sm font-medium text-gray-700">
                    Desktop Items Per Row
                  </label>
                </div>
                <select
                  value={layoutConfig.desktop_items_per_row}
                  onChange={(e) => setLayoutConfig({
                    ...layoutConfig,
                    desktop_items_per_row: parseInt(e.target.value)
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num} item{num > 1 ? 's' : ''} per row</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Controls how many meals appear per row on desktop screens</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Smartphone className="w-5 h-5 text-gray-700" />
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Items Per Row
                  </label>
                </div>
                <select
                  value={layoutConfig.mobile_items_per_row}
                  onChange={(e) => setLayoutConfig({
                    ...layoutConfig,
                    mobile_items_per_row: parseInt(e.target.value)
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num} item{num > 1 ? 's' : ''} per row</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Controls how many meals appear per row on mobile screens</p>
              </div>
            </div>

            <button
              type="button"
              onClick={saveLayoutConfig}
              disabled={saving}
              className="w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Layout Settings'}</span>
            </button>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Display Order</h3>
          <p className="text-sm text-gray-600 mb-4">
            Use the arrow buttons to reorder meals. This order will be reflected on the customer-facing page.
            Disabled meals will not appear to customers.
          </p>

          <div className="space-y-2">
            {meals.map((meal, index) => (
              <div
                key={meal.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  meal.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex flex-col space-y-1">
                    <button
                      type="button"
                      onClick={() => moveMealUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-600 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMealDown(index)}
                      disabled={index === meals.length - 1}
                      className="p-1 text-gray-600 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <img
                    src={meal.image_url}
                    alt={meal.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />

                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{meal.name}</h4>
                    <p className="text-sm text-gray-600 line-clamp-1">{meal.description}</p>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      meal.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {meal.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {meals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No meals found. Add meals in the Meal Management section.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
