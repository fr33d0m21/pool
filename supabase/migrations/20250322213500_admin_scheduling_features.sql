/*
  # Admin Dashboard Scheduling Features
  
  This migration creates and updates tables needed for:
  - Scheduling with map views
  - Route optimization
  - Auto-scheduling
  - Custom view filters
*/

-- Create schedules table (if not exists)
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id),
  date date NOT NULL,
  time_window varchar(50),
  status varchar(20) DEFAULT 'scheduled',
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  address text,
  is_permanent boolean DEFAULT true,
  frequency varchar(50) DEFAULT 'weekly', -- weekly, biweekly, monthly, custom
  custom_frequency_weeks integer, -- for "Every X Weeks" option
  visit_day_of_week integer[], -- For multi-visit weekly scheduling (e.g., [1,4] for Monday and Thursday)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create routes table
CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), 
  technician_id uuid REFERENCES technicians(id),
  date date NOT NULL,
  status varchar(20) DEFAULT 'pending', -- pending, in_progress, completed
  is_optimized boolean DEFAULT false,
  optimization_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create route_stops table
CREATE TABLE route_stops (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES schedules(id),
  stop_order integer NOT NULL, -- The order in the route
  estimated_arrival_time timestamptz,
  actual_arrival_time timestamptz,
  status varchar(20) DEFAULT 'pending', -- pending, in_progress, completed, skipped
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id),
  schedule_id uuid REFERENCES schedules(id),
  job_type varchar(50) NOT NULL, -- regular_service, filter_clean, salt_cell_clean, etc.
  date date NOT NULL,
  status varchar(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create auto_schedules table for automated job scheduling
CREATE TABLE auto_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  job_type varchar(50) NOT NULL, -- filter_clean, salt_cell_clean, etc.
  frequency_days integer NOT NULL, -- e.g., 90 for "every 90 days"
  day_of_week_preference integer[], -- Preferred days for scheduling (0=Sunday, 1=Monday, etc.)
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or update pool_dna table
CREATE TABLE IF NOT EXISTS pool_dna (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  volume_gallons integer,
  surface_area_sqft integer,
  pool_type varchar(50),
  equipment_details jsonb,
  last_service_date date,
  last_filter_clean_date date,
  last_salt_cell_clean_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create views table for saved custom views
CREATE TABLE views (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  filters jsonb NOT NULL, -- Stores filter settings
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create route_changes table to track notifications
CREATE TABLE route_changes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  old_date date,
  new_date date,
  old_technician_id uuid REFERENCES technicians(id),
  new_technician_id uuid REFERENCES technicians(id),
  notification_sent boolean DEFAULT false,
  notification_timestamp timestamptz,
  is_permanent boolean,
  created_at timestamptz DEFAULT now()
);

-- Create email_settings table for notification templates
CREATE TABLE email_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type varchar(50) UNIQUE NOT NULL, -- route_change_temp, route_change_perm, etc.
  subject varchar(200) NOT NULL,
  template text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Admin policies for all tables
CREATE POLICY "Admin can manage all schedules" ON schedules FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all routes" ON routes FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all route_stops" ON route_stops FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all jobs" ON jobs FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all auto_schedules" ON auto_schedules FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all pool_dna" ON pool_dna FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all views" ON views FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all route_changes" ON route_changes FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all email_settings" ON email_settings FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Customer policies for their own data
CREATE POLICY "Customers can view their own schedules" ON schedules FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customers can view jobs for their property" ON jobs FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Customers can view their pool DNA" ON pool_dna FOR SELECT TO authenticated USING (customer_id = auth.uid());

-- Technician policies
CREATE POLICY "Technicians can view their assigned schedules" ON schedules FOR SELECT TO authenticated USING (technician_id = (SELECT id FROM technicians WHERE user_id = auth.uid()));
CREATE POLICY "Technicians can view their assigned routes" ON routes FOR SELECT TO authenticated USING (technician_id = (SELECT id FROM technicians WHERE user_id = auth.uid()));
CREATE POLICY "Technicians can view their route stops" ON route_stops FOR SELECT TO authenticated USING (route_id IN (SELECT id FROM routes WHERE technician_id = (SELECT id FROM technicians WHERE user_id = auth.uid())));
CREATE POLICY "Technicians can view their assigned jobs" ON jobs FOR SELECT TO authenticated USING (technician_id = (SELECT id FROM technicians WHERE user_id = auth.uid()));
CREATE POLICY "Technicians can update job status" ON jobs FOR UPDATE TO authenticated USING (technician_id = (SELECT id FROM technicians WHERE user_id = auth.uid())); 