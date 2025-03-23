import { useState, useEffect } from 'react';
import { DashboardCard } from '../../components/DashboardCard';
import { supabase } from '../../lib/supabase';
import { fetchInvoices, processPayment } from '../../services/supabaseService';
import { CreditCard, Receipt, DollarSign, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  amount: number;
  status: string;
  payment_method: string | null;
  payments: Payment[];
}

export function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('credit_card');
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');
        
        const data = await fetchInvoices(user.id);
        
        // Transform data to match Invoice type
        const typedData = data?.map((item: any) => ({
          id: item.id,
          invoice_number: item.invoice_number,
          issue_date: item.issue_date,
          due_date: item.due_date,
          amount: item.amount,
          status: item.status,
          payment_method: item.payment_method,
          payments: item.payments || []
        })) || [];
        
        setInvoices(typedData);
      } catch (err: any) {
        console.error('Error loading invoices:', err);
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

  // Calculate days until due or overdue
  const getDueStatus = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const differenceInTime = due.getTime() - today.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    
    if (differenceInDays < 0) {
      return {
        text: `Overdue by ${Math.abs(differenceInDays)} days`,
        color: 'text-red-600'
      };
    } else if (differenceInDays === 0) {
      return {
        text: 'Due today',
        color: 'text-yellow-600'
      };
    } else {
      return {
        text: `Due in ${differenceInDays} days`,
        color: 'text-green-600'
      };
    }
  };

  // Handle payment
  const handlePayNow = async (invoice: Invoice) => {
    try {
      setProcessingPayment(true);
      
      // Process payment
      await processPayment(invoice.id, invoice.amount, selectedPaymentMethod);
      
      // Show success message
      setPaymentSuccess(`Payment of ${formatCurrency(invoice.amount)} for invoice #${invoice.invoice_number} was successful.`);
      
      // Refresh invoices
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await fetchInvoices(user.id);
        
        // Transform data to match Invoice type
        const typedData = data?.map((item: any) => ({
          id: item.id,
          invoice_number: item.invoice_number,
          issue_date: item.issue_date,
          due_date: item.due_date,
          amount: item.amount,
          status: item.status,
          payment_method: item.payment_method,
          payments: item.payments || []
        })) || [];
        
        setInvoices(typedData);
      }
      
      // Clear success message after a delay
      setTimeout(() => {
        setPaymentSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError(`Payment failed: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Toggle expanded invoice
  const toggleInvoice = (invoiceId: string) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
    } else {
      setExpandedInvoice(invoiceId);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return (
          <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </div>
        );
      case 'overdue':
        return (
          <div className="flex items-center text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Billing & Payments</h1>
      
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start mb-6">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{paymentSuccess}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start mb-6">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      
      <DashboardCard 
        title="Recent Invoices" 
        loading={loading}
        fullWidth
      >
        {invoices.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {invoices.map(invoice => {
              const isExpanded = expandedInvoice === invoice.id;
              const dueStatus = getDueStatus(invoice.due_date);
              
              return (
                <div key={invoice.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex items-start space-x-3 md:w-1/3">
                      <div className="bg-blue-100 text-blue-700 p-2 rounded-full flex-shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Invoice #{invoice.invoice_number}</div>
                        <div className="text-sm text-gray-500">Issued: {formatDate(invoice.issue_date)}</div>
                        <div className={`text-sm ${dueStatus.color}`}>{dueStatus.text}</div>
                      </div>
                    </div>
                    
                    <div className="md:w-1/3 flex justify-center">
                      {getStatusBadge(invoice.status)}
                    </div>
                    
                    <div className="md:w-1/3 flex md:justify-end items-center w-full md:w-auto">
                      <span className="font-bold text-gray-900 mr-4">{formatCurrency(invoice.amount)}</span>
                      
                      {invoice.status.toLowerCase() !== 'paid' && (
                        <button
                          onClick={() => toggleInvoice(invoice.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Pay Invoice</h4>
                      
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Select payment method:</p>
                        <div className="flex space-x-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              className="form-radio text-blue-600"
                              name="paymentMethod"
                              value="credit_card"
                              checked={selectedPaymentMethod === 'credit_card'}
                              onChange={() => setSelectedPaymentMethod('credit_card')}
                            />
                            <span className="ml-2 text-sm">Credit Card</span>
                          </label>
                          
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              className="form-radio text-blue-600"
                              name="paymentMethod"
                              value="bank_transfer"
                              checked={selectedPaymentMethod === 'bank_transfer'}
                              onChange={() => setSelectedPaymentMethod('bank_transfer')}
                            />
                            <span className="ml-2 text-sm">Bank Transfer</span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="font-medium mb-3">
                        Amount due: {formatCurrency(invoice.amount)}
                      </div>
                      
                      <button
                        onClick={() => handlePayNow(invoice)}
                        disabled={processingPayment}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center"
                      >
                        {processingPayment ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 mr-1" />
                            Pay Now
                          </>
                        )}
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
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices yet</h3>
            <p className="text-gray-500">Your billing history will appear here once services are rendered.</p>
          </div>
        )}
      </DashboardCard>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Payment Methods</h3>
        <p className="text-blue-700 mb-4">
          We accept all major credit cards and bank transfers. Need to set up automatic payments?
          Contact us for convenient payment options.
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="bg-white px-3 py-2 rounded shadow-sm text-gray-700 text-sm flex items-center">
            <CreditCard className="w-4 h-4 mr-1" /> Credit Card
          </div>
          <div className="bg-white px-3 py-2 rounded shadow-sm text-gray-700 text-sm flex items-center">
            <Receipt className="w-4 h-4 mr-1" /> Bank Transfer
          </div>
        </div>
      </div>
    </div>
  );
} 