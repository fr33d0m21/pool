/*
  # Create Demo Users

  1. Changes
    - Creates demo users in auth.users
    - Creates corresponding entries in public.users
    - Sets proper role metadata
    - Adds error handling and logging
    
  2. Security
    - Maintains existing RLS policies
    - Uses proper role assignments
*/

-- Create demo users with proper error handling and logging
DO $$
DECLARE
  v_admin_id uuid;
  v_customer_id uuid;
  v_water_body_id uuid;
  v_service_level_id uuid;
BEGIN
  -- Create admin user if not exists
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
  )
  ON CONFLICT (email) DO UPDATE
  SET raw_user_meta_data = '{"name":"Edward McLaughlin","role":"admin"}'::jsonb
  RETURNING id INTO v_admin_id;

  -- Create admin profile in public.users
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
  )
  ON CONFLICT (email) DO UPDATE
  SET raw_user_meta_data = '{"name":"Sarah Johnson","role":"customer"}'::jsonb
  RETURNING id INTO v_customer_id;

  -- Create customer profile in public.users
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

  -- Get weekly service level ID
  SELECT id INTO v_service_level_id
  FROM service_levels
  WHERE name = 'Weekly Service'
  LIMIT 1;

  -- Create a water body for the customer if not exists
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
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_water_body_id;

  -- If water body was created, add equipment
  IF v_water_body_id IS NOT NULL THEN
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
    )
    ON CONFLICT DO NOTHING;

    -- Create service schedule if not exists
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
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Log success
  RAISE NOTICE 'Successfully created demo users with IDs: admin=%, customer=%', v_admin_id, v_customer_id;

EXCEPTION WHEN OTHERS THEN
  -- Log error details
  RAISE NOTICE 'Error creating demo users: %', SQLERRM;
  RAISE;
END $$;