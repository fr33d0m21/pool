/*
  # Fix admin role handling

  1. Changes
    - Update get_user_role function to properly check admin role
    - Update admin user metadata to ensure admin role is set correctly
    - Add proper role check in function

  2. Security
    - Maintains existing security model
    - Uses metadata for role storage
*/

-- Update get_user_role function to properly check admin status
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  -- Get the current user's email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Check if user is admin
  IF v_email = 'admin@poolspartans.com' THEN
    RETURN 'admin';
  END IF;
  
  -- For all other users, return customer
  RETURN 'customer';
END;
$$;

-- Ensure admin user has correct metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@poolspartans.com';

-- Ensure customer user has correct metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"customer"'
)
WHERE email = 'customer@poolspartans.com';