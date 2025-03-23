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
  Tag,
  Layers,
  DollarSign
} from 'lucide-react';
import { Bundle } from '../../pages/dashboard/AdminProductsServices';
import { AttachmentGallery } from './AttachmentGallery';

interface BundleListProps {
  bundles: Bundle[];
  loading: boolean;
  onEdit: (bundle: Bundle) => void;
  onRefresh: () => void;
  formatCurrency: (amount?: number) => string;
}

export function BundleList({ 
  bundles, 
  loading, 
  onEdit, 
  onRefresh,
  formatCurrency 
}: BundleListProps) {
  const [showAttachments, setShowAttachments] = useState<string | null>(null);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  const toggleExpand = (bundleId: string) => {
    const newExpanded = new Set(expandedBundles);
    if (newExpanded.has(bundleId)) {
      newExpanded.delete(bundleId);
    } else {
      newExpanded.add(bundleId);
    }
    setExpandedBundles(newExpanded);
  };

  const handleToggleActive = async (bundle: Bundle) => {
    try {
      setUpdateLoading(bundle.id);
      
      const { error } = await supabase
        .from('bundles')
        .update({ active: !bundle.active, updated_at: new Date().toISOString() })
        .eq('id', bundle.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating bundle status:', error);
      alert('Failed to update bundle status');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleToggleFeatured = async (bundle: Bundle) => {
    try {
      setUpdateLoading(bundle.id);
      
      const { error } = await supabase
        .from('bundles')
        .update({ featured: !bundle.featured, updated_at: new Date().toISOString() })
        .eq('id', bundle.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating bundle featured status:', error);
      alert('Failed to update bundle featured status');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleDelete = async (bundle: Bundle) => {
    if (!confirm(`Are you sure you want to delete ${bundle.name}?`)) {
      return;
    }
    
    try {
      setDeleteLoading(bundle.id);
      
      const { error } = await supabase
        .from('bundles')
        .delete()
        .eq('id', bundle.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting bundle:', error);
      alert('Failed to delete bundle. It may be in use in orders or quotes.');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <>
      {showAttachments && (
        <AttachmentGallery
          attachments={bundles.find(b => b.id === showAttachments)?.attachments || []}
          itemType="bundle"
          itemId={showAttachments}
          onClose={() => setShowAttachments(null)}
          onUploadComplete={onRefresh}
        />
      )}
      
      <DashboardCard title="Bundles" fullWidth loading={loading}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
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
              {bundles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No bundles found
                  </td>
                </tr>
              ) : (
                bundles.map(bundle => {
                  const isExpanded = expandedBundles.has(bundle.id);
                  const totalItems = (bundle.products?.length || 0) + (bundle.services?.length || 0);
                  
                  return (
                    <>
                      <tr key={bundle.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{bundle.name}</div>
                          {bundle.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {bundle.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bundle.category?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            bundle.pricing_type === 'flat_rate' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {bundle.pricing_type === 'flat_rate' ? 'Flat Rate' : 'Itemized'}
                          </span>
                          
                          {bundle.pricing_type === 'itemized' && bundle.discount_percentage > 0 && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {bundle.discount_percentage}% discount
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {bundle.pricing_type === 'flat_rate' 
                            ? formatCurrency(bundle.flat_price)
                            : formatCurrency(bundle.calculated_price)
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => toggleExpand(bundle.id)}
                            className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
                          >
                            <Layers className="w-3 h-3 mr-1" />
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggleActive(bundle)}
                            disabled={updateLoading === bundle.id}
                            className={`inline-flex items-center rounded-full p-1 ${
                              bundle.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {bundle.active ? (
                              <Eye className="w-5 h-5" />
                            ) : (
                              <EyeOff className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggleFeatured(bundle)}
                            disabled={updateLoading === bundle.id}
                            className={`inline-flex items-center rounded-full p-1 ${
                              bundle.featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <Star className="w-5 h-5" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => setShowAttachments(bundle.id)}
                            className="inline-flex items-center rounded-full p-1 bg-blue-100 text-blue-800"
                          >
                            <FileImage className="w-5 h-5" />
                            {bundle.attachments && bundle.attachments.length > 0 && (
                              <span className="ml-1 bg-blue-200 text-blue-800 text-xs font-semibold px-2 rounded-full">
                                {bundle.attachments.length}
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => onEdit(bundle)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(bundle)}
                            disabled={deleteLoading === bundle.id}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded view showing bundle items */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <div className="bg-gray-50 p-4">
                              <div className="mb-3 font-medium text-sm">Bundle Contents</div>
                              
                              {/* Products */}
                              {bundle.products && bundle.products.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs text-gray-500 uppercase font-semibold mb-1 flex items-center">
                                    <Tag className="w-3 h-3 mr-1" />
                                    Products
                                  </div>
                                  <div className="bg-white rounded shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                            Product
                                          </th>
                                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                                            Qty
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                            Unit Price
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {bundle.products.map(item => (
                                          <tr key={item.id}>
                                            <td className="px-4 py-2 text-sm">
                                              {item.product?.name}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-center">
                                              {item.quantity}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right">
                                              {formatCurrency(item.product?.price)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right font-medium">
                                              {formatCurrency((item.product?.price || 0) * item.quantity)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                              
                              {/* Services */}
                              {bundle.services && bundle.services.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs text-gray-500 uppercase font-semibold mb-1 flex items-center">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    Services
                                  </div>
                                  <div className="bg-white rounded shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                            Service
                                          </th>
                                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                                            Qty
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                            Unit Price
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {bundle.services.map(item => (
                                          <tr key={item.id}>
                                            <td className="px-4 py-2 text-sm">
                                              {item.service?.name}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-center">
                                              {item.quantity}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right">
                                              {formatCurrency(item.service?.price)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right font-medium">
                                              {formatCurrency((item.service?.price || 0) * item.quantity)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                              
                              {/* Summary */}
                              <div className="flex justify-end">
                                <div className="w-64 bg-white rounded shadow-sm p-3">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Subtotal:</span>
                                    <span className="font-medium">
                                      {formatCurrency(
                                        (bundle.products?.reduce((sum, item) => 
                                          sum + (item.product?.price || 0) * item.quantity, 0) || 0) +
                                        (bundle.services?.reduce((sum, item) => 
                                          sum + (item.service?.price || 0) * item.quantity, 0) || 0)
                                      )}
                                    </span>
                                  </div>
                                  
                                  {bundle.pricing_type === 'itemized' && bundle.discount_percentage > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 mb-1">
                                      <span>Discount ({bundle.discount_percentage}%):</span>
                                      <span className="font-medium">
                                        -{formatCurrency(
                                          ((bundle.products?.reduce((sum, item) => 
                                            sum + (item.product?.price || 0) * item.quantity, 0) || 0) +
                                          (bundle.services?.reduce((sum, item) => 
                                            sum + (item.service?.price || 0) * item.quantity, 0) || 0)) * 
                                          (bundle.discount_percentage / 100)
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t">
                                    <span>Total:</span>
                                    <span>{formatCurrency(bundle.calculated_price)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </>
  );
} 