/*
  # Initial Database Schema for Pool Spartans

  1. New Tables
    - users (extends auth.users)
      - Profile information for customers and staff
    - service_levels
      - Different service packages offered
    - water_bodies
      - Pool and spa information
    - equipment
      - Pool equipment details
    - service_schedules
      - Regular service scheduling
    - service_visits
      - Service visit records
    - water_tests
      - Water chemistry test results
    - products
      - Chemical and equipment inventory
    - quotes
      - Service quotes
    - invoices
      - Billing records
    - technicians
      - Staff information
    
  2. Security
    - Enable RLS on all tables
    - Set up access policies for admin and customer roles
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service Levels
CREATE TABLE service_levels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  frequency text NOT NULL,
  features jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Water Bodies (Pools/Spas)
CREATE TABLE water_bodies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  volume_gallons integer,
  surface_type text,
  location text,
  notes text,
  service_level_id uuid REFERENCES service_levels(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Equipment
CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  water_body_id uuid REFERENCES water_bodies(id) ON DELETE CASCADE,
  type text NOT NULL,
  brand text,
  model text,
  serial_number text,
  installation_date date,
  warranty_expiry date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Technicians
CREATE TABLE technicians (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  certification_number text,
  certification_expiry date,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service Schedules
CREATE TABLE service_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  water_body_id uuid REFERENCES water_bodies(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id),
  day_of_week integer,
  time_window text,
  frequency text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service Visits
CREATE TABLE service_visits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  water_body_id uuid REFERENCES water_bodies(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id),
  scheduled_at timestamptz,
  completed_at timestamptz,
  status text,
  notes text,
  photos text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Water Tests
CREATE TABLE water_tests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_visit_id uuid REFERENCES service_visits(id) ON DELETE CASCADE,
  chlorine numeric(4,2),
  ph numeric(4,2),
  alkalinity integer,
  calcium_hardness integer,
  cyanuric_acid integer,
  tds integer,
  temperature numeric(4,1),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  category text,
  unit text,
  price decimal(10,2),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quotes
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  water_body_id uuid REFERENCES water_bodies(id),
  service_level_id uuid REFERENCES service_levels(id),
  total_amount decimal(10,2),
  status text,
  valid_until date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quote Items
CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer,
  unit_price decimal(10,2),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id),
  service_visit_id uuid REFERENCES service_visits(id),
  total_amount decimal(10,2),
  status text,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoice Items
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer,
  unit_price decimal(10,2),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON users FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Create policies for water_bodies table
CREATE POLICY "Customers can view their own water bodies"
  ON water_bodies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all water bodies"
  ON water_bodies FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Create policies for equipment table
CREATE POLICY "Customers can view their own equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (
    water_body_id IN (
      SELECT id FROM water_bodies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all equipment"
  ON equipment FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Create policies for service_visits table
CREATE POLICY "Customers can view their own service visits"
  ON service_visits FOR SELECT
  TO authenticated
  USING (
    water_body_id IN (
      SELECT id FROM water_bodies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all service visits"
  ON service_visits FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Create policies for quotes table
CREATE POLICY "Customers can view their own quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Create policies for invoices table
CREATE POLICY "Customers can view their own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Insert default service levels
INSERT INTO service_levels (name, description, price, frequency, features) VALUES
  ('Weekly Service', 'Complete weekly pool maintenance', 35.00, 'weekly', '{"chemical_testing": true, "cleaning": true, "equipment_check": true}'),
  ('Bi-Weekly Service', 'Comprehensive bi-weekly maintenance', 45.00, 'biweekly', '{"chemical_testing": true, "cleaning": true, "equipment_check": true}'),
  ('Monthly Service', 'Basic monthly maintenance', 60.00, 'monthly', '{"chemical_testing": true, "cleaning": true}'),
  ('One-Time Service', 'Single comprehensive service visit', 75.00, 'once', '{"chemical_testing": true, "cleaning": true, "equipment_check": true}');

-- Insert some default products
INSERT INTO products (name, description, category, unit, price) VALUES
  ('Chlorine Tablets', '3-inch stabilized chlorine tablets', 'Chemicals', 'lb', 4.99),
  ('pH Plus', 'pH increaser', 'Chemicals', 'lb', 3.99),
  ('pH Minus', 'pH decreaser', 'Chemicals', 'lb', 3.99),
  ('Pool Brush', '18-inch pool brush', 'Equipment', 'piece', 24.99),
  ('Test Strips', '100-count test strips', 'Testing', 'box', 12.99);