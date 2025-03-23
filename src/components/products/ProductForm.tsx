import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../DashboardCard';
import { ArrowLeft, Save } from 'lucide-react';
import { Product, Category } from '../../pages/dashboard/AdminProductsServices';

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  categories,
  isEditing,
  onSave,
  onCancel
}: ProductFormProps) {
  const [form, setForm] = useState<Partial<Product>>(
    product || {
      name: '',
      description: '',
      sku: '',
      price: 0,
      cost: 0,
      stock_quantity: 0,
      min_stock_level: 0,
      category_id: undefined,
      taxable: true,
      active: true,
      featured: false
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
    setForm({ ...form, [name]: parseFloat(value) || 0 });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm({ ...form, [name]: checked });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name) {
      setError('Product name is required');
      return;
    }
    
    if (form.price === undefined || form.price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const productData = {
        ...form,
        updated_at: new Date().toISOString()
      };
      
      if (isEditing && product) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new product
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            ...productData,
            created_at: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
      }
      
      onSave();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to flatten categories for select dropdown
  const flattenedCategories = () => {
    const result: { id: string, name: string, level: number }[] = [];
    
    const flatten = (categories: Category[], level = 0) => {
      categories.forEach(cat => {
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
          <span>{isEditing ? 'Edit Product' : 'Create New Product'}</span>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name*
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
              SKU
            </label>
            <input
              type="text"
              name="sku"
              value={form.sku || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            />
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={form.price || ''}
                onChange={handleNumberChange}
                className="w-full border border-gray-300 rounded-md py-2 pl-7 pr-3"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                name="cost"
                min="0"
                step="0.01"
                value={form.cost || ''}
                onChange={handleNumberChange}
                className="w-full border border-gray-300 rounded-md py-2 pl-7 pr-3"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category_id"
              value={form.category_id || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            >
              <option value="">Select Category</option>
              {flattenedCategories().map(cat => (
                <option key={cat.id} value={cat.id}>
                  {'—'.repeat(cat.level)} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              name="stock_quantity"
              min="0"
              value={form.stock_quantity || 0}
              onChange={handleNumberChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Stock Level
            </label>
            <input
              type="number"
              name="min_stock_level"
              min="0"
              value={form.min_stock_level || 0}
              onChange={handleNumberChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            />
            <p className="text-sm text-gray-500 mt-1">
              Minimum quantity before low stock notification is triggered
            </p>
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="taxable"
              name="taxable"
              checked={form.taxable ?? true}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="taxable" className="ml-2 text-sm text-gray-700">
              This product is taxable
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={form.active ?? true}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-700">
              Make this product active (visible to customers)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="featured"
              name="featured"
              checked={form.featured ?? false}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
              Feature this product on homepage and catalog
            </label>
          </div>
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
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </DashboardCard>
  );
} 