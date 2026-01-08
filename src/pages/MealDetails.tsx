import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Meal } from '../types/database';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

export function MealDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMeal();
    }
  }, [id]);

  const loadMeal = async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setMeal(data);
    } catch (error) {
      console.error('Error loading meal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Meal not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-700 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="h-64 lg:h-auto">
              <img
                src={meal.image_url}
                alt={meal.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-8 lg:p-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{meal.name}</h1>
              <p className="text-xl text-gray-600 mb-8">{meal.description}</p>

              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Full Description</h2>
                  <p className="text-gray-600 leading-relaxed">{meal.full_description}</p>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Ingredients</h2>
                  <p className="text-gray-600 leading-relaxed">{meal.ingredients}</p>
                </div>

                {meal.nutritional_info && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Nutritional Information</h2>
                    <p className="text-gray-600 leading-relaxed">{meal.nutritional_info}</p>
                  </div>
                )}

                <div className="bg-orange-50 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Pricing</h2>
                  <p className="text-3xl font-bold text-orange-500">
                    ₹{meal.base_price_per_10g}
                    <span className="text-lg text-gray-600 font-normal"> per 10g</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Final price calculated based on your pet's weight
                  </p>
                </div>

                <button
                  onClick={() => navigate('/subscribe', { state: { meal } })}
                  className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Subscribe to this Meal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
