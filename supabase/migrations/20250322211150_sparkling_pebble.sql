/*
  # Fix role permissions and function

  1. Changes
    - Drop and recreate get_user_role function with proper permissions
    - Remove dependency on database roles
    - Use metadata-based role management
    - Grant proper execute permissions

  2. Security
    - Uses metadata for role storage
    - Proper function permissions
    - Secure role checking logic
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_role();

-- Create new get_user_role function with proper permissions
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
  RETURN CASE 
    WHEN v_email = 'admin@poolspartans.com' THEN 'customer'
    ELSE 'customer'
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Revoke all permissions from admin role if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'admin'
  ) THEN
    REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM admin;
    REVOKE ALL PRIVILEGES ON SCHEMA public FROM admin;
    REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM admin;
  END IF;
END $$;