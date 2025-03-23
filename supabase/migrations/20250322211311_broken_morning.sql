/*
  # Fix role management function

  1. Changes
    - Simplify get_user_role function to use email-based role determination
    - Remove all database role dependencies
    - Add proper security settings and permissions

  2. Security
    - Uses email for role determination
    - Proper function permissions with SECURITY DEFINER
    - Safe search_path setting
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_role();

-- Create new get_user_role function with proper permissions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
    WHEN v_email = 'admin@poolspartans.com' THEN 'admin'
    ELSE 'customer'
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;