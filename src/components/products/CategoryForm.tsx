import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../DashboardCard';
import { ArrowLeft, Save } from 'lucide-react';
import { Category } from '../../pages/dashboard/AdminProductsServices';

interface CategoryFormProps {
  category?: Category;
  categories: Category[];
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function CategoryForm({
  category,
  categories,
  isEditing,
  onSave,
  onCancel
}: CategoryFormProps) {
  const [form, setForm] = useState<Partial<Category>>(
    category || {
      name: '',
      description: '',
      parent_id: undefined,
      sort_order: 0
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: parseInt(value) || 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name) {
      setError('Category name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const categoryData = {
        ...form,
        updated_at: new Date().toISOString()
      };
      
      if (isEditing && category) {
        // Update existing category
        const { error: updateError } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new category
        const { error: insertError } = await supabase
          .from('categories')
          .insert({
            ...categoryData,
            created_at: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
      }
      
      onSave();
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to flatten categories for select dropdown
  const flattenedCategories = () => {
    const result: { id: string, name: string, level: number }[] = [];
    
    const flatten = (categories: Category[], level = 0) => {
      categories.forEach(cat => {
        // Avoid self-reference for editing
        if (isEditing && category && cat.id === category.id) return;
        
        result.push({ id: cat.id, name: cat.name, level });
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, level + 1);
        }
      });
    };
    
    flatten(categories);
    return result;
  };

  return (
    <DashboardCard 
      title={
        <div className="flex items-center">
          <button 
            onClick={onCancel}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span>{isEditing ? 'Edit Category' : 'Create New Category'}</span>
        </div>
      } 
      fullWidth
    >
      <form onSubmit={handleSubmit} className="p-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name*
            </label>
            <input
              type="text"
              name="name"
              value={form.name || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              name="parent_id"
              value={form.parent_id || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            >
              <option value="">None (Top Level)</option>
              {flattenedCategories().map(cat => (
                <option key={cat.id} value={cat.id}>
                  {'—'.repeat(cat.level)} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={form.description || ''}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-md py-2 px-3"
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort Order
          </label>
          <input
            type="number"
            name="sort_order"
            value={form.sort_order || 0}
            onChange={handleNumberChange}
            className="w-full border border-gray-300 rounded-md py-2 px-3"
          />
          <p className="text-sm text-gray-500 mt-1">
            Categories are sorted by this value, then alphabetically by name.
          </p>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Category'}
          </button>
        </div>
      </form>
    </DashboardCard>
  );
} 