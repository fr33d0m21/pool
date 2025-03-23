import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../../components/DashboardCard';
import { 
  File, ChevronDown, Search, Filter, Plus, Edit, Trash2, 
  Clock, FileText, Users, DollarSign, Check, X, Mail, Eye, 
  Tag, ArrowUpRight, Image, Download, Paperclip, Bell
} from 'lucide-react';

// Quote status type
type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'denied' | 'expired';

// Quote interface
interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  title: string;
  description?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: QuoteStatus;
  valid_until: string;
  notes?: string;
  terms_conditions?: string;
  last_viewed_at?: string;
  approval_date?: string;
  denial_date?: string;
  denial_reason?: string;
  reminder_sent_at?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  items?: QuoteItem[];
  attachments?: QuoteAttachment[];
  activities?: QuoteActivity[];
}

// Quote item interface with labels
interface QuoteItem {
  id: string;
  quote_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  label: 'recommended' | 'optional' | 'required';
  notes?: string;
  sort_order: number;
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
  };
}

// Quote attachment interface
interface QuoteAttachment {
  id: string;
  quote_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url?: string;
  description?: string;
  created_at: string;
}

// Quote activity interface
interface QuoteActivity {
  id: string;
  quote_id: string;
  activity_type: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: string;
}

// Notification setting interface
interface NotificationSetting {
  id: string;
  type: string;
  subject: string;
  template: string;
  recipients: string[];
  active: boolean;
  reminder_days?: number[];
}

// Main component
export function AdminQuotes() {
  // State for quotes list
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  
  // State for creating/editing quotes
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Quote>>({});
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for file upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // State for notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  
  // Fetch quotes on component mount
  useEffect(() => {
    fetchQuotes();
    fetchNotificationSettings();
  }, []);
  
  // Fetch quotes from Supabase
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      
      // Construct query based on filters
      let query = supabase
        .from('quotes')
        .select(`
          *,
          customer:users(id, full_name, email, phone),
          items:quote_items(
            *,
            product:products(id, name, description, price)
          ),
          attachments:quote_attachments(*),
          activities:quote_activities(*)
        `)
        .order('created_at', { ascending: false });
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply search term if present
      if (searchTerm) {
        query = query.or(
          `quote_number.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (data) setQuotes(data);
      
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch notification settings
  const fetchNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .in('type', ['quote_sent', 'quote_reminder', 'quote_approved', 'quote_denied']);
      
      if (error) throw error;
      if (data) setNotificationSettings(data);
      
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };
  
  // Handle quote selection
  const handleSelectQuote = (quote: Quote) => {
    setSelectedQuote(quote);
  };
  
  // Handle create new quote
  const handleCreateQuote = () => {
    setFormData({
      status: 'draft',
      tax_rate: 0,
      discount_amount: 0,
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    });
    setQuoteItems([]);
    setAttachments([]);
    setIsCreating(true);
    setIsEditing(false);
  };
  
  // Handle edit quote
  const handleEditQuote = (quote: Quote) => {
    setFormData(quote);
    setQuoteItems(quote.items || []);
    setAttachments(quote.attachments || []);
    setIsEditing(true);
    setIsCreating(false);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: QuoteStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'viewed':
        return 'bg-purple-100 text-purple-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render quote list or detail view
  return (
    <div className="admin-quotes">
      {selectedQuote ? (
        <QuoteDetailView 
          quote={selectedQuote}
          onBack={() => setSelectedQuote(null)}
          onEdit={() => handleEditQuote(selectedQuote)}
          notificationSettings={notificationSettings}
          onRefresh={fetchQuotes}
        />
      ) : isCreating || isEditing ? (
        <QuoteFormView 
          formData={formData}
          quoteItems={quoteItems}
          attachments={attachments}
          isEditing={isEditing}
          onCancel={() => {
            setIsCreating(false);
            setIsEditing(false);
          }}
          onSave={fetchQuotes}
        />
      ) : (
        <QuoteListView 
          quotes={quotes}
          loading={loading}
          statusFilter={statusFilter}
          searchTerm={searchTerm}
          onStatusFilterChange={setStatusFilter}
          onSearchTermChange={setSearchTerm}
          onSearch={fetchQuotes}
          onCreateQuote={handleCreateQuote}
          onSelectQuote={handleSelectQuote}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusBadgeClass={getStatusBadgeClass}
        />
      )}
    </div>
  );
}

// Quote List View Component
function QuoteListView({
  quotes,
  loading,
  statusFilter,
  searchTerm,
  onStatusFilterChange,
  onSearchTermChange,
  onSearch,
  onCreateQuote,
  onSelectQuote,
  formatCurrency,
  formatDate,
  getStatusBadgeClass
}: {
  quotes: Quote[];
  loading: boolean;
  statusFilter: QuoteStatus | 'all';
  searchTerm: string;
  onStatusFilterChange: (status: QuoteStatus | 'all') => void;
  onSearchTermChange: (term: string) => void;
  onSearch: () => void;
  onCreateQuote: () => void;
  onSelectQuote: (quote: Quote) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusBadgeClass: (status: QuoteStatus) => string;
}) {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quotes</h1>
        
        <button
          onClick={onCreateQuote}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Quote
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search quotes..."
            className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-4"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
        
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as QuoteStatus | 'all')}
            className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-4 pr-10"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="expired">Expired</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
        </div>
        
        <button
          onClick={onSearch}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Apply Filters
        </button>
      </div>
      
      {/* Quotes table */}
      <DashboardCard fullWidth loading={loading}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Viewed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No quotes found
                  </td>
                </tr>
              ) : (
                quotes.map(quote => (
                  <tr 
                    key={quote.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelectQuote(quote)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-500 mr-2" />
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {quote.quote_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {quote.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{quote.customer?.full_name || 'Unknown Customer'}</div>
                      <div className="text-sm text-gray-500">{quote.customer?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(quote.total_amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(quote.valid_until)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(quote.status)}`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {quote.last_viewed_at ? formatDate(quote.last_viewed_at) : 'Never'}
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

// Quote Detail View Component
function QuoteDetailView({
  quote,
  onBack,
  onEdit,
  notificationSettings,
  onRefresh
}: {
  quote: Quote;
  onBack: () => void;
  onEdit: () => void;
  notificationSettings: NotificationSetting[];
  onRefresh: () => void;
}) {
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showAttachments, setShowAttachments] = useState(true);
  const [sending, setSending] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);

  // Function to handle sending the quote
  const handleSendQuote = async () => {
    try {
      setSending(true);
      
      // Update the quote status to sent
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);
      
      if (error) throw error;
      
      // Log the activity
      await supabase
        .from('quote_activities')
        .insert({
          quote_id: quote.id,
          activity_type: 'sent',
          user_id: (await supabase.auth.getUser()).data.user?.id
        });
      
      // Send notification
      await sendNotification('quote_sent', quote);
      
      onRefresh();
      
    } catch (error) {
      console.error('Error sending quote:', error);
    } finally {
      setSending(false);
    }
  };
  
  // Function to handle sending a reminder
  const handleSendReminder = async () => {
    try {
      setReminderSending(true);
      
      // Update reminder sent timestamp
      const { error } = await supabase
        .from('quotes')
        .update({ 
          reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);
      
      if (error) throw error;
      
      // Log the activity
      await supabase
        .from('quote_activities')
        .insert({
          quote_id: quote.id,
          activity_type: 'reminder_sent',
          user_id: (await supabase.auth.getUser()).data.user?.id
        });
      
      // Send notification
      await sendNotification('quote_reminder', quote);
      
      onRefresh();
      
    } catch (error) {
      console.error('Error sending reminder:', error);
    } finally {
      setReminderSending(false);
    }
  };
  
  // Function to send a notification
  const sendNotification = async (type: string, quote: Quote) => {
    // In a real application, this would call a serverless function or API
    // to send an email. For now, we'll just log it
    console.log(`Sending "${type}" notification for quote ${quote.quote_number}`);
    
    // Find the notification template
    const template = notificationSettings.find(s => s.type === type);
    if (!template) {
      console.warn(`No template found for ${type}`);
      return;
    }
    
    // In a real app, we would actually send the email here
    // This is a placeholder for demonstration purposes
    console.log('Template:', template);
    console.log('Recipients:', template.recipients);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: QuoteStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'viewed':
        return 'bg-purple-100 text-purple-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get label badge class
  const getLabelBadgeClass = (label: string) => {
    switch (label) {
      case 'recommended':
        return 'bg-blue-100 text-blue-800';
      case 'optional':
        return 'bg-gray-100 text-gray-800';
      case 'required':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Handle download attachment
  const handleDownloadAttachment = async (attachment: QuoteAttachment) => {
    try {
      // In a real app, we would download from Supabase storage
      // This is a placeholder for demonstration purposes
      if (!attachment.public_url) {
        alert('Download URL not available');
        return;
      }
      
      window.open(attachment.public_url, '_blank');
      
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  return (
    <div>
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            &larr; Back to quotes
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Quote {quote.quote_number}
          </h1>
          <span className={`ml-4 px-2 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(quote.status)}`}>
            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {quote.status === 'draft' && (
            <button
              onClick={handleSendQuote}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Quote'}
            </button>
          )}
          
          {['sent', 'viewed'].includes(quote.status) && (
            <button
              onClick={handleSendReminder}
              disabled={reminderSending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <Mail className="w-4 h-4 mr-2" />
              {reminderSending ? 'Sending...' : 'Send Reminder'}
            </button>
          )}
          
          <button
            onClick={onEdit}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Quote
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Quote details */}
        <div className="col-span-8 space-y-6">
          {/* Quote Summary */}
          <DashboardCard title="Quote Summary" fullWidth>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{quote.title}</h2>
              {quote.description && (
                <p className="text-gray-600 mb-4">{quote.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{quote.customer?.full_name || 'Unknown Customer'}</p>
                  {quote.customer?.email && (
                    <p className="text-sm text-gray-600">{quote.customer.email}</p>
                  )}
                  {quote.customer?.phone && (
                    <p className="text-sm text-gray-600">{quote.customer.phone}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Quote Details</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm">Created:</span>
                    <span className="text-sm">{formatDate(quote.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Valid Until:</span>
                    <span className="text-sm">{formatDate(quote.valid_until)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Viewed:</span>
                    <span className="text-sm">{quote.last_viewed_at ? formatDate(quote.last_viewed_at) : 'Never'}</span>
                  </div>
                </div>
              </div>
              
              {quote.notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{quote.notes}</p>
                </div>
              )}
            </div>
          </DashboardCard>
          
          {/* Quote Items */}
          <DashboardCard title="Quote Items" fullWidth>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Label
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quote.items && quote.items.length > 0 ? (
                    quote.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.description}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-gray-500">{item.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(item.total_price)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLabelBadgeClass(item.label)}`}>
                            {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No items in this quote
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                      Subtotal
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                      {formatCurrency(quote.subtotal)}
                    </td>
                    <td></td>
                  </tr>
                  
                  {quote.tax_amount > 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Tax ({quote.tax_rate}%)
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        {formatCurrency(quote.tax_amount)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                  
                  {quote.discount_amount > 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        Discount
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                        - {formatCurrency(quote.discount_amount)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                  
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(quote.total_amount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </DashboardCard>
          
          {/* Terms & Conditions */}
          {quote.terms_conditions && (
            <DashboardCard title="Terms & Conditions" fullWidth>
              <div className="p-4">
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {quote.terms_conditions}
                </div>
              </div>
            </DashboardCard>
          )}
        </div>
        
        {/* Right column - Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Approval Status */}
          <DashboardCard title="Approval Status" fullWidth>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Current Status</p>
                <p className="font-medium">
                  <span className={`px-2 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(quote.status)}`}>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </span>
                </p>
              </div>
              
              {quote.status === 'approved' && (
                <div className="bg-green-50 border border-green-100 rounded p-3 mb-4">
                  <div className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 mr-2" />
                    <div>
                      <p className="font-medium text-green-800">Quote Approved</p>
                      <p className="text-sm text-green-700 mt-1">
                        {quote.approval_date ? `Approved on ${formatDate(quote.approval_date)}` : ''}
                      </p>
                      {quote.activities?.find(a => a.activity_type === 'converted_to_job') && (
                        <p className="text-sm text-green-700 mt-1">
                          A job has been automatically created based on this quote.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {quote.status === 'denied' && (
                <div className="bg-red-50 border border-red-100 rounded p-3 mb-4">
                  <div className="flex items-start">
                    <X className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                    <div>
                      <p className="font-medium text-red-800">Quote Denied</p>
                      <p className="text-sm text-red-700 mt-1">
                        {quote.denial_date ? `Denied on ${formatDate(quote.denial_date)}` : ''}
                      </p>
                      {quote.denial_reason && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-red-800">Reason:</p>
                          <p className="text-sm text-red-700">{quote.denial_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {['sent', 'viewed'].includes(quote.status) && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    This quote is currently awaiting customer approval.
                  </p>
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-600">
                      {quote.last_viewed_at 
                        ? `Last viewed ${formatDate(quote.last_viewed_at)}` 
                        : 'Not viewed yet'}
                    </span>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mb-2">Customer Approval Options</p>
              <div className="flex space-x-2">
                <div className="flex-1 bg-green-50 border border-green-200 rounded p-3 text-center">
                  <p className="text-sm text-green-800 font-medium mb-1">Approve</p>
                  <div className="flex justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                
                <div className="flex-1 bg-red-50 border border-red-200 rounded p-3 text-center">
                  <p className="text-sm text-red-800 font-medium mb-1">Decline</p>
                  <div className="flex justify-center">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mt-3">
                These options are displayed to the customer in the quote email and customer portal.
              </p>
            </div>
          </DashboardCard>
          
          {/* Attachments */}
          <DashboardCard 
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Paperclip className="w-4 h-4 mr-2" />
                  <span>Attachments</span>
                </div>
                <button 
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showAttachments ? 'Hide' : 'Show'}
                </button>
              </div>
            } 
            fullWidth
          >
            {showAttachments && (
              <div className="p-4">
                {quote.attachments && quote.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {quote.attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                        <div className="flex items-center">
                          {attachment.file_type.startsWith('image/') ? (
                            <Image className="w-5 h-5 text-blue-500 mr-2" />
                          ) : (
                            <File className="w-5 h-5 text-blue-500 mr-2" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {Math.round(attachment.file_size / 1024)} KB
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDownloadAttachment(attachment)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No attachments for this quote</p>
                )}
              </div>
            )}
          </DashboardCard>
          
          {/* Activity Log */}
          <DashboardCard 
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Activity Log</span>
                </div>
                <button 
                  onClick={() => setShowActivityLog(!showActivityLog)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showActivityLog ? 'Hide' : 'Show'}
                </button>
              </div>
            } 
            fullWidth
          >
            {showActivityLog && (
              <div className="p-4">
                {quote.activities && quote.activities.length > 0 ? (
                  <div className="space-y-4">
                    {quote.activities
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(activity => (
                        <div key={activity.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {activity.activity_type === 'viewed' && <Eye className="w-4 h-4 text-purple-500 mr-2" />}
                              {activity.activity_type === 'sent' && <Mail className="w-4 h-4 text-blue-500 mr-2" />}
                              {activity.activity_type === 'reminder_sent' && <Bell className="w-4 h-4 text-yellow-500 mr-2" />}
                              {activity.activity_type === 'converted_to_job' && <ArrowUpRight className="w-4 h-4 text-green-500 mr-2" />}
                              
                              <span className="text-sm font-medium">
                                {activity.activity_type === 'viewed' && 'Quote viewed'}
                                {activity.activity_type === 'sent' && 'Quote sent'}
                                {activity.activity_type === 'reminder_sent' && 'Reminder sent'}
                                {activity.activity_type === 'converted_to_job' && 'Converted to job'}
                              </span>
                            </div>
                            
                            <span className="text-xs text-gray-500">
                              {formatDate(activity.created_at)}
                            </span>
                          </div>
                          
                          {activity.details && (
                            <div className="mt-1 text-xs text-gray-600 ml-6">
                              {activity.activity_type === 'converted_to_job' && (
                                <span>Job ID: {activity.details.job_id}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No activity recorded for this quote</p>
                )}
              </div>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

// Quote Form View Component
function QuoteFormView({
  formData,
  quoteItems,
  attachments,
  isEditing,
  onCancel,
  onSave
}: {
  formData: Partial<Quote>;
  quoteItems: QuoteItem[];
  attachments: QuoteAttachment[];
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<Partial<Quote>>(formData);
  const [items, setItems] = useState<QuoteItem[]>(quoteItems);
  const [fileAttachments, setFileAttachments] = useState<QuoteAttachment[]>(attachments);
  const [customers, setCustomers] = useState<{id: string; full_name: string}[]>([]);
  const [products, setProducts] = useState<{id: string; name: string; price: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState('');
  
  // Item being edited
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<Partial<QuoteItem>>({
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    label: 'recommended',
    sort_order: 0
  });
  
  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);
  
  // Calculate item total when quantity or unit price changes
  useEffect(() => {
    if (itemForm.quantity && itemForm.unit_price) {
      setItemForm({
        ...itemForm,
        total_price: itemForm.quantity * itemForm.unit_price
      });
    }
  }, [itemForm.quantity, itemForm.unit_price]);
  
  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      if (data) setCustomers(data);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };
  
  // Fetch products
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price')
        .order('name');
      
      if (error) throw error;
      if (data) setProducts(data);
      
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  
  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };
  
  // Handle number input change (for tax rate, discount)
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: parseFloat(value) || 0 });
  };
  
  // Handle item form change
  const handleItemFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setItemForm({ ...itemForm, [name]: value });
  };
  
  // Handle product selection
  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    if (!productId) return;
    
    const product = products.find(p => p.id === productId);
    if (product) {
      setItemForm({
        ...itemForm,
        product_id: productId,
        description: product.name,
        unit_price: product.price,
        total_price: (itemForm.quantity || 1) * product.price
      });
    }
  };
  
  // Handle number input change for item form
  const handleItemNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    if (name === 'quantity') {
      const totalPrice = numValue * (itemForm.unit_price || 0);
      setItemForm({ 
        ...itemForm, 
        quantity: numValue,
        total_price: totalPrice
      });
    } else if (name === 'unit_price') {
      const totalPrice = (itemForm.quantity || 1) * numValue;
      setItemForm({ 
        ...itemForm, 
        unit_price: numValue,
        total_price: totalPrice
      });
    } else {
      setItemForm({ ...itemForm, [name]: numValue });
    }
  };
  
  // Add or update item
  const handleAddUpdateItem = () => {
    if (!itemForm.description || !(itemForm.unit_price && itemForm.unit_price > 0)) {
      alert('Please fill in description and unit price');
      return;
    }
    
    if (editingItem) {
      // Update existing item
      const updatedItems = items.map(item => 
        item.id === editingItem.id ? { ...itemForm, id: item.id } as QuoteItem : item
      );
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: QuoteItem = {
        id: `temp-${Date.now()}`, // Temporary ID until saved to db
        quote_id: form.id || '',
        description: itemForm.description || '',
        quantity: itemForm.quantity || 1,
        unit_price: itemForm.unit_price || 0,
        total_price: itemForm.total_price || 0,
        label: itemForm.label as 'recommended' | 'optional' | 'required' || 'recommended',
        sort_order: items.length,
        product_id: itemForm.product_id
      };
      
      setItems([...items, newItem]);
    }
    
    // Reset form
    setItemForm({
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      label: 'recommended',
      sort_order: items.length + 1
    });
    
    setEditingItem(null);
    setShowItemForm(false);
  };
  
  // Edit item
  const handleEditItem = (item: QuoteItem) => {
    setEditingItem(item);
    setItemForm(item);
    setShowItemForm(true);
  };
  
  // Remove item
  const handleRemoveItem = (itemId: string) => {
    if (confirm('Are you sure you want to remove this item?')) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };
  
  // Upload files
  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      setFileUploading(true);
      
      // For demonstration purposes, we'll create attachment objects without actually uploading
      // In a real application, you would upload to Supabase storage
      const newAttachments: QuoteAttachment[] = selectedFiles.map(file => ({
        id: `temp-${Date.now()}-${file.name}`,
        quote_id: form.id || '',
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: `/uploads/${form.id || 'new'}/${file.name}`,
        public_url: URL.createObjectURL(file), // For demonstration
        created_at: new Date().toISOString()
      }));
      
      setFileAttachments([...fileAttachments, ...newAttachments]);
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setFileUploading(false);
    }
  };
  
  // Remove attachment
  const handleRemoveAttachment = (attachmentId: string) => {
    if (confirm('Are you sure you want to remove this attachment?')) {
      setFileAttachments(fileAttachments.filter(attachment => attachment.id !== attachmentId));
    }
  };
  
  // Calculate totals
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };
  
  const calculateTaxAmount = () => {
    const subtotal = calculateSubtotal();
    return subtotal * ((form.tax_rate || 0) / 100);
  };
  
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount();
    const discount = form.discount_amount || 0;
    return subtotal + taxAmount - discount;
  };
  
  // Save quote
  const handleSaveQuote = async () => {
    try {
      setLoading(true);
      setSubmitError('');
      
      // Validate form
      if (!form.customer_id) {
        setSubmitError('Please select a customer');
        return;
      }
      
      if (!form.title) {
        setSubmitError('Please enter a title');
        return;
      }
      
      if (items.length === 0) {
        setSubmitError('Please add at least one item');
        return;
      }
      
      // Calculate totals
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTaxAmount();
      const totalAmount = calculateTotal();
      
      // Prepare quote data
      const quoteData = {
        ...form,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      };
      
      let quoteId = form.id;
      
      if (isEditing) {
        // Update existing quote
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', quoteId);
        
        if (error) throw error;
        
      } else {
        // Generate quote number
        const quoteNumber = `Q-${Date.now().toString().slice(-6)}`;
        
        // Create new quote
        const { data, error } = await supabase
          .from('quotes')
          .insert({
            ...quoteData,
            quote_number: quoteNumber,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        quoteId = data.id;
      }
      
      // Handle items
      if (quoteId) {
        // Delete existing items if editing
        if (isEditing) {
          await supabase
            .from('quote_items')
            .delete()
            .eq('quote_id', quoteId);
        }
        
        // Insert items
        const itemsToInsert = items.map((item, index) => ({
          quote_id: quoteId,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          label: item.label,
          notes: item.notes,
          sort_order: index
        }));
        
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;
        
        // Handle attachments
        // In a real application, you would upload files to storage
        // and then save the reference in the database
        
        // For demonstration, we'll just update or insert attachment records
        if (fileAttachments.length > 0) {
          const attachmentsToUpsert = fileAttachments.map(attachment => ({
            ...attachment,
            quote_id: quoteId
          }));
          
          // If editing, delete existing attachments
          if (isEditing) {
            await supabase
              .from('quote_attachments')
              .delete()
              .eq('quote_id', quoteId);
          }
          
          const { error: attachmentsError } = await supabase
            .from('quote_attachments')
            .insert(attachmentsToUpsert);
          
          if (attachmentsError) throw attachmentsError;
        }
        
        // Success!
        onSave();
      }
      
    } catch (error) {
      console.error('Error saving quote:', error);
      setSubmitError('Error saving quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Get label badge class
  const getLabelBadgeClass = (label: string) => {
    switch (label) {
      case 'recommended':
        return 'bg-blue-100 text-blue-800';
      case 'optional':
        return 'bg-gray-100 text-gray-800';
      case 'required':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Quote' : 'Create New Quote'}
        </h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveQuote}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Check className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : isEditing ? 'Update Quote' : 'Create Quote'}
          </button>
        </div>
      </div>
      
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          {submitError}
        </div>
      )}
      
      <div className="grid grid-cols-12 gap-6">
        {/* Left column - Form fields */}
        <div className="col-span-8 space-y-6">
          {/* Basic Info */}
          <DashboardCard title="Quote Information" fullWidth>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <select
                    name="customer_id"
                    value={form.customer_id || ''}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    name="valid_until"
                    value={form.valid_until ? form.valid_until.split('T')[0] : ''}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title || ''}
                  onChange={handleFormChange}
                  placeholder="Quote Title"
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description || ''}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Brief description of this quote"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Internal)
                </label>
                <textarea
                  name="notes"
                  value={form.notes || ''}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Internal notes (not visible to customer)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  name="terms_conditions"
                  value={form.terms_conditions || ''}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Terms and conditions for this quote"
                />
              </div>
            </div>
          </DashboardCard>
          
          {/* Quote Items */}
          <DashboardCard 
            title={
              <div className="flex items-center justify-between">
                <span>Quote Items</span>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setItemForm({
                      quantity: 1,
                      unit_price: 0,
                      total_price: 0,
                      label: 'recommended',
                      sort_order: items.length
                    });
                    setShowItemForm(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Item
                </button>
              </div>
            }
            fullWidth
          >
            {showItemForm && (
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium mb-3">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product (Optional)
                    </label>
                    <select
                      value={itemForm.product_id || ''}
                      onChange={handleProductSelect}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                    >
                      <option value="">Select a product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <select
                      name="label"
                      value={itemForm.label || 'recommended'}
                      onChange={handleItemFormChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="optional">Optional</option>
                      <option value="required">Required</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={itemForm.description || ''}
                    onChange={handleItemFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      min="0.01"
                      step="0.01"
                      value={itemForm.quantity || ''}
                      onChange={handleItemNumberChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      name="unit_price"
                      min="0.01"
                      step="0.01"
                      value={itemForm.unit_price || ''}
                      onChange={handleItemNumberChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(itemForm.total_price || 0)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={itemForm.notes || ''}
                    onChange={handleItemFormChange}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    placeholder="Optional notes about this item"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowItemForm(false);
                      setEditingItem(null);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleAddUpdateItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="p-4">
              {items.length === 0 ? (
                <p className="text-center text-gray-500 my-4">
                  No items added yet. Click "Add Item" to start building your quote.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Label
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.description}
                            </div>
                            {item.notes && (
                              <div className="text-sm text-gray-500">{item.notes}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-500">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(item.total_price)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLabelBadgeClass(item.label)}`}>
                              {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </DashboardCard>
          
          {/* Attachments */}
          <DashboardCard title="Attachments" fullWidth>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Files (Images, PDFs, etc.)
                </label>
                <div className="flex items-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="border border-gray-300 rounded-md py-2 px-3 flex-1"
                  />
                  <button
                    onClick={handleUploadFiles}
                    disabled={selectedFiles.length === 0 || fileUploading}
                    className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50"
                  >
                    {fileUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                {selectedFiles.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedFiles.length} file(s) selected
                  </p>
                )}
              </div>
              
              {fileAttachments.length > 0 ? (
                <div className="space-y-2">
                  {fileAttachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div className="flex items-center">
                        {attachment.file_type.startsWith('image/') ? (
                          <Image className="w-5 h-5 text-blue-500 mr-2" />
                        ) : (
                          <File className="w-5 h-5 text-blue-500 mr-2" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {Math.round(attachment.file_size / 1024)} KB
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No attachments added yet. Add files to include with the quote.
                </p>
              )}
            </div>
          </DashboardCard>
        </div>
        
        {/* Right column - Summary */}
        <div className="col-span-4 space-y-6">
          {/* Quote Summary */}
          <DashboardCard title="Quote Summary" fullWidth>
            <div className="p-4">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="tax_rate"
                  min="0"
                  step="0.01"
                  value={form.tax_rate || 0}
                  onChange={handleNumberChange}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount
                </label>
                <input
                  type="number"
                  name="discount_amount"
                  min="0"
                  step="0.01"
                  value={form.discount_amount || 0}
                  onChange={handleNumberChange}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                </div>
                
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tax ({form.tax_rate || 0}%):</span>
                  <span className="font-medium">{formatCurrency(calculateTaxAmount())}</span>
                </div>
                
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">- {formatCurrency(form.discount_amount || 0)}</span>
                </div>
                
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                  <span className="text-gray-700 font-bold">Total:</span>
                  <span className="text-gray-900 font-bold">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          </DashboardCard>
          
          {/* Status */}
          <DashboardCard title="Quote Status" fullWidth>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status || 'draft'}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              
              <p className="text-sm text-gray-500">
                Setting this to "Sent" will mark the quote as ready to be viewed by the customer. 
                You can send it directly from the quote details page.
              </p>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
} 