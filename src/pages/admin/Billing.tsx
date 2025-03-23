import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Form, 
  InputGroup, 
  Dropdown, 
  Badge, 
  Modal, 
  Alert,
  Row,
  Col,
  Spinner
} from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import { FaPlus, FaFileInvoiceDollar, FaReceipt, FaCreditCard, FaSync, FaEnvelope, FaSearch, FaEdit, FaTrash, FaFileAlt, FaCog, FaFilter } from 'react-icons/fa';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DashboardCard } from '../../components/DashboardCard';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';

// Type definitions
interface BillingSettings {
  id: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  tax_rate: number;
  default_terms: number;
  invoice_prefix: string;
  receipt_prefix: string;
  logo_url: string;
  default_pricing_model: string;
  chemical_extras_enabled: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  receipt_number: string;
}

interface Customer {
  id: string;
  full_name: string;
}

export function AdminBilling() {
  // Get URL search params to determine which view to show
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'invoices';
  const navigate = useNavigate();
  
  // State hooks
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Filter states
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Load data on component mount and when view changes
  useEffect(() => {
    loadData();
  }, [view]);
  
  // Fetch all relevant data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load customers for reference
      const { data: customersData, error: customersError } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');
        
      if (customersError) throw customersError;
      setCustomers(customersData || []);
      
      // Load billing settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('billing_settings')
        .select('*')
        .limit(1)
        .single();
        
      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      
      setBillingSettings(settingsData || null);
      
      // Load data based on view
      if (view === 'invoices') {
        await loadInvoices();
      } else if (view === 'payments') {
        await loadPayments();
      }
      
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Load invoices
  const loadInvoices = async () => {
    try {
      // Get the current user to verify access
      const { data: userData } = await supabase.auth.getUser();
      
      // First attempt to load using regular query
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          customer_id,
          issue_date, 
          due_date,
          subtotal,
          tax_rate,
          tax_amount,
          discount_amount,
          total_amount,
          status,
          created_at,
          customer:customer_id (
            full_name
          )
        `)
        .order('issue_date', { ascending: false });
        
      if (invoicesError) {
        console.warn('Error using standard query, may be permission issue:', invoicesError);
        
        // If that fails, try a different approach
        const { data: basicInvoicesData, error: basicError } = await supabase
          .from('invoices')
          .select('*')
          .order('issue_date', { ascending: false });
          
        if (basicError) throw basicError;
        
        // Get customer names separately
        const customerIds = basicInvoicesData?.map(invoice => invoice.customer_id) || [];
        const { data: customersData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', customerIds);
          
        // Map customer names to invoices
        const customerMap: Record<string, string> = (customersData || []).reduce((map: Record<string, string>, customer: any) => {
          map[customer.id] = customer.full_name;
          return map;
        }, {});
        
        const formattedInvoices = basicInvoicesData?.map(invoice => ({
          ...invoice,
          customer_name: customerMap[invoice.customer_id] || 'Unknown Customer'
        })) || [];
        
        setInvoices(formattedInvoices);
        return;
      }
      
      // Transform to include customer name
      const formattedInvoices = invoicesData?.map(invoice => ({
        ...invoice,
        customer_name: invoice.customer?.full_name
      })) || [];
      
      setInvoices(formattedInvoices);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError(err.message);
    }
  };
  
  // Load payments
  const loadPayments = async () => {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customer_id (
            full_name
          ),
          invoice:invoice_id (
            invoice_number
          )
        `)
        .order('payment_date', { ascending: false });
        
      if (paymentsError) throw paymentsError;
      
      // Transform to include customer name and invoice number
      const formattedPayments = paymentsData?.map(payment => ({
        ...payment,
        customer_name: payment.customer?.full_name,
        invoice_number: payment.invoice?.invoice_number
      })) || [];
      
      setPayments(formattedPayments);
    } catch (err: any) {
      console.error('Error loading payments:', err);
      setError(err.message);
    }
  };
  
  // Process payment for an invoice
  const handleProcessPayment = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };
  
  // Submit payment
  const submitPayment = async (paymentMethod: string, amount: number) => {
    if (!selectedInvoice) return;
    
    try {
      setLoading(true);
      
      // Call the process_payment function
      const { data, error } = await supabase.rpc('process_payment', {
        _invoice_id: selectedInvoice.id,
        _amount: amount,
        _payment_method: paymentMethod
      });
      
      if (error) throw error;
      
      setSuccess(`Payment processed successfully. Receipt #: ${data}`);
      setShowPaymentModal(false);
      
      // Refresh data
      await loadData();
      
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter invoices based on search term
  const filteredInvoices = invoices.filter(invoice => {
    let matchesSearch = invoice.invoice_number.toLowerCase().includes(invoiceFilter.toLowerCase()) ||
      (invoice.customer_name && invoice.customer_name.toLowerCase().includes(invoiceFilter.toLowerCase()));
    
    let matchesStatus = statusFilter === 'All Statuses' || 
      invoice.status.toLowerCase() === statusFilter.toLowerCase();
    
    let matchesCustomer = !customerFilter || 
      invoice.customer_id === customerFilter;
    
    let matchesDate = !dateFilter || 
      invoice.issue_date === dateFilter;
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesDate;
  });
  
  // Filter payments based on search term
  const filteredPayments = payments.filter(payment => {
    let matchesSearch = (payment.receipt_number && payment.receipt_number.toLowerCase().includes(paymentFilter.toLowerCase())) ||
      (payment.customer_name && payment.customer_name.toLowerCase().includes(paymentFilter.toLowerCase())) ||
      (payment.invoice_number && payment.invoice_number.toLowerCase().includes(paymentFilter.toLowerCase()));
    
    let matchesCustomer = !customerFilter || 
      payment.customer_id === customerFilter;
    
    let matchesDate = !dateFilter || 
      payment.payment_date.split('T')[0] === dateFilter;
    
    return matchesSearch && matchesCustomer && matchesDate;
  });
  
  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'draft':
        return 'secondary';
      case 'cancelled':
        return 'dark';
      case 'completed':
        return 'success';
      case 'processing':
        return 'info';
      case 'failed':
        return 'danger';
      case 'refunded':
        return 'dark';
      default:
        return 'primary';
    }
  };
  
  // Format payment method
  const formatPaymentMethod = (method: string) => {
    if (!method) return '';
    
    return method
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Apply filters
  const applyFilters = () => {
    loadData();
  };
  
  // Reset filters
  const resetFilters = () => {
    setInvoiceFilter('');
    setPaymentFilter('');
    setStatusFilter('All Statuses');
    setCustomerFilter('');
    setDateFilter('');
    loadData();
  };
  
  // Payment Modal
  const renderPaymentModal = () => (
    <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Process Payment</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {selectedInvoice && (
          <Form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const paymentMethod = formData.get('paymentMethod') as string;
            const amount = parseFloat(formData.get('amount') as string);
            submitPayment(paymentMethod, amount);
          }}>
            <Form.Group className="mb-3">
              <Form.Label>Invoice</Form.Label>
              <Form.Control
                type="text"
                value={selectedInvoice.invoice_number}
                readOnly
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Customer</Form.Label>
              <Form.Control
                type="text"
                value={selectedInvoice.customer_name || ''}
                readOnly
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                defaultValue={selectedInvoice.total_amount}
                step="0.01"
                min="0.01"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select name="paymentMethod" required>
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Process Payment'}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
  
  // Main navigation links
  const navigationLinks = [
    { name: 'Invoices', icon: <FaFileInvoiceDollar />, view: 'invoices' },
    { name: 'Payments', icon: <FaReceipt />, view: 'payments' },
    { name: 'Settings', icon: <FaCog />, view: 'settings', path: '/admin-dashboard/settings' }
  ];
  
  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
        <h1 className="mb-3 mb-md-0">Billing</h1>
        <div className="d-flex flex-wrap">
          {navigationLinks.map((link) => (
            <div key={link.view} className="me-2 mb-2">
              {link.path ? (
                <Link to={link.path} className={`btn ${view === link.view ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center`}>
                  <span className="me-2">{link.icon}</span>
                  <span className="d-none d-sm-inline">{link.name}</span>
                </Link>
              ) : (
                <Button 
                  variant={view === link.view ? 'primary' : 'outline-secondary'}
                  className="d-flex align-items-center"
                  onClick={() => navigate(`/admin-dashboard/billing?view=${link.view}`)}
                >
                  <span className="me-2">{link.icon}</span>
                  <span className="d-none d-sm-inline">{link.name}</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {view === 'invoices' && (
        <>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h2 className="mb-3 mb-md-0">Invoices</h2>
            <Button 
              variant="primary" 
              className="d-flex align-items-center"
              onClick={() => setShowInvoiceModal(true)}
            >
              <FaPlus className="me-2" /> 
              <span>Create Invoice</span>
            </Button>
          </div>
          
          <div className="card mb-4">
            <div className="card-body p-3">
              <div className="d-flex flex-wrap gap-2 mb-3">
                <InputGroup className="mb-2" style={{ minWidth: '200px', flex: '1 1 300px' }}>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search invoices..."
                    value={invoiceFilter}
                    onChange={(e) => setInvoiceFilter(e.target.value)}
                  />
                </InputGroup>
                
                <Form.Select 
                  className="mb-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ minWidth: '150px', flex: '1 1 200px' }}
                >
                  <option>All Statuses</option>
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Overdue</option>
                  <option>Cancelled</option>
                  <option>Draft</option>
                </Form.Select>
                
                <Form.Select 
                  className="mb-2"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  style={{ minWidth: '150px', flex: '1 1 200px' }}
                >
                  <option value="">All Customers</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </Form.Select>
                
                <Form.Control
                  className="mb-2"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{ minWidth: '150px', flex: '1 1 auto' }}
                />
                
                <Button 
                  variant="primary" 
                  className="d-flex align-items-center mb-2"
                  style={{ minWidth: '120px' }}
                  onClick={applyFilters}
                >
                  <FaFilter className="me-2" /> Apply Filters
                </Button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Alert variant="info">No invoices found</Alert>
          ) : (
            <div className="card">
              <div className="card-body p-0">
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(invoice => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoice_number}</td>
                        <td>{invoice.customer_name}</td>
                        <td>{formatDate(invoice.issue_date)}</td>
                        <td>{formatDate(invoice.due_date)}</td>
                        <td>{formatCurrency(invoice.total_amount)}</td>
                        <td>
                          <Badge bg={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowInvoiceModal(true);
                              }}
                            >
                              <FaEdit />
                            </Button>
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              onClick={() => handleProcessPayment(invoice)}
                              disabled={invoice.status === 'paid'}
                            >
                              <FaCreditCard />
                            </Button>
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={() => {
                                console.log('View invoice', invoice.id);
                              }}
                            >
                              <FaFileAlt />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
      
      {view === 'payments' && (
        <>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <h2 className="mb-3 mb-md-0">Payments</h2>
          </div>
          
          <div className="card mb-4">
            <div className="card-body p-3">
              <div className="d-flex flex-wrap gap-2 mb-3">
                <InputGroup className="mb-2" style={{ minWidth: '200px', flex: '1 1 300px' }}>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search payments..."
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                  />
                </InputGroup>
                
                <Form.Select 
                  className="mb-2"
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  style={{ minWidth: '150px', flex: '1 1 200px' }}
                >
                  <option value="">All Customers</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </Form.Select>
                
                <Form.Control
                  className="mb-2"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{ minWidth: '150px', flex: '1 1 auto' }}
                />
                
                <Button 
                  variant="primary" 
                  className="d-flex align-items-center mb-2"
                  style={{ minWidth: '120px' }}
                  onClick={applyFilters}
                >
                  <FaFilter className="me-2" /> Apply Filters
                </Button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <Alert variant="info">No payments found</Alert>
          ) : (
            <div className="card">
              <div className="card-body p-0">
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(payment => (
                      <tr key={payment.id}>
                        <td>{payment.receipt_number}</td>
                        <td>{payment.invoice_number}</td>
                        <td>{payment.customer_name}</td>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{formatPaymentMethod(payment.payment_method)}</td>
                        <td>
                          <Badge bg={getStatusBadgeVariant(payment.status)}>
                            {payment.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={() => {
                                console.log('View receipt', payment.id);
                              }}
                            >
                              <FaReceipt />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Modals */}
      {renderPaymentModal()}
    </>
  );
} 