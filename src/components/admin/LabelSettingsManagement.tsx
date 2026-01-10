import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LabelSetting } from '../../types/database';
import { Save, Plus, Edit2, X } from 'lucide-react';

export function LabelSettingsManagement() {
  const [labels, setLabels] = useState<LabelSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState({ key: '', value: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('label_settings')
        .select('*')
        .order('key');

      if (fetchError) throw fetchError;

      setLabels(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.key || !newLabel.value) {
      setError('Key and value are required');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('label_settings')
        .insert({
          key: newLabel.key,
          value: newLabel.value,
          description: newLabel.description
        });

      if (insertError) throw insertError;

      setSuccess('Label added successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setIsAdding(false);
      setNewLabel({ key: '', value: '', description: '' });
      await loadLabels();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (label: LabelSetting) => {
    try {
      const { error: updateError } = await supabase
        .from('label_settings')
        .update({
          value: label.value,
          description: label.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', label.id);

      if (updateError) throw updateError;

      setSuccess('Label updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setEditingId(null);
      await loadLabels();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      for (const label of labels) {
        await supabase
          .from('label_settings')
          .update({
            value: label.value,
            description: label.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', label.id);
      }

      setSuccess('All labels saved successfully!');
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
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Label Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Customize all text labels across your website</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Label</span>
        </button>
      </div>

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

      {isAdding && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Add New Label</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newLabel.key}
              onChange={(e) => setNewLabel({ ...newLabel, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Key (e.g., hero_title)"
            />
            <input
              type="text"
              value={newLabel.value}
              onChange={(e) => setNewLabel({ ...newLabel, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Value (e.g., Welcome to PetMeals)"
            />
            <input
              type="text"
              value={newLabel.description}
              onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Description (optional)"
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewLabel({ key: '', value: '', description: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {labels.map((label) => (
          <div key={label.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">{label.key}</code>
                  {label.description && (
                    <span className="text-xs text-gray-500">- {label.description}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={label.value}
                  onChange={(e) => {
                    const updated = labels.map(l =>
                      l.id === label.id ? { ...l, value: e.target.value } : l
                    );
                    setLabels(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Label value"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveAll}
        disabled={saving}
        className="w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <Save className="w-5 h-5" />
        <span>{saving ? 'Saving...' : 'Save All Labels'}</span>
      </button>
    </div>
  );
}
