import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../DashboardCard';
import { 
  FolderTree,
  Edit, 
  Trash2, 
  FileImage,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Category } from '../../pages/dashboard/AdminProductsServices';
import { AttachmentGallery } from './AttachmentGallery';

interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onRefresh: () => void;
}

export function CategoryList({ 
  categories, 
  loading, 
  onEdit, 
  onRefresh 
}: CategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAttachments, setShowAttachments] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete ${category.name}?`)) {
      return;
    }
    
    try {
      setDeleteLoading(category.id);
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. It may contain subcategories or be in use by products, services, or bundles.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Recursive component for rendering category tree
  const CategoryItem = ({ category, depth = 0 }: { category: Category, depth?: number }) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    
    return (
      <div className="category-item">
        <div 
          className={`flex items-center py-3 px-4 ${depth > 0 ? 'ml-6' : ''} hover:bg-gray-50`}
        >
          <div className="flex-1 flex items-center">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(category.id)}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            ) : (
              <div className="w-5 mr-2"></div>
            )}
            
            <FolderTree className="w-5 h-5 text-yellow-500 mr-2" />
            
            <div className="ml-2">
              <div className="text-sm font-medium">{category.name}</div>
              {category.description && (
                <div className="text-xs text-gray-500">{category.description}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={() => setShowAttachments(category.id)}
              className="text-gray-400 hover:text-blue-600 mr-3"
            >
              <FileImage className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => onEdit(category)}
              className="text-gray-400 hover:text-blue-600 mr-3"
            >
              <Edit className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => handleDelete(category)}
              disabled={deleteLoading === category.id || hasChildren}
              className={`${hasChildren ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
              title={hasChildren ? "Cannot delete a category with subcategories" : "Delete category"}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="subcategories border-l border-gray-200 ml-4">
            {category.children?.map(child => (
              <CategoryItem key={child.id} category={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {showAttachments && (
        <AttachmentGallery
          attachments={[]} // We'll need to fetch attachments separately
          itemType="category"
          itemId={showAttachments}
          onClose={() => setShowAttachments(null)}
          onUploadComplete={onRefresh}
        />
      )}
      
      <DashboardCard title="Categories" fullWidth loading={loading}>
        <div className="category-tree">
          {categories.length === 0 ? (
            <div className="py-4 text-center text-gray-500">
              No categories found
            </div>
          ) : (
            <div className="border-t border-gray-200">
              {categories.map(category => (
                <CategoryItem key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </DashboardCard>
    </>
  );
} 