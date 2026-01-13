import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Pet } from '../types/database';
import { PawPrint, Upload, X } from 'lucide-react';

interface PetFormProps {
  pet?: Pet | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return Math.max(0, age);
};

export function PetForm({ pet, onSuccess, onCancel }: PetFormProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: pet?.name || '',
    breed: pet?.breed || '',
    birth_date: (pet as any)?.birth_date || '',
    age: pet?.age || 1,
    weight_in_kg: pet?.weight_in_kg || pet?.weight ? pet.weight / 1000 : 0,
    medical_condition: pet?.medical_condition || '',
    likes: pet?.likes || '',
    dislikes: pet?.dislikes || '',
    special_instructions: pet?.special_instructions || '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(pet?.image_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formData.birth_date) {
      const calculatedAge = calculateAge(formData.birth_date);
      setFormData(prev => ({ ...prev, age: calculatedAge }));
    }
  }, [formData.birth_date]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setError('Please upload a JPG or PNG image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return pet?.image_url || null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('pet-images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('pet-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.weight_in_kg <= 0) {
      setError('Weight must be greater than 0 kg');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = pet?.image_url || null;

      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const petData = {
        name: formData.name,
        breed: formData.breed,
        birth_date: formData.birth_date || null,
        age: formData.age,
        weight: Math.round(formData.weight_in_kg * 1000),
        weight_in_kg: formData.weight_in_kg,
        medical_condition: formData.medical_condition || null,
        likes: formData.likes || null,
        dislikes: formData.dislikes || null,
        special_instructions: formData.special_instructions || null,
        image_url: imageUrl,
      };

      if (pet) {
        const { error } = await supabase
          .from('pets')
          .update({
            ...petData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pet.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pets')
          .insert({
            customer_id: user!.id,
            ...petData,
          });

        if (error) throw error;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving pet:', err);
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pet Photo (Optional)
          </label>
          <div className="flex items-center space-x-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Pet preview"
                  className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageChange}
                className="hidden"
                id="pet-image"
              />
              <label
                htmlFor="pet-image"
                className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Choose Photo
              </label>
              <p className="text-xs text-gray-500 mt-2">JPG or PNG, max 5MB</p>
            </div>
          </div>
        </div>

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
            <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">
              Birth Date {formData.birth_date ? '*' : '(Optional)'}
            </label>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Age will be calculated automatically</p>
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
              readOnly={!!formData.birth_date}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                formData.birth_date ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
            {formData.birth_date && (
              <p className="text-xs text-blue-600 mt-1">Calculated from birth date</p>
            )}
            {!formData.birth_date && (
              <p className="text-xs text-gray-500 mt-1">Or enter birth date above for auto-calculation</p>
            )}
          </div>

          <div>
            <label htmlFor="weight_in_kg" className="block text-sm font-medium text-gray-700 mb-1">
              Exact Weight (KG) *
            </label>
            <input
              type="number"
              id="weight_in_kg"
              name="weight_in_kg"
              value={formData.weight_in_kg}
              onChange={handleChange}
              required
              min="0.1"
              step="0.01"
              placeholder="e.g., 6.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Enter weight in kilograms (e.g., 6.5 kg, 12.25 kg)</p>
          </div>
        </div>

        <div>
          <label htmlFor="medical_condition" className="block text-sm font-medium text-gray-700 mb-1">
            Any underlying medical condition(s)
          </label>
          <textarea
            id="medical_condition"
            name="medical_condition"
            value={formData.medical_condition}
            onChange={handleChange}
            rows={2}
            placeholder="e.g., Diabetes, Arthritis, Allergies..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="likes" className="block text-sm font-medium text-gray-700 mb-1">
              Likes
            </label>
            <textarea
              id="likes"
              name="likes"
              value={formData.likes}
              onChange={handleChange}
              rows={2}
              placeholder="Food preferences, favorite activities..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="dislikes" className="block text-sm font-medium text-gray-700 mb-1">
              Dislikes
            </label>
            <textarea
              id="dislikes"
              name="dislikes"
              value={formData.dislikes}
              onChange={handleChange}
              rows={2}
              placeholder="Food dislikes, behavioral notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
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
            placeholder="Any other important information..."
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
