/*
  # Admin Dashboard Products & Services Features
  
  This migration creates and updates tables needed for:
  - Product management
  - Service management
  - Bundle offerings
  - Categories and subcategories
  - Media attachments
*/

-- Create media_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('image', 'pdf', 'document', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create pricing_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE pricing_type AS ENUM ('flat_rate', 'itemized');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Categories table for organizing products and services
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text,
  parent_id uuid REFERENCES categories(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or update products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text,
  sku varchar(50) UNIQUE,
  price decimal(10,2) NOT NULL,
  cost decimal(10,2),
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  category_id uuid REFERENCES categories(id),
  taxable boolean DEFAULT true,
  active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or update services table (if it doesn't already exist)
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  estimated_duration integer, -- in minutes
  recurring boolean DEFAULT false,
  category_id uuid REFERENCES categories(id),
  taxable boolean DEFAULT true,
  active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bundles table for package offerings
CREATE TABLE IF NOT EXISTS bundles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text,
  pricing_type pricing_type NOT NULL DEFAULT 'itemized',
  flat_price decimal(10,2),
  discount_percentage decimal(5,2) DEFAULT 0,
  category_id uuid REFERENCES categories(id),
  taxable boolean DEFAULT true,
  active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_flat_price_if_flat_rate CHECK (
    (pricing_type = 'flat_rate' AND flat_price IS NOT NULL) OR
    (pricing_type = 'itemized')
  )
);

-- Create bundle_products table for products in bundles
CREATE TABLE IF NOT EXISTS bundle_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bundle_id, product_id)
);

-- Create bundle_services table for services in bundles
CREATE TABLE IF NOT EXISTS bundle_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bundle_id, service_id)
);

-- Create attachments table for media files
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name varchar(255) NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  media_type media_type NOT NULL,
  title varchar(100),
  description text,
  content_type varchar(100),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES bundles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT attachment_must_have_one_parent CHECK (
    (product_id IS NOT NULL AND service_id IS NULL AND bundle_id IS NULL AND category_id IS NULL) OR
    (product_id IS NULL AND service_id IS NOT NULL AND bundle_id IS NULL AND category_id IS NULL) OR
    (product_id IS NULL AND service_id IS NULL AND bundle_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND service_id IS NULL AND bundle_id IS NULL AND category_id IS NOT NULL)
  )
);

-- Function to calculate bundle total price
CREATE OR REPLACE FUNCTION calculate_bundle_price(bundle_uuid uuid) 
RETURNS decimal(10,2) AS $$
DECLARE
  _total_price decimal(10,2) := 0;
  _bundle_record bundles%ROWTYPE;
BEGIN
  -- Get bundle details
  SELECT * INTO _bundle_record
  FROM bundles
  WHERE id = bundle_uuid;
  
  -- If flat rate pricing, return the flat price
  IF _bundle_record.pricing_type = 'flat_rate' THEN
    RETURN _bundle_record.flat_price;
  END IF;
  
  -- Calculate product total
  SELECT COALESCE(SUM(p.price * bp.quantity), 0) INTO _total_price
  FROM bundle_products bp
  JOIN products p ON bp.product_id = p.id
  WHERE bp.bundle_id = bundle_uuid;
  
  -- Add service total
  SELECT _total_price + COALESCE(SUM(s.price * bs.quantity), 0) INTO _total_price
  FROM bundle_services bs
  JOIN services s ON bs.service_id = s.id
  WHERE bs.bundle_id = bundle_uuid;
  
  -- Apply discount if any
  IF _bundle_record.discount_percentage > 0 THEN
    _total_price := _total_price * (1 - (_bundle_record.discount_percentage / 100));
  END IF;
  
  RETURN _total_price;
END;
$$ LANGUAGE plpgsql;

-- Function to update bundle discount when pricing type is itemized
CREATE OR REPLACE FUNCTION update_bundle_discount()
RETURNS TRIGGER AS $$
BEGIN
  -- If switching from flat_rate to itemized, calculate and set discount
  IF NEW.pricing_type = 'itemized' AND OLD.pricing_type = 'flat_rate' THEN
    DECLARE
      _undiscounted_total decimal(10,2);
      _discount_percentage decimal(5,2);
    BEGIN
      -- Calculate undiscounted total
      SELECT COALESCE(SUM(p.price * bp.quantity), 0) INTO _undiscounted_total
      FROM bundle_products bp
      JOIN products p ON bp.product_id = p.id
      WHERE bp.bundle_id = NEW.id;
      
      SELECT _undiscounted_total + COALESCE(SUM(s.price * bs.quantity), 0) INTO _undiscounted_total
      FROM bundle_services bs
      JOIN services s ON bs.service_id = s.id
      WHERE bs.bundle_id = NEW.id;
      
      -- If we have a flat price and total, calculate discount percentage
      IF _undiscounted_total > 0 AND OLD.flat_price IS NOT NULL THEN
        _discount_percentage := ((_undiscounted_total - OLD.flat_price) / _undiscounted_total) * 100;
        NEW.discount_percentage := GREATEST(0, LEAST(100, _discount_percentage));
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating bundle discount when pricing type changes
CREATE TRIGGER update_bundle_discount_trigger
BEFORE UPDATE ON bundles
FOR EACH ROW
WHEN (OLD.pricing_type <> NEW.pricing_type)
EXECUTE FUNCTION update_bundle_discount();

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Admin policies
CREATE POLICY "Admin can manage all categories" ON categories FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all products" ON products FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all services" ON services FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all bundles" ON bundles FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all bundle_products" ON bundle_products FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all bundle_services" ON bundle_services FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Admin can manage all attachments" ON attachments FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- Customer policies
CREATE POLICY "Customers can view active products" ON products FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Customers can view active services" ON services FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Customers can view active bundles" ON bundles FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Customers can view attachments for products" ON attachments FOR SELECT TO authenticated 
  USING (
    (product_id IN (SELECT id FROM products WHERE active = true)) OR
    (service_id IN (SELECT id FROM services WHERE active = true)) OR
    (bundle_id IN (SELECT id FROM bundles WHERE active = true)) OR
    (category_id IN (SELECT id FROM categories))
  );

-- Insert sample categories
INSERT INTO categories (name, description) 
VALUES 
  ('Chemicals', 'Pool and spa chemicals'),
  ('Equipment', 'Pool and spa equipment'),
  ('Maintenance', 'Regular maintenance services'),
  ('Repairs', 'Repair services'),
  ('Installations', 'Installation services'),
  ('Packages', 'Service and product packages')
ON CONFLICT DO NOTHING;

-- Create sample chemical subcategories
WITH chemicals AS (SELECT id FROM categories WHERE name = 'Chemicals')
INSERT INTO categories (name, description, parent_id)
VALUES 
  ('Chlorine', 'Chlorine-based products', (SELECT id FROM chemicals)),
  ('pH Adjusters', 'Products for pH balance', (SELECT id FROM chemicals)),
  ('Algaecides', 'Products to prevent and treat algae', (SELECT id FROM chemicals)),
  ('Clarifiers', 'Water clarifying agents', (SELECT id FROM chemicals))
ON CONFLICT DO NOTHING;

-- Create sample equipment subcategories
WITH equipment AS (SELECT id FROM categories WHERE name = 'Equipment')
INSERT INTO categories (name, description, parent_id)
VALUES 
  ('Pumps', 'Pool pumps and parts', (SELECT id FROM equipment)),
  ('Filters', 'Filtration systems and media', (SELECT id FROM equipment)),
  ('Cleaners', 'Automatic and manual cleaners', (SELECT id FROM equipment)),
  ('Heaters', 'Pool and spa heaters', (SELECT id FROM equipment))
ON CONFLICT DO NOTHING;

-- Create sample maintenance subcategories
WITH maintenance AS (SELECT id FROM categories WHERE name = 'Maintenance')
INSERT INTO categories (name, description, parent_id)
VALUES 
  ('Weekly Service', 'Weekly maintenance plans', (SELECT id FROM maintenance)),
  ('Monthly Service', 'Monthly maintenance plans', (SELECT id FROM maintenance)),
  ('Seasonal Service', 'Seasonal maintenance tasks', (SELECT id FROM maintenance))
ON CONFLICT DO NOTHING; 