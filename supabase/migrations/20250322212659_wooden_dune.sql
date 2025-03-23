/*
  # Fix User Creation and Add Demo Users

  1. Changes
    - Ensures users exist in auth.users
    - Creates corresponding entries in public.users
    - Sets proper role metadata
    
  2. Security
    - Maintains existing RLS policies
    - Preserves user permissions
*/

-- Create demo users with proper error handling
DO $$
DECLARE
  v_admin_id uuid;
  v_customer_id uuid;
BEGIN
  -- Create admin user if not exists
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'admin@poolspartans.com';

  IF v_admin_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@poolspartans.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Edward McLaughlin","role":"admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO v_admin_id;
  END IF;

  -- Ensure admin exists in public.users
  INSERT INTO public.users (
    id,
    full_name,
    phone,
    address,
    city,
    state,
    zip
  ) 
  VALUES (
    v_admin_id,
    'Edward McLaughlin',
    '(555) 123-4567',
    '123 Pool Service Dr',
    'Palm Coast',
    'FL',
    '32164'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip = EXCLUDED.zip,
    updated_at = now();

  -- Create customer user if not exists
  SELECT id INTO v_customer_id
  FROM auth.users
  WHERE email = 'customer@poolspartans.com';

  IF v_customer_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'customer@poolspartans.com',
      crypt('customer123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Sarah Johnson","role":"customer"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO v_customer_id;
  END IF;

  -- Ensure customer exists in public.users
  INSERT INTO public.users (
    id,
    full_name,
    phone,
    address,
    city,
    state,
    zip
  ) 
  VALUES (
    v_customer_id,
    'Sarah Johnson',
    '(555) 987-6543',
    '456 Palm Harbor Way',
    'Palm Coast',
    'FL',
    '32137'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip = EXCLUDED.zip,
    updated_at = now();

  -- Update user metadata to ensure roles are set correctly
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
  WHERE email = 'admin@poolspartans.com';

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"customer"'
  )
  WHERE email = 'customer@poolspartans.com';

END $$;