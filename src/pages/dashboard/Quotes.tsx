import { useState, useEffect } from 'react';
import { DashboardCard } from '../../components/DashboardCard';
import { supabase } from '../../lib/supabase';
import { fetchQuotes, updateQuoteStatus, updateQuoteViewedAt } from '../../services/supabaseService';
import { FileText, Calendar, DollarSign, Clock, CheckCircle, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Quote {
  id: string;
  quote_number: string;
  created_at: string;
  valid_until: string;
  amount: number;
  status: string;
  service_type: string;
  description: string;
  last_viewed_at: string | null;
}

export function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingQuote, setUpdatingQuote] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');
        
        const data = await fetchQuotes(user.id);
        
        // Transform data to match Quote type
        const typedData = data?.map((item: any) => ({
          id: item.id,
          quote_number: item.quote_number,
          created_at: item.created_at,
          valid_until: item.valid_until,
          amount: item.amount,
          status: item.status,
          service_type: item.service_type,
          description: item.description,
          last_viewed_at: item.last_viewed_at
        })) || [];
        
        // Mark quotes as viewed when they are first loaded
        typedData.forEach(quote => {
          if (quote.status === 'pending' && !quote.last_viewed_at) {
            updateQuoteViewedAt(quote.id);
          }
        });
        
        setQuotes(typedData);
      } catch (err: any) {
        console.error('Error loading quotes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate days until expiration
  const getExpirationInfo = (validUntil: string) => {
    const today = new Date();
    const expiration = new Date(validUntil);
    const differenceInTime = expiration.getTime() - today.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    
    if (differenceInDays < 0) {
      return {
        text: 'Expired',
        color: 'text-red-600'
      };
    } else if (differenceInDays <= 3) {
      return {
        text: `Expires in ${differenceInDays} days`,
        color: 'text-yellow-600'
      };
    } else {
      return {
        text: `Valid for ${differenceInDays} days`,
        color: 'text-green-600'
      };
    }
  };

  // Handle approve/deny quote
  const handleQuoteAction = async (quoteId: string, action: 'approved' | 'denied') => {
    try {
      setUpdatingQuote(quoteId);
      
      await updateQuoteStatus(quoteId, action);
      
      // Update local state
      setQuotes(prev => prev.map(quote => 
        quote.id === quoteId ? { ...quote, status: action } : quote
      ));
      
      // Show success message
      setSuccessMessage(`Quote has been ${action} successfully.`);
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error(`Error ${action} quote:`, err);
      setError(err.message);
    } finally {
      setUpdatingQuote(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return (
          <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </div>
        );
      case 'denied':
        return (
          <div className="flex items-center text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-700 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium">
            {status}
          </div>
        );
    }
  };

  // Format view timestamp
  const formatViewedTime = (timestamp: string) => {
    if (!timestamp) return null;
    
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quotes</h1>
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start mb-6">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start mb-6">
          <XCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      
      <DashboardCard 
        title="Your Quotes" 
        loading={loading}
        fullWidth
      >
        {quotes.length > 0 ? (
          <div className="space-y-6">
            {quotes.map(quote => {
              const expirationInfo = getExpirationInfo(quote.valid_until);
              const isPending = quote.status.toLowerCase() === 'pending';
              
              return (
                <div key={quote.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 text-blue-700 p-2 rounded-full flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {quote.service_type} - Quote #{quote.quote_number}
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>Created on {formatDate(quote.created_at)}</span>
                        </div>
                        <div className={`text-sm ${expirationInfo.color} mt-1`}>
                          {expirationInfo.text}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(quote.status)}
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(quote.amount)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded mb-4">
                    <p className="text-gray-700">{quote.description}</p>
                  </div>
                  
                  {quote.last_viewed_at && (
                    <div className="text-xs text-gray-500 mb-3">
                      First viewed: {formatViewedTime(quote.last_viewed_at)}
                    </div>
                  )}
                  
                  {isPending && (
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleQuoteAction(quote.id, 'approved')}
                        disabled={!!updatingQuote}
                        className="bg-green-600 text-white px-3 py-2 rounded flex items-center hover:bg-green-700 transition-colors disabled:bg-green-300"
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Approve
                      </button>
                      
                      <button
                        onClick={() => handleQuoteAction(quote.id, 'denied')}
                        disabled={!!updatingQuote}
                        className="bg-red-600 text-white px-3 py-2 rounded flex items-center hover:bg-red-700 transition-colors disabled:bg-red-300"
                      >
                        <ThumbsDown className="w-4 h-4 mr-1" />
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No quotes yet</h3>
            <p className="text-gray-500">You don't have any quotes at the moment.</p>
          </div>
        )}
      </DashboardCard>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Need a quote?</h3>
        <p className="text-blue-700 mb-4">
          Contact us to get a quote for your pool service needs. We offer competitive rates and excellent service.
        </p>
        <a 
          href="/customer-dashboard/contact" 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
        >
          Request a Quote
        </a>
      </div>
    </div>
  );
} 