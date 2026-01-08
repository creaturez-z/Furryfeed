import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Pet } from '../types/database';
import { PawPrint } from 'lucide-react';

interface PetFormProps {
  pet?: Pet | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PetForm({ pet, onSuccess, onCancel }: PetFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: pet?.name || '',
    breed: pet?.breed || '',
    age: pet?.age || 1,
    weight: pet?.weight || 1000,
    medical_condition: pet?.medical_condition || '',
    special_instructions: pet?.special_instructions || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (pet) {
        const { error } = await supabase
          .from('pets')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pet.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pets')
          .insert({
            customer_id: user!.id,
            ...formData,
          });

        if (error) throw error;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to save pet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center space-x-2 mb-6">
        <PawPrint className="w-6 h-6 text-orange-500" />
        <h2 className="text-2xl font-bold text-gray-900">
          {pet ? 'Edit Pet' : 'Add New Pet'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Pet Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-1">
              Breed *
            </label>
            <input
              type="text"
              id="breed"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              Age (years) *
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              min="0"
              step="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
              Weight (grams) *
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              required
              min="100"
              step="10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="medical_condition" className="block text-sm font-medium text-gray-700 mb-1">
            Medical Condition
          </label>
          <input
            type="text"
            id="medical_condition"
            name="medical_condition"
            value={formData.medical_condition}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="special_instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            id="special_instructions"
            name="special_instructions"
            value={formData.special_instructions}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : pet ? 'Update Pet' : 'Add Pet'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
