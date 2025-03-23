/*
  # Fix user role function

  1. Changes
    - Simplify role determination logic
    - Remove all database role dependencies
    - Add proper security settings
    - Fix schema search path

  2. Security
    - Uses SECURITY DEFINER to run with proper permissions
    - Sets safe search path
    - Grants execute permission to authenticated users
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_role();

-- Create new get_user_role function
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
  
  -- Get user email from auth schema
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Simple role determination based on email
  RETURN CASE 
    WHEN v_email = 'admin@poolspartans.com' THEN 'admin'
    ELSE 'customer'
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;