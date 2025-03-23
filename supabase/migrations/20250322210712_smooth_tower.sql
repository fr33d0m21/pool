/*
  # Create user roles

  1. New Roles
    - Create admin role
    - Create customer role
    
  2. Security
    - Grant necessary permissions to roles
*/

-- Create roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'admin'
  ) THEN
    CREATE ROLE admin;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'customer'
  ) THEN
    CREATE ROLE customer;
  END IF;
END $$;

-- Grant necessary permissions to roles
GRANT USAGE ON SCHEMA public TO admin, customer;
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin;
GRANT SELECT, UPDATE ON ALL TABLES IN SCHEMA public TO customer;

-- Modify get_user_role function to handle role mapping
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT raw_user_meta_data->>'role'
  INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  RETURN COALESCE(user_role, 'customer');
END;
$$;