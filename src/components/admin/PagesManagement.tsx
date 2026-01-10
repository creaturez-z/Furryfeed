import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CMSPage } from '../../types/database';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';

export function PagesManagement() {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newPage, setNewPage] = useState({
    slug: '',
    title: '',
    content: '',
    meta_description: '',
    is_published: true
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('cms_pages')
        .select('*')
        .order('title');

      if (fetchError) throw fetchError;

      setPages(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newPage.slug || !newPage.title) {
      setError('Slug and title are required');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('cms_pages')
        .insert({
          slug: newPage.slug.toLowerCase().replace(/\s+/g, '-'),
          title: newPage.title,
          content: newPage.content,
          meta_description: newPage.meta_description,
          is_published: newPage.is_published
        });

      if (insertError) throw insertError;

      setSuccess('Page added successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setIsAdding(false);
      setNewPage({
        slug: '',
        title: '',
        content: '',
        meta_description: '',
        is_published: true
      });
      await loadPages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingPage) return;

    try {
      const { error: updateError } = await supabase
        .from('cms_pages')
        .update({
          title: editingPage.title,
          content: editingPage.content,
          meta_description: editingPage.meta_description,
          is_published: editingPage.is_published,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPage.id);

      if (updateError) throw updateError;

      setSuccess('Page updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setEditingPage(null);
      await loadPages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('cms_pages')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('Page deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadPages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (editingPage) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Page: {editingPage.title}</h2>
          <button
            onClick={() => setEditingPage(null)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Cancel</span>
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={editingPage.title}
              onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug (URL)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">/page/</span>
              <input
                type="text"
                value={editingPage.slug}
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">Slug cannot be changed after creation</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Description
            </label>
            <input
              type="text"
              value={editingPage.meta_description || ''}
              onChange={(e) => setEditingPage({ ...editingPage, meta_description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="SEO description for search engines"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content (HTML)
            </label>
            <textarea
              value={editingPage.content}
              onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
              className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter HTML content here..."
            />
            <p className="text-sm text-gray-500 mt-1">Supports full HTML including images and links</p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={editingPage.is_published}
              onChange={(e) => setEditingPage({ ...editingPage, is_published: e.target.checked })}
              className="rounded"
            />
            <label className="text-sm font-medium text-gray-700">
              Published (visible to users)
            </label>
          </div>

          <button
            onClick={handleUpdate}
            className="w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Save Page</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pages Management</h2>
          <p className="text-sm text-gray-600 mt-1">Create and manage CMS pages</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Page</span>
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
          <h3 className="font-semibold text-gray-900 mb-3">Add New Page</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newPage.title}
              onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Page Title"
            />
            <input
              type="text"
              value={newPage.slug}
              onChange={(e) => setNewPage({ ...newPage, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="page-slug (URL)"
            />
            <input
              type="text"
              value={newPage.meta_description}
              onChange={(e) => setNewPage({ ...newPage, meta_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Meta Description (SEO)"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newPage.is_published}
                onChange={(e) => setNewPage({ ...newPage, is_published: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm">Published</label>
            </div>
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
                  setNewPage({
                    slug: '',
                    title: '',
                    content: '',
                    meta_description: '',
                    is_published: true
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((page) => (
          <div key={page.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{page.title}</h3>
                <p className="text-sm text-gray-600 mt-1">/page/{page.slug}</p>
              </div>
              {page.is_published ? (
                <Eye className="w-5 h-5 text-green-500" title="Published" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400" title="Draft" />
              )}
            </div>
            {page.meta_description && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{page.meta_description}</p>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditingPage(page)}
                className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-1"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm">Edit</span>
              </button>
              <button
                onClick={() => handleDelete(page.id)}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {pages.length === 0 && !isAdding && (
        <div className="text-center py-8 text-gray-500">
          No pages yet. Click "Add Page" to create one.
        </div>
      )}
    </div>
  );
}
