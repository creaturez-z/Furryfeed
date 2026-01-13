import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Plus, Edit2, Trash2, AlertTriangle, TrendingDown, History, Settings } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  display_unit: string;
  custom_low_stock_threshold: number | null;
  created_at: string;
  updated_at: string;
}

interface InventorySettings {
  id: string;
  global_low_stock_threshold: number;
}

interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  quantity_change: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  inventory_items?: {
    name: string;
  };
}

export default function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'pieces',
    custom_low_stock_threshold: '',
  });

  const [globalThreshold, setGlobalThreshold] = useState('10');

  useEffect(() => {
    loadInventory();
    loadSettings();
  }, []);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
      setGlobalThreshold(data.global_low_stock_threshold.toString());
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, inventory_items(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const itemData = {
        name: formData.name,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        custom_low_stock_threshold: formData.custom_low_stock_threshold
          ? parseFloat(formData.custom_low_stock_threshold)
          : null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        alert('Item updated successfully!');
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert([itemData]);

        if (error) throw error;
        alert('Item added successfully!');
      }

      loadInventory();
      resetForm();
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadInventory();
      alert('Item deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleAdjustStock = async (item: InventoryItem) => {
    const adjustment = prompt(`Adjust stock for ${item.name}\n\nEnter amount to add (positive) or remove (negative):`);
    if (!adjustment) return;

    const amount = parseFloat(adjustment);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid number');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newQuantity = Math.max(0, item.quantity + amount);

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', item.id);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          inventory_item_id: item.id,
          transaction_type: amount > 0 ? 'restock' : 'manual_adjustment',
          quantity_change: amount,
          created_by: user.id,
          notes: amount > 0 ? 'Manual restock' : 'Manual adjustment',
        }]);

      if (transactionError) throw transactionError;

      loadInventory();
      alert('Stock adjusted successfully!');
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      if (!settings) return;

      const { error } = await supabase
        .from('inventory_settings')
        .update({ global_low_stock_threshold: parseFloat(globalThreshold) })
        .eq('id', settings.id);

      if (error) throw error;

      loadSettings();
      setShowSettings(false);
      alert('Settings updated successfully!');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert('Error: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: '',
      unit: 'pieces',
      custom_low_stock_threshold: '',
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      custom_low_stock_threshold: item.custom_low_stock_threshold?.toString() || '',
    });
    setShowAddForm(true);
  };

  const isLowStock = (item: InventoryItem): boolean => {
    const threshold = item.custom_low_stock_threshold ?? settings?.global_low_stock_threshold ?? 10;
    return item.quantity <= threshold;
  };

  const formatQuantity = (item: InventoryItem): string => {
    if (item.unit === 'grams' && item.quantity >= 1000) {
      return `${(item.quantity / 1000).toFixed(2)} kg`;
    }
    if (item.unit === 'kilograms' && item.quantity < 1) {
      return `${(item.quantity * 1000).toFixed(0)} g`;
    }
    return `${item.quantity} ${item.display_unit}`;
  };

  const lowStockItems = items.filter(isLowStock);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading inventory...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Inventory Management
          </h2>
          <p className="text-gray-600 mt-1">Manage stock levels and track inventory</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowHistory(true);
              loadTransactions();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">Low Stock Alert</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low on stock
              </p>
              <div className="mt-2 space-y-1">
                {lowStockItems.map(item => (
                  <div key={item.id} className="text-sm text-yellow-700">
                    <span className="font-medium">{item.name}</span>: {formatQuantity(item)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="pieces">Pieces</option>
                  <option value="liters">Liters</option>
                  <option value="grams">Grams</option>
                  <option value="kilograms">Kilograms</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Low Stock Threshold (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.custom_low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, custom_low_stock_threshold: e.target.value })}
                  placeholder={`Default: ${settings?.global_low_stock_threshold || 10}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use global threshold
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Inventory Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Global Low Stock Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={globalThreshold}
                  onChange={(e) => setGlobalThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default threshold for items without custom settings
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSettings}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Transaction History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="p-3 border border-gray-200 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {transaction.inventory_items?.name || 'Unknown Item'}
                    </p>
                    <p className="text-sm text-gray-600">{transaction.notes}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {transaction.transaction_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}

              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              const lowStock = isLowStock(item);
              const threshold = item.custom_low_stock_threshold ?? settings?.global_low_stock_threshold ?? 10;

              return (
                <tr key={item.id} className={lowStock ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {lowStock && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {formatQuantity(item)}
                  </td>
                  <td className="px-6 py-4 text-gray-700 capitalize">
                    {item.display_unit}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {threshold} {item.display_unit}
                    {item.custom_low_stock_threshold && (
                      <span className="ml-1 text-xs text-gray-500">(custom)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {lowStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        <TrendingDown className="w-3 h-3" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleAdjustStock(item)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Adjust Stock"
                    >
                      <Package className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="text-orange-600 hover:text-orange-800"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No inventory items yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
            >
              Add your first item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
