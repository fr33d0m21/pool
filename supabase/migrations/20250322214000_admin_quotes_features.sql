/*
  # Admin Dashboard Quotes Features
  
  This migration creates and updates tables needed for:
  - Quote creation with media attachments
  - Quote line item customization with labels
  - Quote approval system
  - Quote to job conversion
  - Quote view tracking
  - Notification system
*/

-- Create quote_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'viewed', 'approved', 'denied', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create line_item_label enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE line_item_label AS ENUM ('recommended', 'optional', 'required');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create or modify quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id),
  quote_number varchar(20) NOT NULL UNIQUE,
  title varchar(100) NOT NULL,
  description text,
  subtotal decimal(12,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) DEFAULT 0,
  tax_amount decimal(12,2) DEFAULT 0,
  discount_amount decimal(12,2) DEFAULT 0,
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until date,
  notes text,
  terms_conditions text,
  last_viewed_at timestamptz,
  approval_date timestamptz,
  denial_date timestamptz,
  denial_reason text,
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or modify quote line items table
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(12,2) NOT NULL,
  total_price decimal(12,2) NOT NULL,
  label line_item_label DEFAULT 'recommended',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quote_attachments table
CREATE TABLE quote_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  file_name varchar(255) NOT NULL,
  file_type varchar(50) NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  description text,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create quote_activities table for tracking
CREATE TABLE quote_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  activity_type varchar(50) NOT NULL,
  user_id uuid REFERENCES users(id),
  ip_address varchar(45),
  user_agent text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create notification_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type varchar(50) NOT NULL,
  subject varchar(255) NOT NULL,
  template text NOT NULL,
  recipients jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  reminder_days integer[], -- For reminder types, days to send reminders after creation
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT notification_settings_type_key UNIQUE (type)
);

-- Insert default notification settings
INSERT INTO notification_settings (type, subject, template, recipients, active, reminder_days)
VALUES
  ('quote_sent', 'New Quote Available: {{quote_number}}', 
   '<p>Dear {{customer_name}},</p><p>A new quote {{quote_number}} is available for your review.</p><p>View it <a href="{{quote_url}}">here</a>.</p>',
   '[]'::jsonb, 
   true, 
   NULL),
  ('quote_reminder', 'Reminder: Quote {{quote_number}} Awaiting Your Review', 
   '<p>Dear {{customer_name}},</p><p>This is a friendly reminder that quote {{quote_number}} is awaiting your review.</p><p>View it <a href="{{quote_url}}">here</a>.</p>',
   '[]'::jsonb, 
   true, 
   ARRAY[7, 14, 21]),
  ('quote_approved', 'Quote {{quote_number}} Approved', 
   '<p>Quote {{quote_number}} has been approved by {{customer_name}}.</p>',
   '[]'::jsonb, 
   true, 
   NULL),
  ('quote_denied', 'Quote {{quote_number}} Denied', 
   '<p>Quote {{quote_number}} has been denied by {{customer_name}}.</p><p>Reason: {{denial_reason}}</p>',
   '[]'::jsonb, 
   true, 
   NULL);

-- Function to update quote totals
CREATE OR REPLACE FUNCTION update_quote_totals(quote_uuid uuid) 
RETURNS void AS $$
DECLARE
  _subtotal decimal(12,2);
  _tax_rate decimal(5,2);
  _tax_amount decimal(12,2);
  _discount_amount decimal(12,2);
  _total_amount decimal(12,2);
BEGIN
  -- Get the current quote details
  SELECT 
    tax_rate, 
    discount_amount 
  INTO 
    _tax_rate, 
    _discount_amount
  FROM quotes 
  WHERE id = quote_uuid;
  
  -- Calculate subtotal from line items
  SELECT COALESCE(SUM(total_price), 0)
  INTO _subtotal
  FROM quote_items
  WHERE quote_id = quote_uuid;
  
  -- Calculate tax amount
  _tax_amount := _subtotal * (_tax_rate / 100);
  
  -- Calculate total amount
  _total_amount := _subtotal + _tax_amount - _discount_amount;
  
  -- Update the quote
  UPDATE quotes
  SET 
    subtotal = _subtotal,
    tax_amount = _tax_amount,
    total_amount = _total_amount,
    updated_at = now()
  WHERE id = quote_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create a job from an approved quote
CREATE OR REPLACE FUNCTION create_job_from_quote(quote_uuid uuid) 
RETURNS uuid AS $$
DECLARE
  _customer_id uuid;
  _title text;
  _job_id uuid;
  _job_type text;
BEGIN
  -- Get quote details
  SELECT 
    customer_id,
    title
  INTO 
    _customer_id,
    _title
  FROM quotes 
  WHERE id = quote_uuid;
  
  _job_type := 'quote_job';
  
  -- Create the job
  INSERT INTO jobs (
    customer_id,
    job_type,
    date,
    status,
    notes
  ) VALUES (
    _customer_id,
    _job_type,
    CURRENT_DATE + INTERVAL '7 days',
    'scheduled',
    'Auto-created from approved quote: ' || _title
  ) RETURNING id INTO _job_id;
  
  -- Create job details from quote items
  -- This assumes there's a job_items table
  -- You may need to adjust this based on your specific jobs table structure
  INSERT INTO job_items (
    job_id,
    product_id,
    description,
    quantity,
    unit_price
  )
  SELECT
    _job_id,
    product_id,
    description,
    quantity,
    unit_price
  FROM quote_items
  WHERE quote_id = quote_uuid;
  
  -- Log this activity
  INSERT INTO quote_activities (
    quote_id,
    activity_type,
    details
  ) VALUES (
    quote_uuid,
    'converted_to_job',
    jsonb_build_object('job_id', _job_id)
  );
  
  RETURN _job_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to track quote status changes
CREATE OR REPLACE FUNCTION track_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status <> 'approved' OR OLD.status IS NULL) THEN
    -- Set approval date
    NEW.approval_date := now();
    
    -- Create a job automatically
    PERFORM create_job_from_quote(NEW.id);
  END IF;
  
  -- If status changed to 'denied'
  IF NEW.status = 'denied' AND (OLD.status <> 'denied' OR OLD.status IS NULL) THEN
    -- Set denial date
    NEW.denial_date := now();
  END IF;
  
  -- If status changed to 'viewed'
  IF NEW.status = 'viewed' AND (OLD.status <> 'viewed' OR OLD.status IS NULL) THEN
    -- Update last viewed timestamp
    NEW.last_viewed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quote status changes
CREATE TRIGGER quote_status_change_trigger
BEFORE UPDATE ON quotes
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION track_quote_status_change();

-- Function to log quote view activity
CREATE OR REPLACE FUNCTION log_quote_view(quote_uuid uuid, user_uuid uuid, ip varchar(45), user_agent text)
RETURNS void AS $$
BEGIN
  -- Update quote to viewed if not already approved or denied
  UPDATE quotes
  SET 
    status = CASE 
      WHEN status IN ('draft', 'sent') THEN 'viewed'::quote_status
      ELSE status
    END,
    last_viewed_at = now()
  WHERE id = quote_uuid
  AND status NOT IN ('approved', 'denied');
  
  -- Log the activity
  INSERT INTO quote_activities (
    quote_id,
    activity_type,
    user_id,
    ip_address,
    user_agent
  ) VALUES (
    quote_uuid,
    'viewed',
    user_uuid,
    ip,
    user_agent
  );
END;
$$ LANGUAGE plpgsql;

-- Function to send quote reminders
CREATE OR REPLACE FUNCTION send_quote_reminders() 
RETURNS void AS $$
DECLARE
  _quote record;
  _settings record;
  _days_since_creation integer;
  _days_since_reminder integer;
  _should_send boolean;
BEGIN
  -- Get reminder notification settings
  SELECT * INTO _settings 
  FROM notification_settings
  WHERE type = 'quote_reminder' AND active = true;
  
  -- If no settings or not active, exit
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Process each quote that's still in sent or viewed status
  FOR _quote IN 
    SELECT *
    FROM quotes
    WHERE status IN ('sent', 'viewed')
    AND valid_until > CURRENT_DATE
  LOOP
    _days_since_creation := CURRENT_DATE - DATE(_quote.created_at);
    
    -- If a reminder was already sent, calculate days since that
    IF _quote.reminder_sent_at IS NOT NULL THEN
      _days_since_reminder := CURRENT_DATE - DATE(_quote.reminder_sent_at);
    ELSE
      _days_since_reminder := _days_since_creation;
    END IF;
    
    -- Check if we should send a reminder based on the days configuration
    _should_send := false;
    
    -- Check if current day count matches any of the reminder days
    IF _settings.reminder_days IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM unnest(_settings.reminder_days) AS day
        WHERE day = _days_since_reminder
      ) INTO _should_send;
    END IF;
    
    -- If we should send a reminder
    IF _should_send THEN
      -- In a real implementation, this would send an email
      -- For now, we just update the reminder_sent_at timestamp
      UPDATE quotes
      SET reminder_sent_at = now()
      WHERE id = _quote.id;
      
      -- Log the reminder
      INSERT INTO quote_activities (
        quote_id,
        activity_type,
        details
      ) VALUES (
        _quote.id,
        'reminder_sent',
        jsonb_build_object('days_since_creation', _days_since_creation)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Admin policies
CREATE POLICY "Admin can manage all quotes" ON quotes FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all quote items" ON quote_items FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all quote attachments" ON quote_attachments FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can view all quote activities" ON quote_activities FOR SELECT TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage notification settings" ON notification_settings FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Customer policies
CREATE POLICY "Customers can view their own quotes" ON quotes FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customers can view items for their quotes" ON quote_items FOR SELECT TO authenticated USING (quote_id IN (SELECT id FROM quotes WHERE customer_id = auth.uid()));
CREATE POLICY "Customers can view attachments for their quotes" ON quote_attachments FOR SELECT TO authenticated USING (quote_id IN (SELECT id FROM quotes WHERE customer_id = auth.uid()));
CREATE POLICY "Customers can update their quotes status" ON quotes FOR UPDATE TO authenticated USING (customer_id = auth.uid()) WITH CHECK (status IN ('approved', 'denied') AND old.status IN ('sent', 'viewed')); 