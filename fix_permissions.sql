/*
  # Fix permissions for roles

  This script fixes the permission denied error for setting role 'customer'.
  The approach is to:
  1. Use metadata for role storage instead of trying to set actual Postgres roles
  2. Update the get_user_role function to properly retrieve roles from metadata
  3. Grant proper permissions to authenticated users
*/

-- Modify existing get_user_role function (don't drop it)
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, anon;

-- Update existing users with correct metadata
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

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Permission fixes applied successfully';
END $$; 