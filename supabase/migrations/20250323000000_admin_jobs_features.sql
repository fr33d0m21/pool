/*
  # Admin Dashboard Jobs & Chemical Management Features
  
  This migration creates and updates tables needed for:
  - Job templates and management
  - Workflow enforcement
  - Chemical logging and dosing calculations
*/

-- Create job_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE job_type AS ENUM ('route_stop', 'one_time', 'maintenance', 'repair', 'chemical_balance', 'equipment_install');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create or modify job_templates table
CREATE TABLE IF NOT EXISTS job_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text,
  job_type job_type NOT NULL DEFAULT 'one_time',
  estimated_duration integer NOT NULL DEFAULT 60, -- in minutes
  default_price decimal(10,2),
  is_billable boolean DEFAULT true,
  required_services uuid[] DEFAULT '{}', -- Array of service IDs
  suggested_services uuid[] DEFAULT '{}', -- Array of service IDs
  chemical_check boolean DEFAULT false,
  equipment_check boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or update jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number varchar(20) NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  water_body_id uuid REFERENCES water_bodies(id),
  technician_id uuid REFERENCES technicians(id),
  job_template_id uuid REFERENCES job_templates(id),
  schedule_id uuid REFERENCES schedules(id),
  job_type job_type NOT NULL DEFAULT 'one_time',
  title varchar(100) NOT NULL,
  description text,
  status varchar(20) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  date date NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  estimated_duration integer, -- in minutes
  actual_duration integer, -- in minutes
  is_billable boolean DEFAULT true,
  price decimal(10,2),
  notes text,
  checklist_completed boolean DEFAULT false,
  invoice_id uuid REFERENCES invoices(id),
  invoice_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_services table for services assigned to jobs
CREATE TABLE job_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  is_billable boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create workflows table for guided job workflows
CREATE TABLE workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_template_id uuid REFERENCES job_templates(id),
  name varchar(100) NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]',
  equipment_condition jsonb, -- Conditions based on equipment
  step_dependencies jsonb, -- Define which steps depend on others
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_workflows table to track workflow progress for each job
CREATE TABLE job_workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES workflows(id),
  current_step integer DEFAULT 0,
  completed_steps integer[] DEFAULT '{}',
  skipped_steps integer[] DEFAULT '{}',
  notes jsonb DEFAULT '{}',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or update chemical_logs table
CREATE TABLE IF NOT EXISTS chemical_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  water_body_id uuid NOT NULL REFERENCES water_bodies(id),
  technician_id uuid REFERENCES technicians(id),
  reading_date timestamptz NOT NULL DEFAULT now(),
  ph decimal(3,1),
  free_chlorine decimal(5,2),
  total_chlorine decimal(5,2),
  alkalinity integer,
  calcium_hardness integer,
  cyanuric_acid integer,
  total_dissolved_solids integer,
  temperature decimal(4,1),
  salt_level integer,
  phosphates decimal(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create chemical_targets table for target ranges of water parameters
CREATE TABLE chemical_targets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  water_body_id uuid NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
  parameter varchar(50) NOT NULL, -- ph, free_chlorine, etc.
  min_value decimal(10,2) NOT NULL,
  max_value decimal(10,2) NOT NULL,
  ideal_value decimal(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(water_body_id, parameter)
);

-- Create chemical_dosing table for dosing calculations
CREATE TABLE chemical_dosing (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  chemical_log_id uuid REFERENCES chemical_logs(id) ON DELETE SET NULL,
  water_body_id uuid NOT NULL REFERENCES water_bodies(id),
  technician_id uuid REFERENCES technicians(id),
  chemical_type varchar(50) NOT NULL, -- chlorine, acid, alkalinity, etc.
  dosage_amount decimal(10,2) NOT NULL,
  dosage_unit varchar(10) NOT NULL, -- oz, lb, gal, etc.
  target_parameter varchar(50) NOT NULL, -- ph, free_chlorine, etc.
  initial_value decimal(10,2),
  target_value decimal(10,2),
  achieved_value decimal(10,2),
  is_completed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create default job templates
INSERT INTO job_templates (name, description, job_type, estimated_duration, default_price, is_billable, chemical_check)
VALUES
  ('Regular Service', 'Standard weekly pool service', 'route_stop', 30, 0, true, true),
  ('Filter Clean', 'Deep cleaning of pool filter', 'maintenance', 90, 125, true, false),
  ('Green Pool Treatment', 'Treatment for algae and green water', 'one_time', 120, 250, true, true),
  ('Equipment Check', 'Inspection of pool equipment', 'maintenance', 45, 75, true, false),
  ('Chemical Balance', 'Adjust water chemistry to optimal levels', 'one_time', 60, 100, true, true);

-- Create default workflows
INSERT INTO workflows (name, description, steps)
VALUES
  ('Regular Service Workflow', 'Standard workflow for regular service visits', 
   '[
     {"step": 1, "name": "Test Water Chemistry", "description": "Test pH, chlorine, and alkalinity", "required": true},
     {"step": 2, "name": "Skim Surface", "description": "Remove debris from water surface", "required": true},
     {"step": 3, "name": "Brush Walls", "description": "Brush pool walls and steps", "required": true},
     {"step": 4, "name": "Vacuum Pool", "description": "Vacuum pool floor", "required": true},
     {"step": 5, "name": "Clean Skimmer Basket", "description": "Empty and rinse skimmer basket", "required": true},
     {"step": 6, "name": "Clean Pump Basket", "description": "Empty and rinse pump basket", "required": true},
     {"step": 7, "name": "Add Chemicals", "description": "Add required chemicals based on test results", "required": true},
     {"step": 8, "name": "Check Equipment", "description": "Verify equipment is running properly", "required": true},
     {"step": 9, "name": "Final Inspection", "description": "Ensure pool is clean and chemicals are balanced", "required": true}
   ]'
  ),
  ('Filter Clean Workflow', 'Workflow for filter cleaning', 
   '[
     {"step": 1, "name": "Turn Off Equipment", "description": "Turn off pump and filter system", "required": true},
     {"step": 2, "name": "Release Pressure", "description": "Open air relief valve to release pressure", "required": true},
     {"step": 3, "name": "Open Filter", "description": "Remove filter lid or multiport valve", "required": true},
     {"step": 4, "name": "Remove Filter Elements", "description": "Take out cartridges or grids", "required": true},
     {"step": 5, "name": "Clean Filter Elements", "description": "Spray with hose or soak in cleaning solution", "required": true},
     {"step": 6, "name": "Check for Damage", "description": "Inspect for tears or cracks", "required": true},
     {"step": 7, "name": "Reassemble Filter", "description": "Put filter elements back in place", "required": true},
     {"step": 8, "name": "Secure Lid", "description": "Close and secure filter lid or valve", "required": true},
     {"step": 9, "name": "Prime System", "description": "Fill system with water", "required": true},
     {"step": 10, "name": "Restart Equipment", "description": "Turn on pump and check for leaks", "required": true}
   ]'
  );

-- Create default chemical targets
INSERT INTO chemical_targets (water_body_id, parameter, min_value, max_value, ideal_value)
SELECT 
  wb.id,
  'ph',
  7.2,
  7.8,
  7.4
FROM water_bodies wb
WHERE NOT EXISTS (
  SELECT 1 FROM chemical_targets ct 
  WHERE ct.water_body_id = wb.id AND ct.parameter = 'ph'
);

INSERT INTO chemical_targets (water_body_id, parameter, min_value, max_value, ideal_value)
SELECT 
  wb.id,
  'free_chlorine',
  1.0,
  3.0,
  2.0
FROM water_bodies wb
WHERE NOT EXISTS (
  SELECT 1 FROM chemical_targets ct 
  WHERE ct.water_body_id = wb.id AND ct.parameter = 'free_chlorine'
);

INSERT INTO chemical_targets (water_body_id, parameter, min_value, max_value, ideal_value)
SELECT 
  wb.id,
  'alkalinity',
  80.0,
  120.0,
  100.0
FROM water_bodies wb
WHERE NOT EXISTS (
  SELECT 1 FROM chemical_targets ct 
  WHERE ct.water_body_id = wb.id AND ct.parameter = 'alkalinity'
);

-- Create function to calculate chemical dosages
CREATE OR REPLACE FUNCTION calculate_chemical_dosage(
  water_body_id uuid,
  parameter varchar(50),
  current_value decimal(10,2)
) 
RETURNS TABLE (
  chemical_type varchar(50),
  dosage_amount decimal(10,2),
  dosage_unit varchar(10),
  target_value decimal(10,2)
) AS $$
DECLARE
  _target record;
  _volume integer;
  _dosage decimal(10,2);
  _chemical varchar(50);
  _unit varchar(10);
BEGIN
  -- Get target range for parameter
  SELECT * INTO _target
  FROM chemical_targets
  WHERE water_body_id = calculate_chemical_dosage.water_body_id
  AND parameter = calculate_chemical_dosage.parameter;
  
  -- Get water body volume
  SELECT volume_gallons INTO _volume
  FROM water_bodies
  WHERE id = calculate_chemical_dosage.water_body_id;
  
  -- If no target or volume found, return empty result
  IF _target IS NULL OR _volume IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate based on parameter
  IF parameter = 'ph' THEN
    IF current_value > _target.max_value THEN
      -- Lower pH using muriatic acid
      _chemical := 'muriatic_acid';
      _unit := 'oz';
      -- Simplified calculation - in reality, would be more complex
      _dosage := (_volume / 10000.0) * (current_value - _target.ideal_value) * 8.0;
      
      RETURN QUERY
      SELECT _chemical, _dosage, _unit, _target.ideal_value;
    ELSIF current_value < _target.min_value THEN
      -- Raise pH using soda ash
      _chemical := 'soda_ash';
      _unit := 'oz';
      -- Simplified calculation
      _dosage := (_volume / 10000.0) * (_target.ideal_value - current_value) * 6.0;
      
      RETURN QUERY
      SELECT _chemical, _dosage, _unit, _target.ideal_value;
    END IF;
  
  ELSIF parameter = 'free_chlorine' THEN
    IF current_value < _target.ideal_value THEN
      -- Add chlorine
      _chemical := 'liquid_chlorine';
      _unit := 'oz';
      -- Simplified calculation
      _dosage := (_volume / 10000.0) * (_target.ideal_value - current_value) * 10.0;
      
      RETURN QUERY
      SELECT _chemical, _dosage, _unit, _target.ideal_value;
    END IF;
  
  ELSIF parameter = 'alkalinity' THEN
    IF current_value < _target.min_value THEN
      -- Raise alkalinity with baking soda
      _chemical := 'baking_soda';
      _unit := 'lb';
      -- Simplified calculation
      _dosage := (_volume / 10000.0) * (_target.ideal_value - current_value) * 0.06;
      
      RETURN QUERY
      SELECT _chemical, _dosage, _unit, _target.ideal_value;
    ELSIF current_value > _target.max_value THEN
      -- Lower alkalinity with acid (rare, usually done by lowering pH)
      _chemical := 'muriatic_acid';
      _unit := 'oz';
      -- Simplified calculation
      _dosage := (_volume / 10000.0) * (current_value - _target.ideal_value) * 0.8;
      
      RETURN QUERY
      SELECT _chemical, _dosage, _unit, _target.ideal_value;
    END IF;
  END IF;
  
  -- Return empty if no action needed
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create invoices when jobs are completed
CREATE OR REPLACE FUNCTION create_invoice_from_job(job_uuid uuid) 
RETURNS uuid AS $$
DECLARE
  _customer_id uuid;
  _title text;
  _total_amount decimal(10,2);
  _invoice_id uuid;
BEGIN
  -- Get job details
  SELECT 
    customer_id,
    title
  INTO 
    _customer_id,
    _title
  FROM jobs 
  WHERE id = job_uuid;
  
  -- Calculate total amount from billable services
  SELECT COALESCE(SUM(total_price), 0) INTO _total_amount
  FROM job_services
  WHERE job_id = job_uuid AND is_billable = true;
  
  -- If no billable services, exit
  IF _total_amount <= 0 THEN
    RETURN NULL;
  END IF;
  
  -- Create the invoice
  INSERT INTO invoices (
    customer_id,
    total_amount,
    status,
    due_date,
    notes
  ) VALUES (
    _customer_id,
    _total_amount,
    'unpaid',
    CURRENT_DATE + INTERVAL '30 days',
    'Auto-created from job: ' || _title
  ) RETURNING id INTO _invoice_id;
  
  -- Create invoice items from job services
  INSERT INTO invoice_items (
    invoice_id,
    description,
    quantity,
    unit_price,
    total_price
  )
  SELECT
    _invoice_id,
    s.name || ' - ' || js.notes,
    js.quantity,
    js.unit_price,
    js.total_price
  FROM job_services js
  JOIN services s ON js.service_id = s.id
  WHERE js.job_id = job_uuid AND js.is_billable = true;
  
  -- Update job with invoice ID
  UPDATE jobs
  SET invoice_id = _invoice_id,
      invoice_generated = true
  WHERE id = job_uuid;
  
  RETURN _invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for job completion
CREATE OR REPLACE FUNCTION job_completion_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- If job status changed to completed
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    -- Check if job is billable and invoice not yet generated
    IF NEW.is_billable = true AND NEW.invoice_generated = false THEN
      -- Create invoice automatically
      PERFORM create_invoice_from_job(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for job completion
CREATE TRIGGER job_completion_trigger
AFTER UPDATE ON jobs
FOR EACH ROW
WHEN (OLD.status <> 'completed' AND NEW.status = 'completed')
EXECUTE FUNCTION job_completion_trigger();

-- Function to update job duration based on services
CREATE OR REPLACE FUNCTION update_job_duration_from_services(job_uuid uuid) 
RETURNS void AS $$
DECLARE
  _base_duration integer;
  _services_duration integer;
  _total_duration integer;
BEGIN
  -- Get base duration from job template if available
  SELECT COALESCE(jt.estimated_duration, 30) INTO _base_duration
  FROM jobs j
  LEFT JOIN job_templates jt ON j.job_template_id = jt.id
  WHERE j.id = job_uuid;
  
  -- If no template or job not found, use 30 minutes default
  IF _base_duration IS NULL THEN
    _base_duration := 30;
  END IF;
  
  -- Calculate additional duration from services
  -- This is a simplified example - in real life, you might have durations stored with each service
  SELECT COALESCE(COUNT(*) * 15, 0) INTO _services_duration
  FROM job_services
  WHERE job_id = job_uuid;
  
  _total_duration := _base_duration + _services_duration;
  
  -- Update the job duration
  UPDATE jobs
  SET estimated_duration = _total_duration
  WHERE id = job_uuid;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_dosing ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Admin policies
CREATE POLICY "Admin can manage all job templates" ON job_templates FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all jobs" ON jobs FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all job services" ON job_services FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all workflows" ON workflows FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all job workflows" ON job_workflows FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all chemical logs" ON chemical_logs FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all chemical targets" ON chemical_targets FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all chemical dosing" ON chemical_dosing FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Customer policies
CREATE POLICY "Customers can view their own jobs" ON jobs FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customers can view services for their jobs" ON job_services FOR SELECT TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE customer_id = auth.uid()));
CREATE POLICY "Customers can view chemical logs for their pools" ON chemical_logs FOR SELECT TO authenticated USING (water_body_id IN (SELECT id FROM water_bodies WHERE user_id = auth.uid()));

-- Technician policies
CREATE POLICY "Technicians can view and update their assigned jobs" 
  ON jobs FOR SELECT TO authenticated 
  USING (technician_id IN (SELECT id FROM technicians WHERE user_id = auth.uid()));

CREATE POLICY "Technicians can update their assigned jobs" 
  ON jobs FOR UPDATE TO authenticated 
  USING (technician_id IN (SELECT id FROM technicians WHERE user_id = auth.uid()));

CREATE POLICY "Technicians can view and update job workflows" 
  ON job_workflows FOR ALL TO authenticated 
  USING (job_id IN (SELECT id FROM jobs WHERE technician_id IN (SELECT id FROM technicians WHERE user_id = auth.uid())));

CREATE POLICY "Technicians can create and view chemical logs" 
  ON chemical_logs FOR ALL TO authenticated 
  USING (technician_id IN (SELECT id FROM technicians WHERE user_id = auth.uid()));

CREATE POLICY "Technicians can create and view chemical dosing" 
  ON chemical_dosing FOR ALL TO authenticated 
  USING (technician_id IN (SELECT id FROM technicians WHERE user_id = auth.uid())); 