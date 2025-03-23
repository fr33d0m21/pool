import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../DashboardCard';
import { 
  ArrowLeft, 
  Save,
  Plus,
  Trash2,
  Tag,
  Box,
  DollarSign
} from 'lucide-react';
import { 
  Bundle, 
  Category, 
  Product, 
  Service,
  BundleProduct,
  BundleService,
  PricingType
} from '../../pages/dashboard/AdminProductsServices';

interface BundleFormProps {
  bundle?: Bundle;
  categories: Category[];
  products: Product[];
  services: Service[];
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  formatCurrency: (amount?: number) => string;
}

export function BundleForm({
  bundle,
  categories,
  products,
  services,
  isEditing,
  onSave,
  onCancel,
  formatCurrency
}: BundleFormProps) {
  const [form, setForm] = useState<Partial<Bundle>>(
    bundle || {
      name: '',
      description: '',
      pricing_type: 'itemized',
      flat_price: 0,
      discount_percentage: 0,
      category_id: undefined,
      taxable: true,
      active: true,
      featured: false
    }
  );
  
  // Bundle items state
  const [bundleProducts, setBundleProducts] = useState<BundleProduct[]>(
    bundle?.products || []
  );
  const [bundleServices, setBundleServices] = useState<BundleService[]>(
    bundle?.services || []
  );
  
  // New item state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);
  
  // Calculated values
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update calculated values when bundle items or pricing options change
  useEffect(() => {
    calculateTotals();
  }, [bundleProducts, bundleServices, form.pricing_type, form.discount_percentage, form.flat_price]);

  const calculateTotals = () => {
    // Calculate product subtotal
    const productSubtotal = bundleProducts.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
    
    // Calculate service subtotal
    const serviceSubtotal = bundleServices.reduce((sum, item) => {
      const service = services.find(s => s.id === item.service_id);
      return sum + (service?.price || 0) * item.quantity;
    }, 0);
    
    // Combined subtotal
    const combinedSubtotal = productSubtotal + serviceSubtotal;
    setSubtotal(combinedSubtotal);
    
    if (form.pricing_type === 'flat_rate') {
      // For flat rate, calculate effective discount
      if (combinedSubtotal > 0 && form.flat_price !== undefined) {
        setDiscountAmount(combinedSubtotal - form.flat_price);
        setTotal(form.flat_price);
      } else {
        setDiscountAmount(0);
        setTotal(0);
      }
    } else {
      // For itemized with discount
      if (form.discount_percentage && form.discount_percentage > 0) {
        const discount = combinedSubtotal * (form.discount_percentage / 100);
        setDiscountAmount(discount);
        setTotal(combinedSubtotal - discount);
      } else {
        setDiscountAmount(0);
        setTotal(combinedSubtotal);
      }
    }
  };

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

  const handlePricingTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as PricingType;
    setForm({ ...form, pricing_type: value });
  };

  // Add product to bundle
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    
    const existingIndex = bundleProducts.findIndex(item => item.product_id === selectedProductId);
    
    if (existingIndex >= 0) {
      // Update quantity if product already exists
      const newItems = [...bundleProducts];
      newItems[existingIndex].quantity += productQuantity;
      setBundleProducts(newItems);
    } else {
      // Add new product
      const product = products.find(p => p.id === selectedProductId);
      if (!product) return;
      
      const newItem: BundleProduct = {
        id: `temp-${Date.now()}-${selectedProductId}`,
        bundle_id: bundle?.id || '',
        product_id: selectedProductId,
        quantity: productQuantity,
        sort_order: bundleProducts.length,
        created_at: new Date().toISOString(),
        product
      };
      
      setBundleProducts([...bundleProducts, newItem]);
    }
    
    // Reset selection
    setSelectedProductId('');
    setProductQuantity(1);
  };

  // Add service to bundle
  const handleAddService = () => {
    if (!selectedServiceId) return;
    
    const existingIndex = bundleServices.findIndex(item => item.service_id === selectedServiceId);
    
    if (existingIndex >= 0) {
      // Update quantity if service already exists
      const newItems = [...bundleServices];
      newItems[existingIndex].quantity += serviceQuantity;
      setBundleServices(newItems);
    } else {
      // Add new service
      const service = services.find(s => s.id === selectedServiceId);
      if (!service) return;
      
      const newItem: BundleService = {
        id: `temp-${Date.now()}-${selectedServiceId}`,
        bundle_id: bundle?.id || '',
        service_id: selectedServiceId,
        quantity: serviceQuantity,
        sort_order: bundleServices.length,
        created_at: new Date().toISOString(),
        service
      };
      
      setBundleServices([...bundleServices, newItem]);
    }
    
    // Reset selection
    setSelectedServiceId('');
    setServiceQuantity(1);
  };

  // Remove product from bundle
  const handleRemoveProduct = (productId: string) => {
    setBundleProducts(bundleProducts.filter(item => item.product_id !== productId));
  };

  // Remove service from bundle
  const handleRemoveService = (serviceId: string) => {
    setBundleServices(bundleServices.filter(item => item.service_id !== serviceId));
  };

  // Update product quantity
  const handleProductQuantityChange = (productId: string, quantity: number) => {
    setBundleProducts(bundleProducts.map(item => 
      item.product_id === productId ? { ...item, quantity } : item
    ));
  };

  // Update service quantity
  const handleServiceQuantityChange = (serviceId: string, quantity: number) => {
    setBundleServices(bundleServices.map(item => 
      item.service_id === serviceId ? { ...item, quantity } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name) {
      setError('Bundle name is required');
      return;
    }
    
    if (form.pricing_type === 'flat_rate' && (!form.flat_price || form.flat_price <= 0)) {
      setError('Please enter a valid flat rate price');
      return;
    }
    
    if (bundleProducts.length === 0 && bundleServices.length === 0) {
      setError('Bundle must contain at least one product or service');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const bundleData = {
        ...form,
        updated_at: new Date().toISOString()
      };
      
      let bundleId = bundle?.id;
      
      if (isEditing && bundle) {
        // Update existing bundle
        const { error: updateError } = await supabase
          .from('bundles')
          .update(bundleData)
          .eq('id', bundle.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new bundle
        const { data: newBundle, error: insertError } = await supabase
          .from('bundles')
          .insert({
            ...bundleData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        bundleId = newBundle.id;
      }
      
      if (bundleId) {
        // Handle bundle products
        if (isEditing) {
          // Delete existing bundle products
          await supabase
            .from('bundle_products')
            .delete()
            .eq('bundle_id', bundleId);
        }
        
        // Insert new bundle products
        if (bundleProducts.length > 0) {
          const productsToInsert = bundleProducts.map((item, index) => ({
            bundle_id: bundleId,
            product_id: item.product_id,
            quantity: item.quantity,
            sort_order: index
          }));
          
          const { error: productsError } = await supabase
            .from('bundle_products')
            .insert(productsToInsert);
          
          if (productsError) throw productsError;
        }
        
        // Handle bundle services
        if (isEditing) {
          // Delete existing bundle services
          await supabase
            .from('bundle_services')
            .delete()
            .eq('bundle_id', bundleId);
        }
        
        // Insert new bundle services
        if (bundleServices.length > 0) {
          const servicesToInsert = bundleServices.map((item, index) => ({
            bundle_id: bundleId,
            service_id: item.service_id,
            quantity: item.quantity,
            sort_order: index
          }));
          
          const { error: servicesError } = await supabase
            .from('bundle_services')
            .insert(servicesToInsert);
          
          if (servicesError) throw servicesError;
        }
      }
      
      onSave();
    } catch (err) {
      console.error('Error saving bundle:', err);
      setError('Failed to save bundle');
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
          <span>{isEditing ? 'Edit Bundle' : 'Create New Bundle'}</span>
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
              Bundle Name*
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
        
        {/* Pricing options */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Pricing Options</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="pricing_itemized"
                name="pricing_type"
                value="itemized"
                checked={form.pricing_type === 'itemized'}
                onChange={handlePricingTypeChange}
                className="h-4 w-4 text-blue-600 border-gray-300"
              />
              <label htmlFor="pricing_itemized" className="ml-2 text-sm text-gray-700">
                Itemized Pricing (total of all items with optional discount)
              </label>
            </div>
            
            {form.pricing_type === 'itemized' && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="discount_percentage"
                    min="0"
                    max="100"
                    value={form.discount_percentage || 0}
                    onChange={handleNumberChange}
                    className="w-24 border border-gray-300 rounded-md py-2 px-3"
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center">
              <input
                type="radio"
                id="pricing_flat"
                name="pricing_type"
                value="flat_rate"
                checked={form.pricing_type === 'flat_rate'}
                onChange={handlePricingTypeChange}
                className="h-4 w-4 text-blue-600 border-gray-300"
              />
              <label htmlFor="pricing_flat" className="ml-2 text-sm text-gray-700">
                Flat Rate Pricing (set a fixed price regardless of included items)
              </label>
            </div>
            
            {form.pricing_type === 'flat_rate' && (
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flat Rate Price*
                </label>
                <div className="relative w-48">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    name="flat_price"
                    min="0"
                    step="0.01"
                    value={form.flat_price || ''}
                    onChange={handleNumberChange}
                    className="w-full border border-gray-300 rounded-md py-2 pl-7 pr-3"
                    required={form.pricing_type === 'flat_rate'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bundle Products Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Products</h3>
            <div className="text-sm text-gray-500">
              {bundleProducts.length} product{bundleProducts.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="mt-3 border rounded-lg overflow-hidden">
            {/* Product selection */}
            <div className="bg-gray-50 p-3 border-b flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                >
                  <option value="">Choose a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={!selectedProductId}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    selectedProductId 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            </div>
            
            {/* Product list */}
            <div className="divide-y divide-gray-200">
              {bundleProducts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No products added to this bundle yet
                </div>
              ) : (
                bundleProducts.map(item => {
                  const product = products.find(p => p.id === item.product_id) || item.product;
                  if (!product) return null;
                  
                  return (
                    <div key={item.id} className="p-3 flex items-center">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(product.price)} each
                        </div>
                      </div>
                      
                      <div className="w-32 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleProductQuantityChange(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded-md py-1 px-2 text-center"
                        />
                      </div>
                      
                      <div className="w-28 text-right font-medium">
                        {formatCurrency((product.price || 0) * item.quantity)}
                      </div>
                      
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(item.product_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Bundle Services Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Services</h3>
            <div className="text-sm text-gray-500">
              {bundleServices.length} service{bundleServices.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="mt-3 border rounded-lg overflow-hidden">
            {/* Service selection */}
            <div className="bg-gray-50 p-3 border-b flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                >
                  <option value="">Choose a service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {formatCurrency(service.price)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={serviceQuantity}
                  onChange={(e) => setServiceQuantity(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={handleAddService}
                  disabled={!selectedServiceId}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    selectedServiceId 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            </div>
            
            {/* Service list */}
            <div className="divide-y divide-gray-200">
              {bundleServices.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No services added to this bundle yet
                </div>
              ) : (
                bundleServices.map(item => {
                  const service = services.find(s => s.id === item.service_id) || item.service;
                  if (!service) return null;
                  
                  return (
                    <div key={item.id} className="p-3 flex items-center">
                      <div className="flex-1">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(service.price)} each
                        </div>
                      </div>
                      
                      <div className="w-32 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleServiceQuantityChange(item.service_id, parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded-md py-1 px-2 text-center"
                        />
                      </div>
                      
                      <div className="w-28 text-right font-medium">
                        {formatCurrency((service.price || 0) * item.quantity)}
                      </div>
                      
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveService(item.service_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Bundle Price Summary */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Price Summary</h3>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          
          {discountAmount > 0 && (
            <div className="flex justify-between items-center mb-2 text-green-600">
              <span>
                {form.pricing_type === 'itemized' 
                  ? `Discount (${form.discount_percentage}%):` 
                  : 'Discount:'}
              </span>
              <span className="font-medium">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-2 border-t border-gray-300 text-lg">
            <span className="font-medium">Total:</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
        
        {/* Additional options */}
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
              This bundle is taxable
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
              Make this bundle active (visible to customers)
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
              Feature this bundle on homepage and catalog
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
            {loading ? 'Saving...' : 'Save Bundle'}
          </button>
        </div>
      </form>
    </DashboardCard>
  );
} 