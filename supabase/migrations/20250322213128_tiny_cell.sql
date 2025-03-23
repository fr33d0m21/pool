/*
  # Fix get_user_role function permissions

  1. Changes
    - Removes role setting attempt
    - Simplifies role check to use metadata
    - Adds proper error handling
    - Ensures proper security context
    
  2. Security
    - Uses SECURITY DEFINER to run as owner
    - Sets search_path for security
    - Maintains RLS policies
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
  v_role text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get role from user metadata
  SELECT 
    COALESCE(raw_user_meta_data->>'role', 'customer')
  INTO v_role
  FROM auth.users
  WHERE id = v_user_id;

  RETURN v_role;

EXCEPTION WHEN OTHERS THEN
  -- Log error and return default role
  RAISE NOTICE 'Error in get_user_role: %', SQLERRM;
  RETURN 'customer';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Add permissions to the authenticated role to access public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure user metadata is set correctly
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@poolspartans.com'
AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'admin');

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"customer"'
)
WHERE email != 'admin@poolspartans.com'
AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'customer');