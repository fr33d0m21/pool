import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../../components/DashboardCard';
import { 
  Box, 
  Package2, 
  ShoppingBag, 
  Layers, 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2,
  Search, 
  Filter, 
  UploadCloud,
  FileImage,
  FileText,
  Eye,
  EyeOff,
  Star,
  Tag,
  ChevronDown
} from 'lucide-react';
import { CategoryList } from '../../components/products/CategoryList';
import { ProductList } from '../../components/products/ProductList';
import { ServiceList } from '../../components/products/ServiceList';
import { BundleList } from '../../components/products/BundleList';
import { CategoryForm } from '../../components/products/CategoryForm';
import { ProductForm } from '../../components/products/ProductForm';
import { ServiceForm } from '../../components/products/ServiceForm';
import { BundleForm } from '../../components/products/BundleForm';
import { AttachmentUploader } from '../../components/products/AttachmentUploader';

// Types
export type MediaType = 'image' | 'pdf' | 'document' | 'video';
export type PricingType = 'flat_rate' | 'itemized';

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  cost?: number;
  stock_quantity: number;
  min_stock_level: number;
  category_id?: string;
  taxable: boolean;
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  attachments?: Attachment[];
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimated_duration?: number;
  recurring: boolean;
  category_id?: string;
  taxable: boolean;
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  attachments?: Attachment[];
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  pricing_type: PricingType;
  flat_price?: number;
  discount_percentage: number;
  category_id?: string;
  taxable: boolean;
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  products?: BundleProduct[];
  services?: BundleService[];
  attachments?: Attachment[];
  calculated_price?: number;
}

export interface BundleProduct {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  sort_order: number;
  created_at: string;
  product?: Product;
}

export interface BundleService {
  id: string;
  bundle_id: string;
  service_id: string;
  quantity: number;
  sort_order: number;
  created_at: string;
  service?: Service;
}

export interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  media_type: MediaType;
  title?: string;
  description?: string;
  content_type?: string;
  product_id?: string;
  service_id?: string;
  bundle_id?: string;
  category_id?: string;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

// Main component
export function AdminProductsServices() {
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'bundles' | 'categories'>('products');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Product | Service | Bundle | Category | null>(null);
  
  // State for data
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize by loading categories and the active tab's data
  useEffect(() => {
    fetchCategories();
    
    switch (activeTab) {
      case 'products':
        fetchProducts();
        break;
      case 'services':
        fetchServices();
        break;
      case 'bundles':
        fetchBundles();
        break;
    }
  }, [activeTab]);

  // Fetch functions
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      // Organize into hierarchy
      const categoriesMap = new Map<string, Category>();
      const rootCategories: Category[] = [];
      
      if (data) {
        // First pass: create map of all categories
        data.forEach(category => {
          categoriesMap.set(category.id, { ...category, children: [] });
        });
        
        // Second pass: organize into parent-child relationships
        data.forEach(category => {
          if (category.parent_id && categoriesMap.has(category.parent_id)) {
            const parent = categoriesMap.get(category.parent_id);
            if (parent && parent.children) {
              parent.children.push(categoriesMap.get(category.id) as Category);
            }
          } else {
            rootCategories.push(categoriesMap.get(category.id) as Category);
          }
        });
        
        setCategories(rootCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          attachments:attachments(*)
        `)
        .order('name');
      
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }
      
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('services')
        .select(`
          *,
          category:categories(*),
          attachments:attachments(*)
        `)
        .order('name');
      
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }
      
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBundles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('bundles')
        .select(`
          *,
          category:categories(*),
          products:bundle_products(
            *,
            product:products(*)
          ),
          services:bundle_services(
            *,
            service:services(*)
          ),
          attachments:attachments(*)
        `)
        .order('name');
      
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }
      
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      const { data: bundlesData, error } = await query;
      
      if (error) throw error;
      
      // For itemized bundles, calculate the total price
      if (bundlesData) {
        for (const bundle of bundlesData) {
          if (bundle.pricing_type === 'flat_rate') {
            bundle.calculated_price = bundle.flat_price;
          } else {
            // Calculate from products and services with discount
            let total = 0;
            
            // Add products
            if (bundle.products) {
              for (const bundleProduct of bundle.products) {
                if (bundleProduct.product) {
                  total += bundleProduct.product.price * bundleProduct.quantity;
                }
              }
            }
            
            // Add services
            if (bundle.services) {
              for (const bundleService of bundle.services) {
                if (bundleService.service) {
                  total += bundleService.service.price * bundleService.quantity;
                }
              }
            }
            
            // Apply discount
            if (bundle.discount_percentage > 0) {
              total = total * (1 - (bundle.discount_percentage / 100));
            }
            
            bundle.calculated_price = total;
          }
        }
        
        setBundles(bundlesData);
      }
    } catch (error) {
      console.error('Error fetching bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for creating a new item
  const handleCreate = () => {
    setSelectedItem(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  // Handler for editing an item
  const handleEdit = (item: Product | Service | Bundle | Category) => {
    setSelectedItem(item);
    setIsCreating(false);
    setIsEditing(true);
  };

  // Handler for after save
  const handleAfterSave = () => {
    // Refresh data based on current tab
    switch (activeTab) {
      case 'products':
        fetchProducts();
        break;
      case 'services':
        fetchServices();
        break;
      case 'bundles':
        fetchBundles();
        break;
      case 'categories':
        fetchCategories();
        break;
    }
    
    // Reset state
    setSelectedItem(null);
    setIsCreating(false);
    setIsEditing(false);
  };

  // Handler for canceling form
  const handleCancel = () => {
    setSelectedItem(null);
    setIsCreating(false);
    setIsEditing(false);
  };
  
  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="admin-products-services">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products & Services</h1>
        
        {!isCreating && !isEditing && (
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'products' && 'Add Product'}
            {activeTab === 'services' && 'Add Service'}
            {activeTab === 'bundles' && 'Add Bundle'}
            {activeTab === 'categories' && 'Add Category'}
          </button>
        )}
      </div>
      
      {/* Tabs */}
      {!isCreating && !isEditing && (
        <div className="mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-2 rounded-md flex items-center ${
                activeTab === 'products'
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Products
            </button>
            
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3 py-2 rounded-md flex items-center ${
                activeTab === 'services'
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Box className="w-4 h-4 mr-2" />
              Services
            </button>
            
            <button
              onClick={() => setActiveTab('bundles')}
              className={`px-3 py-2 rounded-md flex items-center ${
                activeTab === 'bundles'
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Package2 className="w-4 h-4 mr-2" />
              Bundles
            </button>
            
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-2 rounded-md flex items-center ${
                activeTab === 'categories'
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              <FolderTree className="w-4 h-4 mr-2" />
              Categories
            </button>
          </nav>
        </div>
      )}
      
      {/* Search and Filter */}
      {!isCreating && !isEditing && activeTab !== 'categories' && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-4"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            
            <div className="relative">
              <select
                value={categoryFilter || ''}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-10 pr-4 w-full"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FolderTree className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            </div>
            
            <div>
              <button
                onClick={() => {
                  switch (activeTab) {
                    case 'products':
                      fetchProducts();
                      break;
                    case 'services':
                      fetchServices();
                      break;
                    case 'bundles':
                      fetchBundles();
                      break;
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Content based on active tab and state */}
      {isCreating || isEditing ? (
        // Form views
        <>
          {activeTab === 'products' && (
            <ProductForm 
              product={isEditing ? selectedItem as Product : undefined}
              categories={categories}
              isEditing={isEditing}
              onSave={handleAfterSave}
              onCancel={handleCancel}
            />
          )}
          
          {activeTab === 'services' && (
            <ServiceForm 
              service={isEditing ? selectedItem as Service : undefined}
              categories={categories}
              isEditing={isEditing}
              onSave={handleAfterSave}
              onCancel={handleCancel}
            />
          )}
          
          {activeTab === 'bundles' && (
            <BundleForm 
              bundle={isEditing ? selectedItem as Bundle : undefined}
              categories={categories}
              products={products}
              services={services}
              isEditing={isEditing}
              onSave={handleAfterSave}
              onCancel={handleCancel}
              formatCurrency={formatCurrency}
            />
          )}
          
          {activeTab === 'categories' && (
            <CategoryForm 
              category={isEditing ? selectedItem as Category : undefined}
              categories={categories}
              isEditing={isEditing}
              onSave={handleAfterSave}
              onCancel={handleCancel}
            />
          )}
        </>
      ) : (
        // List views
        <>
          {activeTab === 'products' && (
            <ProductList 
              products={products}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={fetchProducts}
              formatCurrency={formatCurrency}
            />
          )}
          
          {activeTab === 'services' && (
            <ServiceList 
              services={services}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={fetchServices}
              formatCurrency={formatCurrency}
            />
          )}
          
          {activeTab === 'bundles' && (
            <BundleList 
              bundles={bundles}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={fetchBundles}
              formatCurrency={formatCurrency}
            />
          )}
          
          {activeTab === 'categories' && (
            <CategoryList 
              categories={categories}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={fetchCategories}
            />
          )}
        </>
      )}
    </div>
  );
} 