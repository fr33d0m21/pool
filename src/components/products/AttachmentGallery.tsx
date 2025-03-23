import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Upload, 
  FileText, 
  Image, 
  File, 
  Video,
  Download,
  Trash2,
  ExternalLink,
  Loader
} from 'lucide-react';
import { Attachment, MediaType } from '../../pages/dashboard/AdminProductsServices';

interface AttachmentGalleryProps {
  attachments: Attachment[];
  itemType: 'product' | 'service' | 'bundle' | 'category';
  itemId: string;
  onClose: () => void;
  onUploadComplete: () => void;
}

export function AttachmentGallery({ 
  attachments, 
  itemType, 
  itemId, 
  onClose,
  onUploadComplete
}: AttachmentGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
        // Determine media type
        let mediaType: MediaType = 'document';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt || '')) {
          mediaType = 'image';
        } else if (['pdf'].includes(fileExt || '')) {
          mediaType = 'pdf';
        } else if (['mp4', 'webm', 'ogg'].includes(fileExt || '')) {
          mediaType = 'video';
        }
        
        // Upload file to storage
        const filePath = `${itemType}s/${itemId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
            }
          });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
        
        // Create attachment record in database
        const attachmentData = {
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          media_type: mediaType,
          title: file.name.split('.')[0], // Use filename as title initially
          content_type: file.type,
          is_featured: false,
          sort_order: attachments.length + i,
          [`${itemType}_id`]: itemId
        };
        
        const { error: dbError } = await supabase
          .from('attachments')
          .insert(attachmentData);
        
        if (dbError) throw dbError;
        
        // Update progress for multiple files
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      // Refresh the list of attachments
      onUploadComplete();
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Are you sure you want to delete ${attachment.file_name}?`)) {
      return;
    }
    
    try {
      setDeleteLoading(attachment.id);
      
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.file_path]);
      
      if (storageError) throw storageError;
      
      // Delete the attachment record from the database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);
      
      if (dbError) throw dbError;
      
      // Refresh the list of attachments
      onUploadComplete();
      
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const getFileIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFileUrl = (attachment: Attachment) => {
    return supabase.storage
      .from('attachments')
      .getPublicUrl(attachment.file_path).data.publicUrl;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-lg font-semibold">
            Media Attachments
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-grow">
          {attachments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No attachments yet.</p>
              <button
                onClick={handleUploadClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center mx-auto"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {attachments.map(attachment => (
                  <div 
                    key={attachment.id} 
                    className="border rounded-lg overflow-hidden flex flex-col"
                  >
                    {/* Attachment Preview */}
                    <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {attachment.media_type === 'image' ? (
                        <a 
                          href={getFileUrl(attachment)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="h-full w-full"
                        >
                          <img 
                            src={getFileUrl(attachment)} 
                            alt={attachment.title || attachment.file_name}
                            className="h-full w-full object-contain"
                          />
                        </a>
                      ) : (
                        <div className="text-center">
                          {getFileIcon(attachment.media_type)}
                          <div className="text-sm mt-2">{attachment.file_name}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Attachment Details */}
                    <div className="p-3 flex-grow">
                      <div className="font-medium truncate" title={attachment.title || attachment.file_name}>
                        {attachment.title || attachment.file_name}
                      </div>
                      {attachment.description && (
                        <div className="text-sm text-gray-500 mt-1 truncate">
                          {attachment.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {attachment.file_size 
                          ? `${Math.round(attachment.file_size / 1024)} KB` 
                          : 'Unknown size'
                        }
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="border-t p-2 flex justify-end space-x-2">
                      <a 
                        href={getFileUrl(attachment)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Open"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <a 
                        href={getFileUrl(attachment)} 
                        download={attachment.file_name}
                        className="p-1 text-gray-500 hover:text-green-600"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => handleDelete(attachment)}
                        disabled={deleteLoading === attachment.id}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        {deleteLoading === attachment.id ? (
                          <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Upload more */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleUploadClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Uploading ({uploadProgress}%)
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload More
                    </>
                  )}
                </button>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 