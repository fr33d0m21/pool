/*
  # Fix get_user_role function with proper cascade handling

  1. Changes
    - Drops existing policies that depend on the function
    - Recreates the get_user_role function
    - Recreates the policies
    
  2. Security
    - Maintains proper RLS policies
    - Uses SECURITY DEFINER to run as owner
    - Sets search_path for security
*/

-- Drop existing policies that depend on get_user_role
DROP POLICY IF EXISTS "Admin can view all profiles" ON users;
DROP POLICY IF EXISTS "Admin can manage all water bodies" ON water_bodies;
DROP POLICY IF EXISTS "Admin can manage all equipment" ON equipment;
DROP POLICY IF EXISTS "Admin can manage all service visits" ON service_visits;
DROP POLICY IF EXISTS "Admin can manage all quotes" ON quotes;
DROP POLICY IF EXISTS "Admin can manage all invoices" ON invoices;

-- Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS get_user_role();

-- Create new get_user_role function with fixed permissions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get user email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Return role based on email
  IF v_email = 'admin@poolspartans.com' THEN
    RETURN 'admin';
  END IF;

  RETURN 'customer';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Recreate the policies
CREATE POLICY "Admin can view all profiles"
  ON users FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage all water bodies"
  ON water_bodies FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage all equipment"
  ON equipment FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage all service visits"
  ON service_visits FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage all quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage all invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');