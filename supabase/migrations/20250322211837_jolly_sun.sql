/*
  # Fix user role function permissions

  1. Changes
    - Simplify role checking logic
    - Remove role setting attempts
    - Fix permission issues
    - Add proper error handling
  
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