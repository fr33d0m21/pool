/*
  # Update user role function

  1. Changes
    - Modify get_user_role function to use raw_user_meta_data
    - Add role to user metadata on creation
    - Update existing users with roles
*/

-- Update get_user_role function to use metadata
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT 
    CASE 
      WHEN raw_user_meta_data->>'role' IS NOT NULL THEN raw_user_meta_data->>'role'
      WHEN role = 'admin' THEN 'admin'
      ELSE 'customer'
    END
  INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  RETURN COALESCE(user_role, 'customer');
END;
$$;

-- Update existing users with roles in metadata
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN role = 'admin' THEN jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
    ELSE jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"customer"')
  END
WHERE raw_user_meta_data->>'role' IS NULL;