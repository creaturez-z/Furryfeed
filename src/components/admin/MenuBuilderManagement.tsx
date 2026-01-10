import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MenuItem } from '../../types/database';
import { Plus, Edit2, Trash2, Save, X, Monitor, Smartphone, Eye, EyeOff } from 'lucide-react';

export function MenuBuilderManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    label: '',
    url: '',
    parent_id: undefined,
    device_visibility: 'both',
    is_active: true,
    display_order: 0
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select('*')
        .order('display_order')
        .order('created_at');

      if (fetchError) throw fetchError;

      setMenuItems(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newItem.label || !newItem.url) {
      setError('Label and URL are required');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('menu_items')
        .insert({
          label: newItem.label,
          url: newItem.url,
          parent_id: newItem.parent_id || null,
          device_visibility: newItem.device_visibility || 'both',
          is_active: newItem.is_active !== false,
          display_order: newItem.display_order || 0
        });

      if (insertError) throw insertError;

      setSuccess('Menu item added successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setIsAdding(false);
      setNewItem({
        label: '',
        url: '',
        parent_id: undefined,
        device_visibility: 'both',
        is_active: true,
        display_order: 0
      });
      await loadMenuItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({
          label: editingItem.label,
          url: editingItem.url,
          parent_id: editingItem.parent_id || null,
          device_visibility: editingItem.device_visibility,
          is_active: editingItem.is_active,
          display_order: editingItem.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id);

      if (updateError) throw updateError;

      setSuccess('Menu item updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setEditingItem(null);
      await loadMenuItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('Menu item deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadMenuItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getMenuHierarchy = () => {
    const topLevel = menuItems.filter(item => !item.parent_id);
    return topLevel.map(parent => ({
      ...parent,
      children: menuItems.filter(item => item.parent_id === parent.id).map(child => ({
        ...child,
        children: menuItems.filter(item => item.parent_id === child.id)
      }))
    }));
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hierarchy = getMenuHierarchy();
    const itemWithChildren = hierarchy.find(h => h.id === item.id) ||
                            hierarchy.flatMap(h => h.children).find(c => c.id === item.id) ||
                            item;

    return (
      <div key={item.id} className={`${level > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="bg-gray-50 p-4 rounded-lg mb-2">
          {editingItem?.id === item.id ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editingItem.label}
                onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Label"
              />
              <input
                type="text"
                value={editingItem.url}
                onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="URL"
              />
              <div className="flex space-x-2">
                <select
                  value={editingItem.device_visibility}
                  onChange={(e) => setEditingItem({ ...editingItem, device_visibility: e.target.value as 'desktop' | 'mobile' | 'both' })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="both">Both</option>
                  <option value="desktop">Desktop Only</option>
                  <option value="mobile">Mobile Only</option>
                </select>
                <input
                  type="number"
                  value={editingItem.display_order}
                  onChange={(e) => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Order"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_active}
                    onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{item.label}</h4>
                  <p className="text-sm text-gray-600">{item.url}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {item.device_visibility === 'desktop' && <Monitor className="w-4 h-4 text-gray-500" title="Desktop Only" />}
                  {item.device_visibility === 'mobile' && <Smartphone className="w-4 h-4 text-gray-500" title="Mobile Only" />}
                  {item.device_visibility === 'both' && (
                    <>
                      <Monitor className="w-4 h-4 text-gray-500" title="Both" />
                      <Smartphone className="w-4 h-4 text-gray-500" title="Both" />
                    </>
                  )}
                  {item.is_active ? (
                    <Eye className="w-4 h-4 text-green-500" title="Active" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" title="Inactive" />
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        {'children' in itemWithChildren && itemWithChildren.children.map((child: MenuItem) => renderMenuItem(child, level + 1))}
      </div>
    );
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
        <h2 className="text-2xl font-bold text-gray-900">Menu Builder</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Menu Item</span>
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
          <h3 className="font-semibold text-gray-900 mb-3">Add New Menu Item</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newItem.label}
              onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Label (e.g., Home)"
            />
            <input
              type="text"
              value={newItem.url}
              onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="URL (e.g., /)"
            />
            <select
              value={newItem.parent_id || ''}
              onChange={(e) => setNewItem({ ...newItem, parent_id: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Top Level (No Parent)</option>
              {menuItems.filter(item => !item.parent_id).map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <div className="flex space-x-2">
              <select
                value={newItem.device_visibility}
                onChange={(e) => setNewItem({ ...newItem, device_visibility: e.target.value as 'desktop' | 'mobile' | 'both' })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="both">Both Devices</option>
                <option value="desktop">Desktop Only</option>
                <option value="mobile">Mobile Only</option>
              </select>
              <input
                type="number"
                value={newItem.display_order}
                onChange={(e) => setNewItem({ ...newItem, display_order: parseInt(e.target.value) })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Order"
              />
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newItem.is_active !== false}
                  onChange={(e) => setNewItem({ ...newItem, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
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
                  setNewItem({
                    label: '',
                    url: '',
                    parent_id: undefined,
                    device_visibility: 'both',
                    is_active: true,
                    display_order: 0
                  });
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

      <div className="space-y-2">
        {getMenuHierarchy().map(item => renderMenuItem(item))}
        {menuItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No menu items yet. Click "Add Menu Item" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
