import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../DashboardCard';
import { ArrowLeft, Save } from 'lucide-react';
import { Service, Category } from '../../pages/dashboard/AdminProductsServices';

interface ServiceFormProps {
  service?: Service;
  categories: Category[];
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function ServiceForm({
  service,
  categories,
  isEditing,
  onSave,
  onCancel
}: ServiceFormProps) {
  const [form, setForm] = useState<Partial<Service>>(
    service || {
      name: '',
      description: '',
      price: 0,
      estimated_duration: 60,
      recurring: false,
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
      setError('Service name is required');
      return;
    }
    
    if (form.price === undefined || form.price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const serviceData = {
        ...form,
        updated_at: new Date().toISOString()
      };
      
      if (isEditing && service) {
        // Update existing service
        const { error: updateError } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', service.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new service
        const { error: insertError } = await supabase
          .from('services')
          .insert({
            ...serviceData,
            created_at: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
      }
      
      onSave();
    } catch (err) {
      console.error('Error saving service:', err);
      setError('Failed to save service');
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

  // Helper function to format duration as hours and minutes
  const formatDuration = (minutes?: number) => {
    if (!minutes) return { hours: 0, minutes: 0 };
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return { hours, minutes: mins };
  };

  // Convert hours and minutes back to total minutes
  const durationToMinutes = (hours: number, minutes: number) => {
    return (hours * 60) + minutes;
  };

  // Get duration from form data
  const duration = formatDuration(form.estimated_duration);

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
          <span>{isEditing ? 'Edit Service' : 'Create New Service'}</span>
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
              Service Name*
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
              Estimated Duration
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Hours</label>
                <input
                  type="number"
                  min="0"
                  value={duration.hours}
                  onChange={(e) => {
                    const hours = parseInt(e.target.value) || 0;
                    setForm({
                      ...form,
                      estimated_duration: durationToMinutes(hours, duration.minutes)
                    });
                  }}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={duration.minutes}
                  onChange={(e) => {
                    const minutes = parseInt(e.target.value) || 0;
                    setForm({
                      ...form,
                      estimated_duration: durationToMinutes(duration.hours, minutes)
                    });
                  }}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="recurring"
              name="recurring"
              checked={form.recurring ?? false}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">
              This is a recurring service
            </label>
          </div>
          
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
              This service is taxable
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
              Make this service active (visible to customers)
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
              Feature this service on homepage and catalog
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
            {loading ? 'Saving...' : 'Save Service'}
          </button>
        </div>
      </form>
    </DashboardCard>
  );
} 