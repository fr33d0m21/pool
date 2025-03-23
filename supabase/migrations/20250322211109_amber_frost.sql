/*
  # Fix role management and permissions

  1. Changes
    - Drop existing get_user_role function
    - Create new get_user_role function with proper permissions
    - Grant execute permission to authenticated users
    - Remove role dependencies by using metadata instead of database roles

  2. Security
    - Uses metadata for role storage
    - Proper permission grants
    - Secure function execution
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
  v_meta_role text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Get user email and metadata role
  SELECT 
    email,
    COALESCE(raw_user_meta_data->>'role', 'customer')
  INTO v_email, v_meta_role
  FROM auth.users
  WHERE id = v_user_id;

  -- Return admin for specific email, otherwise use metadata role
  RETURN CASE 
    WHEN v_email = 'admin@poolspartans.com' THEN 'admin'
    ELSE COALESCE(v_meta_role, 'customer')
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Ensure admin user has correct metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@poolspartans.com';

-- Ensure other users have customer role in metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"customer"'
)
WHERE email != 'admin@poolspartans.com'
  AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'admin');