import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../DashboardCard';
import { 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Star,
  FileImage,
  AlertCircle
} from 'lucide-react';
import { Product } from '../../pages/dashboard/AdminProductsServices';
import { AttachmentGallery } from './AttachmentGallery';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onRefresh: () => void;
  formatCurrency: (amount?: number) => string;
}

export function ProductList({ 
  products, 
  loading, 
  onEdit, 
  onRefresh,
  formatCurrency 
}: ProductListProps) {
  const [showAttachments, setShowAttachments] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  const handleToggleActive = async (product: Product) => {
    try {
      setUpdateLoading(product.id);
      
      const { error } = await supabase
        .from('products')
        .update({ active: !product.active, updated_at: new Date().toISOString() })
        .eq('id', product.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating product status:', error);
      alert('Failed to update product status');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      setUpdateLoading(product.id);
      
      const { error } = await supabase
        .from('products')
        .update({ featured: !product.featured, updated_at: new Date().toISOString() })
        .eq('id', product.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating product featured status:', error);
      alert('Failed to update product featured status');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) {
      return;
    }
    
    try {
      setDeleteLoading(product.id);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. It may be in use in bundles or orders.');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <>
      {showAttachments && (
        <AttachmentGallery
          attachments={products.find(p => p.id === showAttachments)?.attachments || []}
          itemType="product"
          itemId={showAttachments}
          onClose={() => setShowAttachments(null)}
          onUploadComplete={onRefresh}
        />
      )}
      
      <DashboardCard title="Products" fullWidth loading={loading}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Featured
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{product.stock_quantity}</div>
                      {product.stock_quantity <= product.min_stock_level && (
                        <div className="text-xs text-red-600 flex items-center justify-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Low Stock
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleActive(product)}
                        disabled={updateLoading === product.id}
                        className={`inline-flex items-center rounded-full p-1 ${
                          product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.active ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleFeatured(product)}
                        disabled={updateLoading === product.id}
                        className={`inline-flex items-center rounded-full p-1 ${
                          product.featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => setShowAttachments(product.id)}
                        className="inline-flex items-center rounded-full p-1 bg-blue-100 text-blue-800"
                      >
                        <FileImage className="w-5 h-5" />
                        {product.attachments && product.attachments.length > 0 && (
                          <span className="ml-1 bg-blue-200 text-blue-800 text-xs font-semibold px-2 rounded-full">
                            {product.attachments.length}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => onEdit(product)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        disabled={deleteLoading === product.id}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </>
  );
} 