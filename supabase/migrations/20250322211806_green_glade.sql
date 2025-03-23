/*
  # Fix user role function and permissions

  1. Changes
    - Simplify role checking logic
    - Fix permission issues
    - Add proper error handling
    - Remove role setting attempts
  
  2. Security
    - Grant proper execute permissions
    - Use security definer for safe execution
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_role();

-- Create new get_user_role function with fixed permissions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get the current user's email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();
  
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- Simple role check based on email
  RETURN CASE 
    WHEN v_email = 'admin@poolspartans.com' THEN 'admin'
    ELSE 'customer'
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;