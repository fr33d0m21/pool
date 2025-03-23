/*
  # Create user roles and functions

  1. New Functions
    - `get_user_role`: Returns the user's role from auth.users
    
  2. Security
    - Function is accessible to authenticated users only
*/

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;