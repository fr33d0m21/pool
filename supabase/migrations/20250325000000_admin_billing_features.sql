/*
  # Admin Dashboard Billing Features
  
  This migration creates and updates tables needed for:
  - Enhanced billing system
  - Multiple pricing models
  - Payment processing
  - Automated invoice generation
  - Customer billing terms
*/

-- Create payment_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create payment_method enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('credit_card', 'bank_transfer', 'check', 'cash', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create invoice_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create pricing_model enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE pricing_model AS ENUM ('flat_rate', 'per_visit', 'per_item');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Modify customers table (users) to add billing-related fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS billing_address text,
ADD COLUMN IF NOT EXISTS billing_city text,
ADD COLUMN IF NOT EXISTS billing_state text,
ADD COLUMN IF NOT EXISTS billing_zip text,
ADD COLUMN IF NOT EXISTS billing_terms integer DEFAULT 30, -- Net 30, Net 15, etc.
ADD COLUMN IF NOT EXISTS default_payment_method payment_method,
ADD COLUMN IF NOT EXISTS auto_pay boolean DEFAULT false;

-- Create billing_settings table
CREATE TABLE IF NOT EXISTS billing_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name varchar(100),
  company_address text,
  company_phone varchar(20),
  company_email varchar(100),
  tax_rate decimal(5,2) DEFAULT 0,
  default_terms integer DEFAULT 30,
  invoice_prefix varchar(10) DEFAULT 'INV-',
  receipt_prefix varchar(10) DEFAULT 'RCPT-',
  logo_url text,
  invoice_notes text,
  receipt_notes text,
  invoice_footer text,
  default_pricing_model pricing_model DEFAULT 'flat_rate',
  chemical_extras_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or update payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_date timestamptz DEFAULT now(),
  status payment_status NOT NULL DEFAULT 'completed',
  transaction_id varchar(100),
  receipt_number varchar(50),
  receipt_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update invoices table with additional fields if it exists
DO $$ 
BEGIN
  -- Check if invoices table exists before modifying
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    -- Rename user_id to customer_id if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'invoices' 
               AND column_name = 'user_id') THEN
      ALTER TABLE invoices RENAME COLUMN user_id TO customer_id;
    END IF;
    
    -- Add or modify columns
    ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS invoice_number varchar(50),
    ADD COLUMN IF NOT EXISTS issue_date date DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS status invoice_status DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS subtotal decimal(10,2),
    ADD COLUMN IF NOT EXISTS tax_rate decimal(5,2),
    ADD COLUMN IF NOT EXISTS tax_amount decimal(10,2),
    ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2),
    ADD COLUMN IF NOT EXISTS payment_method payment_method,
    ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES schedules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS terms integer DEFAULT 30;
    
    -- Ensure data consistency
    UPDATE invoices SET invoice_number = id::text WHERE invoice_number IS NULL;
    UPDATE invoices SET issue_date = created_at::date WHERE issue_date IS NULL;
    UPDATE invoices SET subtotal = total_amount WHERE subtotal IS NULL;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
  ELSE
    -- Create invoices table if it doesn't exist
    CREATE TABLE invoices (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_number varchar(50) NOT NULL,
      customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
      service_visit_id uuid REFERENCES service_visits(id) ON DELETE SET NULL,
      job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
      schedule_id uuid REFERENCES schedules(id) ON DELETE SET NULL,
      issue_date date DEFAULT CURRENT_DATE,
      due_date date NOT NULL,
      subtotal decimal(10,2) NOT NULL,
      tax_rate decimal(5,2) DEFAULT 0,
      tax_amount decimal(10,2) DEFAULT 0,
      discount_amount decimal(10,2) DEFAULT 0,
      total_amount decimal(10,2) NOT NULL,
      status invoice_status DEFAULT 'pending',
      terms integer DEFAULT 30,
      payment_method payment_method,
      notes text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
    CREATE INDEX idx_invoices_status ON invoices(status);
    CREATE INDEX idx_invoices_due_date ON invoices(due_date);
  END IF;
END $$;

-- Create email_settings table for invoice and receipt emails
DO $$ 
BEGIN
  -- Check if email_settings table exists before creating
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_settings') THEN
    CREATE TABLE email_settings (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      type varchar(50) NOT NULL, -- 'invoice', 'receipt', 'reminder'
      subject_template text NOT NULL,
      body_template text NOT NULL,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  ELSE
    -- Add columns if they don't exist
    ALTER TABLE email_settings
    ADD COLUMN IF NOT EXISTS type varchar(50),
    ADD COLUMN IF NOT EXISTS subject_template text,
    ADD COLUMN IF NOT EXISTS body_template text,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_email_settings_type ON email_settings(type);
  END IF;
END $$;

-- Create recurring_invoice_templates table
CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  frequency varchar(20) NOT NULL, -- 'monthly', 'biweekly', 'weekly'
  day_of_month integer, -- For monthly billing
  day_of_week integer, -- For weekly/biweekly billing
  subtotal decimal(10,2) NOT NULL,
  tax_rate decimal(5,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  next_generation_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recurring_invoice_items table
CREATE TABLE IF NOT EXISTS recurring_invoice_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL REFERENCES recurring_invoice_templates(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number() 
RETURNS varchar AS $$
DECLARE
  _prefix varchar;
  _next_num integer;
  _invoice_number varchar;
BEGIN
  -- Get prefix from billing settings
  SELECT COALESCE(invoice_prefix, 'INV-') INTO _prefix 
  FROM billing_settings 
  LIMIT 1;
  
  -- Get the next number
  SELECT COALESCE(MAX(REGEXP_REPLACE(invoice_number, '^.*-', '', 'g')::integer), 0) + 1 
  INTO _next_num
  FROM invoices
  WHERE invoice_number ~ ('^' || _prefix || '[0-9]+$');
  
  -- Format invoice number
  _invoice_number := _prefix || LPAD(_next_num::text, 6, '0');
  
  RETURN _invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number() 
RETURNS varchar AS $$
DECLARE
  _prefix varchar;
  _next_num integer;
  _receipt_number varchar;
BEGIN
  -- Get prefix from billing settings
  SELECT COALESCE(receipt_prefix, 'RCPT-') INTO _prefix 
  FROM billing_settings 
  LIMIT 1;
  
  -- Get the next number
  SELECT COALESCE(MAX(REGEXP_REPLACE(receipt_number, '^.*-', '', 'g')::integer), 0) + 1 
  INTO _next_num
  FROM payments
  WHERE receipt_number ~ ('^' || _prefix || '[0-9]+$');
  
  -- Format receipt number
  _receipt_number := _prefix || LPAD(_next_num::text, 6, '0');
  
  RETURN _receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate monthly invoices from templates
CREATE OR REPLACE FUNCTION generate_monthly_invoices() 
RETURNS integer AS $$
DECLARE
  _template record;
  _invoice_id uuid;
  _invoice_number varchar;
  _due_date date;
  _tax_amount decimal(10,2);
  _total_amount decimal(10,2);
  _count integer := 0;
BEGIN
  -- Find templates due for generation today
  FOR _template IN 
    SELECT * FROM recurring_invoice_templates 
    WHERE is_active = true 
    AND next_generation_date <= CURRENT_DATE
  LOOP
    -- Calculate values
    _invoice_number := generate_invoice_number();
    
    -- Get customer billing terms
    SELECT COALESCE(billing_terms, 30) INTO _due_date 
    FROM users 
    WHERE id = _template.customer_id;
    
    _due_date := CURRENT_DATE + (_due_date || ' days')::interval;
    _tax_amount := _template.subtotal * (_template.tax_rate / 100);
    _total_amount := _template.subtotal + _tax_amount - _template.discount_amount;
    
    -- Create invoice
    INSERT INTO invoices (
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
      notes
    ) VALUES (
      _invoice_number,
      _template.customer_id,
      CURRENT_DATE,
      _due_date,
      _template.subtotal,
      _template.tax_rate,
      _tax_amount,
      _template.discount_amount,
      _total_amount,
      'pending',
      'Auto-generated monthly invoice'
    ) RETURNING id INTO _invoice_id;
    
    -- Create invoice items
    INSERT INTO invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total_price
    )
    SELECT
      _invoice_id,
      description,
      quantity,
      unit_price,
      quantity * unit_price
    FROM recurring_invoice_items
    WHERE template_id = _template.id;
    
    -- Update template next generation date
    UPDATE recurring_invoice_templates
    SET next_generation_date = 
      CASE _template.frequency
        WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE) + interval '1 month' + (COALESCE(_template.day_of_month, 1) - 1 || ' days')::interval
        WHEN 'biweekly' THEN CURRENT_DATE + interval '14 days'
        WHEN 'weekly' THEN CURRENT_DATE + interval '7 days'
        ELSE CURRENT_DATE + interval '30 days'
      END
    WHERE id = _template.id;
    
    _count := _count + 1;
  END LOOP;
  
  RETURN _count;
END;
$$ LANGUAGE plpgsql;

-- Function to process payment
CREATE OR REPLACE FUNCTION process_payment(
  _invoice_id uuid,
  _amount decimal,
  _payment_method payment_method
) 
RETURNS uuid AS $$
DECLARE
  _payment_id uuid;
  _customer_id uuid;
  _invoice_total decimal(10,2);
  _receipt_number varchar;
BEGIN
  -- Get invoice details
  SELECT customer_id, total_amount INTO _customer_id, _invoice_total
  FROM invoices
  WHERE id = _invoice_id;
  
  -- Generate receipt number
  _receipt_number := generate_receipt_number();
  
  -- Create payment record
  INSERT INTO payments (
    invoice_id,
    customer_id,
    amount,
    payment_method,
    status,
    receipt_number
  ) VALUES (
    _invoice_id,
    _customer_id,
    _amount,
    _payment_method,
    'completed',
    _receipt_number
  ) RETURNING id INTO _payment_id;
  
  -- Update invoice status
  IF _amount >= _invoice_total THEN
    UPDATE invoices
    SET status = 'paid'
    WHERE id = _invoice_id;
  END IF;
  
  RETURN _payment_id;
END;
$$ LANGUAGE plpgsql;

-- Initial billing settings
INSERT INTO billing_settings (
  company_name,
  company_email,
  tax_rate,
  default_terms,
  default_pricing_model,
  chemical_extras_enabled
)
VALUES (
  'Pool Spartans',
  'billing@poolspartans.com',
  7.5,
  30,
  'flat_rate',
  true
)
ON CONFLICT DO NOTHING;

-- Default email templates
INSERT INTO email_settings (
  type,
  subject_template,
  body_template,
  is_active
)
VALUES 
(
  'invoice', 
  'Your Invoice {{invoice_number}} from Pool Spartans',
  'Dear {{customer_name}},\n\nPlease find attached your invoice {{invoice_number}} for {{total_amount}}.\n\nDue date: {{due_date}}\n\nThank you for your business.\n\nPool Spartans',
  true
),
(
  'receipt', 
  'Payment Receipt {{receipt_number}} from Pool Spartans',
  'Dear {{customer_name}},\n\nThank you for your payment of {{amount}} on {{payment_date}}.\n\nReceipt: {{receipt_number}}\nInvoice: {{invoice_number}}\n\nWe appreciate your business.\n\nPool Spartans',
  true
),
(
  'reminder', 
  'Payment Reminder for Invoice {{invoice_number}}',
  'Dear {{customer_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.\n\nPlease contact us if you have any questions.\n\nPool Spartans',
  true
)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Admin policies
CREATE POLICY "Admin can manage all payments" ON payments 
  FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage billing settings" ON billing_settings 
  FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage email settings" ON email_settings 
  FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage recurring invoice templates" ON recurring_invoice_templates 
  FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage recurring invoice items" ON recurring_invoice_items 
  FOR ALL TO authenticated 
  USING (get_user_role() = 'admin');

-- Customer policies
CREATE POLICY "Customers can view their own payments" ON payments 
  FOR SELECT TO authenticated 
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can view their own recurring invoice templates" ON recurring_invoice_templates 
  FOR SELECT TO authenticated 
  USING (customer_id = auth.uid());

-- Ensure correct policies on invoices if they already exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'invoices' AND 
    policyname = 'Customers can view their own invoices'
  ) THEN
    DROP POLICY "Customers can view their own invoices" ON invoices;
  END IF;
  
  CREATE POLICY "Customers can view their own invoices" ON invoices 
    FOR SELECT TO authenticated 
    USING (customer_id = auth.uid());
    
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'invoices' AND 
    policyname = 'Admin can manage all invoices'
  ) THEN
    DROP POLICY "Admin can manage all invoices" ON invoices;
  END IF;
  
  CREATE POLICY "Admin can manage all invoices" ON invoices 
    FOR ALL TO authenticated 
    USING (get_user_role() = 'admin');
END $$;

-- Create a cron job for daily invoice generation
SELECT cron.schedule(
  'daily-invoice-generation',
  '0 1 * * *', -- Run at 1:00 AM every day
  $$SELECT generate_monthly_invoices()$$
); 