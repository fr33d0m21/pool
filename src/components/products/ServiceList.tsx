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
  Clock
} from 'lucide-react';
import { Service } from '../../pages/dashboard/AdminProductsServices';
import { AttachmentGallery } from './AttachmentGallery';

interface ServiceListProps {
  services: Service[];
  loading: boolean;
  onEdit: (service: Service) => void;
  onRefresh: () => void;
  formatCurrency: (amount?: number) => string;
}

export function ServiceList({ 
  services, 
  loading, 
  onEdit, 
  onRefresh,
  formatCurrency 
}: ServiceListProps) {
  const [showAttachments, setShowAttachments] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  const handleToggleActive = async (service: Service) => {
    try {
      setUpdateLoading(service.id);
      
      const { error } = await supabase
        .from('services')
        .update({ active: !service.active, updated_at: new Date().toISOString() })
        .eq('id', service.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating service status:', error);
      alert('Failed to update service status');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleToggleFeatured = async (service: Service) => {
    try {
      setUpdateLoading(service.id);
      
      const { error } = await supabase
        .from('services')
        .update({ featured: !service.featured, updated_at: new Date().toISOString() })
        .eq('id', service.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating service featured status:', error);
      alert('Failed to update service featured status');
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete ${service.name}?`)) {
      return;
    }
    
    try {
      setDeleteLoading(service.id);
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service. It may be in use in bundles, jobs, or quotes.');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <>
      {showAttachments && (
        <AttachmentGallery
          attachments={services.find(s => s.id === showAttachments)?.attachments || []}
          itemType="service"
          itemId={showAttachments}
          onClose={() => setShowAttachments(null)}
          onUploadComplete={onRefresh}
        />
      )}
      
      <DashboardCard title="Services" fullWidth loading={loading}>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurring
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
              {services.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No services found
                  </td>
                </tr>
              ) : (
                services.map(service => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {service.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {formatCurrency(service.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      <div className="flex items-center justify-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDuration(service.estimated_duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          service.recurring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {service.recurring ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleActive(service)}
                        disabled={updateLoading === service.id}
                        className={`inline-flex items-center rounded-full p-1 ${
                          service.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {service.active ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleFeatured(service)}
                        disabled={updateLoading === service.id}
                        className={`inline-flex items-center rounded-full p-1 ${
                          service.featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => setShowAttachments(service.id)}
                        className="inline-flex items-center rounded-full p-1 bg-blue-100 text-blue-800"
                      >
                        <FileImage className="w-5 h-5" />
                        {service.attachments && service.attachments.length > 0 && (
                          <span className="ml-1 bg-blue-200 text-blue-800 text-xs font-semibold px-2 rounded-full">
                            {service.attachments.length}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => onEdit(service)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(service)}
                        disabled={deleteLoading === service.id}
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