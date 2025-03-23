/*
  # Create Demo Users and Associated Data

  1. Changes
    - Creates demo users in auth.users
    - Creates corresponding profiles in public.users
    - Sets up water body and equipment for customer
    - Adds service schedule
    
  2. Security
    - Uses proper error handling
    - Maintains data consistency
    - Preserves existing user data
*/

-- Create demo users with proper error handling
DO $$
DECLARE
  v_admin_id uuid;
  v_customer_id uuid;
  v_water_body_id uuid;
  v_service_level_id uuid;
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

    -- Create admin profile
    INSERT INTO public.users (
      id,
      full_name,
      phone,
      address,
      city,
      state,
      zip
    ) VALUES (
      v_admin_id,
      'Edward McLaughlin',
      '(555) 123-4567',
      '123 Pool Service Dr',
      'Palm Coast',
      'FL',
      '32164'
    );
  END IF;

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

    -- Create customer profile
    INSERT INTO public.users (
      id,
      full_name,
      phone,
      address,
      city,
      state,
      zip
    ) VALUES (
      v_customer_id,
      'Sarah Johnson',
      '(555) 987-6543',
      '456 Palm Harbor Way',
      'Palm Coast',
      'FL',
      '32137'
    );

    -- Get weekly service level ID
    SELECT id INTO v_service_level_id
    FROM service_levels
    WHERE name = 'Weekly Service'
    LIMIT 1;

    -- Create a water body for the customer
    INSERT INTO water_bodies (
      user_id,
      type,
      volume_gallons,
      surface_type,
      location,
      service_level_id,
      notes
    ) VALUES (
      v_customer_id,
      'Pool',
      20000,
      'Plaster',
      'Backyard',
      v_service_level_id,
      'Main swimming pool with attached spa'
    ) RETURNING id INTO v_water_body_id;

    -- Add equipment for the water body
    INSERT INTO equipment (
      water_body_id,
      type,
      brand,
      model,
      serial_number,
      installation_date,
      warranty_expiry,
      notes
    ) VALUES
    (
      v_water_body_id,
      'Pump',
      'Pentair',
      'IntelliFlo VSF',
      'IF123456',
      '2023-01-15',
      '2028-01-15',
      'Variable speed pump with flow control'
    ),
    (
      v_water_body_id,
      'Filter',
      'Hayward',
      'ProGrid DE60',
      'PG987654',
      '2023-01-15',
      '2028-01-15',
      'DE filter with 60 sq ft filtration area'
    ),
    (
      v_water_body_id,
      'Heater',
      'Raypak',
      'Digital 406K BTU',
      'RP456789',
      '2023-01-15',
      '2025-01-15',
      'Natural gas heater'
    );

    -- Create service schedule
    INSERT INTO service_schedules (
      water_body_id,
      day_of_week,
      time_window,
      frequency,
      notes,
      active
    ) VALUES (
      v_water_body_id,
      2, -- Tuesday
      'Morning',
      'weekly',
      'Preferred service day is Tuesday morning',
      true
    );
  END IF;

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

EXCEPTION WHEN OTHERS THEN
  -- Log error details
  RAISE NOTICE 'Error creating demo users: %', SQLERRM;
  RAISE;
END $$;