import { supabase } from '../lib/supabase';

// Scheduling
export const fetchSchedules = async (userId: string) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      id, 
      date, 
      time_window,
      technicians (id, full_name, avatar_url)
    `)
    .eq('customer_id', userId)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date');
    
  if (error) throw error;
  return data;
};

export const subscribeToSchedules = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('schedules-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'schedules',
        filter: `customer_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

// Service History
export const fetchServiceHistory = async (userId: string, page = 0, limit = 10) => {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id,
      date,
      status,
      notes,
      technician_id,
      technicians (full_name),
      chemical_logs (id, ph, chlorine, alkalinity, created_at)
    `)
    .eq('customer_id', userId)
    .lt('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: false })
    .range(from, to);
    
  if (error) throw error;
  return data;
};

// Billing
export const fetchInvoices = async (userId: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      issue_date,
      due_date,
      amount,
      status,
      payment_method,
      payments (id, amount, date, status)
    `)
    .eq('customer_id', userId)
    .order('issue_date', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const processPayment = async (invoiceId: string, amount: number, paymentMethod: string) => {
  // This is a placeholder for a real payment processing function
  // In a real application, this would integrate with a payment gateway
  const { data, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount,
      payment_method: paymentMethod,
      date: new Date().toISOString(),
      status: 'completed'
    })
    .select();
    
  if (error) throw error;
  
  // Update invoice status
  await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', invoiceId);
    
  // Send payment receipt email
  await sendPaymentReceipt(invoiceId);
  
  return data;
};

export const sendPaymentReceipt = async (invoiceId: string) => {
  // Placeholder for email sending functionality
  // This would typically call a serverless function or API
  const { data, error } = await supabase
    .from('email_settings')
    .select('*')
    .eq('type', 'payment_receipt')
    .single();
    
  if (error) throw error;
  
  console.log('Would send email with template:', data?.template);
  
  return true;
};

// Quotes
export const fetchQuotes = async (userId: string) => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      created_at,
      valid_until,
      amount,
      status,
      service_type,
      description,
      last_viewed_at
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const updateQuoteStatus = async (quoteId: string, status: 'approved' | 'denied') => {
  const { data, error } = await supabase
    .from('quotes')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', quoteId)
    .select();
    
  if (error) throw error;
  return data;
};

export const updateQuoteViewedAt = async (quoteId: string) => {
  const { data, error } = await supabase
    .from('quotes')
    .update({
      last_viewed_at: new Date().toISOString()
    })
    .eq('id', quoteId)
    .select();
    
  if (error) throw error;
  return data;
};

// Jobs
export const fetchActiveJobs = async (userId: string) => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id,
      date,
      job_type,
      status,
      description,
      time_windows (id, name, start_time, end_time)
    `)
    .eq('customer_id', userId)
    .eq('status', 'scheduled')
    .order('date');
    
  if (error) throw error;
  
  // Separate one-time jobs and route stops
  const oneTimeJobs = data.filter(job => job.job_type === 'one_time');
  const routeStops = data.filter(job => job.job_type === 'route_stop');
  
  return { oneTimeJobs, routeStops };
};

// Pool DNA
export const fetchPoolDNA = async (userId: string) => {
  const { data, error } = await supabase
    .from('pool_dna')
    .select(`
      id,
      volume,
      surface_area,
      pool_type,
      last_service_date,
      equipment (id, name, type, installation_date, last_maintenance_date),
      chemical_logs (id, ph, chlorine, alkalinity, created_at)
    `)
    .eq('customer_id', userId)
    .single();
    
  if (error) throw error;
  
  // Calculate days since last service
  const lastServiceDate = new Date(data.last_service_date);
  const currentDate = new Date();
  const daysSinceLastService = Math.floor((currentDate.getTime() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate maintenance suggestion if needed
  let suggestion = null;
  if (daysSinceLastService > 30) {
    suggestion = "It's been over 30 days since your last service. We recommend scheduling maintenance soon.";
  }
  
  return {
    ...data,
    daysSinceLastService,
    suggestion
  };
};

// Helper to create charts for chemical trends
export const getChemicalTrends = (chemicalLogs: any[]) => {
  if (!chemicalLogs || chemicalLogs.length === 0) return null;
  
  // Sort by date
  const sortedLogs = [...chemicalLogs].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Format data for charts
  const dates = sortedLogs.map(log => {
    const date = new Date(log.created_at);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  
  const phValues = sortedLogs.map(log => log.ph);
  const chlorineValues = sortedLogs.map(log => log.chlorine);
  const alkalinityValues = sortedLogs.map(log => log.alkalinity);
  
  return {
    dates,
    datasets: [
      {
        label: 'pH',
        data: phValues,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
      },
      {
        label: 'Chlorine',
        data: chlorineValues,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      },
      {
        label: 'Alkalinity',
        data: alkalinityValues,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      }
    ]
  };
};

// Contact
export const submitContactForm = async (userId: string, subject: string, message: string) => {
  const { data, error } = await supabase
    .from('contact_messages')
    .insert({
      customer_id: userId,
      subject,
      message,
      created_at: new Date().toISOString(),
      status: 'new'
    })
    .select();
    
  if (error) throw error;
  return data;
}; 