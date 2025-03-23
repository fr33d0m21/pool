/*
  # Scheduling and Route Optimization Functions
  
  This migration adds functions for:
  - Auto-scheduling maintenance jobs
  - Route optimization
  - Finding nearby properties
  - Managing schedule changes
*/

-- Function to calculate proximity-based sorting for route optimization
CREATE OR REPLACE FUNCTION optimize_route(route_id uuid) 
RETURNS void AS $$
DECLARE
  current_stop record;
  next_stop record;
  tech_id uuid;
  stop_counter integer := 1;
  current_lat decimal(10,8);
  current_lng decimal(11,8);
BEGIN
  -- Get technician for this route
  SELECT technician_id INTO tech_id FROM routes WHERE id = route_id;
  
  -- Start optimization from technician's home/office location
  -- For simplicity, we're using the first stop as the starting point
  -- In a real implementation, we would use the technician's starting location
  SELECT s.latitude, s.longitude 
  INTO current_lat, current_lng
  FROM route_stops rs
  JOIN schedules s ON rs.schedule_id = s.id
  WHERE rs.route_id = route_id
  ORDER BY rs.stop_order
  LIMIT 1;
  
  -- Mark route as being optimized
  UPDATE routes SET is_optimized = true, optimization_timestamp = now() WHERE id = route_id;
  
  -- Placeholder for a more sophisticated algorithm
  -- This is a simple nearest-neighbor approach
  WHILE EXISTS (
    SELECT 1 FROM route_stops rs
    JOIN schedules s ON rs.schedule_id = s.id
    WHERE rs.route_id = route_id AND rs.stop_order IS NULL
  ) LOOP
    -- Find the closest unassigned stop
    SELECT rs.id, s.latitude, s.longitude, rs.schedule_id
    INTO next_stop
    FROM route_stops rs
    JOIN schedules s ON rs.schedule_id = s.id
    WHERE rs.route_id = route_id AND rs.stop_order IS NULL
    ORDER BY 
      -- Basic distance calculation formula
      SQRT(POW(s.latitude - current_lat, 2) + POW(s.longitude - current_lng, 2))
    LIMIT 1;
    
    -- Update this stop's order
    UPDATE route_stops 
    SET stop_order = stop_counter
    WHERE id = next_stop.id;
    
    -- Update current position for next iteration
    current_lat := next_stop.latitude;
    current_lng := next_stop.longitude;
    stop_counter := stop_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest scheduled properties to a given property
CREATE OR REPLACE FUNCTION find_nearest_properties(property_lat decimal(10,8), property_lng decimal(11,8), search_date date, limit_count integer DEFAULT 5)
RETURNS TABLE (
  schedule_id uuid,
  customer_id uuid,
  technician_id uuid,
  date date,
  address text,
  distance double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as schedule_id,
    s.customer_id,
    s.technician_id,
    s.date,
    s.address,
    -- Simple distance calculation (Euclidean distance)
    -- In production, this would use a proper geospatial distance function
    SQRT(POW(s.latitude - property_lat, 2) + POW(s.longitude - property_lng, 2)) as distance
  FROM 
    schedules s
  WHERE 
    s.date = search_date
    AND s.latitude IS NOT NULL 
    AND s.longitude IS NOT NULL
  ORDER BY 
    distance
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-schedule maintenance jobs based on last service dates
CREATE OR REPLACE FUNCTION auto_schedule_maintenance_jobs() 
RETURNS void AS $$
DECLARE
  pool record;
  auto_schedule record;
  next_filter_clean_date date;
  next_salt_cell_clean_date date;
  technician_id uuid;
  job_id uuid;
BEGIN
  -- Loop through all pools with auto-scheduling enabled
  FOR pool IN 
    SELECT p.*, a.frequency_days, a.day_of_week_preference, a.job_type
    FROM pool_dna p
    JOIN auto_schedules a ON p.customer_id = a.customer_id
    WHERE a.active = true
  LOOP
    -- For filter cleaning jobs
    IF pool.job_type = 'filter_clean' AND pool.last_filter_clean_date IS NOT NULL THEN
      next_filter_clean_date := pool.last_filter_clean_date + (pool.frequency_days * INTERVAL '1 day');
      
      -- Only schedule if we're within 14 days of the next service date and no job exists yet
      IF next_filter_clean_date - CURRENT_DATE BETWEEN 0 AND 14 
         AND NOT EXISTS (
           SELECT 1 FROM jobs 
           WHERE customer_id = pool.customer_id 
             AND job_type = 'filter_clean'
             AND date > CURRENT_DATE
             AND status <> 'cancelled'
         ) THEN
        -- Find an existing technician for this customer
        SELECT technician_id INTO technician_id 
        FROM schedules 
        WHERE customer_id = pool.customer_id 
        ORDER BY date DESC 
        LIMIT 1;
        
        -- Create the job
        INSERT INTO jobs (
          customer_id, 
          technician_id, 
          job_type, 
          date, 
          status, 
          notes
        ) VALUES (
          pool.customer_id,
          technician_id,
          'filter_clean',
          next_filter_clean_date,
          'scheduled',
          'Auto-scheduled filter cleaning'
        ) RETURNING id INTO job_id;
      END IF;
    END IF;
    
    -- For salt cell cleaning jobs
    IF pool.job_type = 'salt_cell_clean' AND pool.last_salt_cell_clean_date IS NOT NULL THEN
      next_salt_cell_clean_date := pool.last_salt_cell_clean_date + (pool.frequency_days * INTERVAL '1 day');
      
      -- Only schedule if we're within 14 days of the next service date and no job exists yet
      IF next_salt_cell_clean_date - CURRENT_DATE BETWEEN 0 AND 14 
         AND NOT EXISTS (
           SELECT 1 FROM jobs 
           WHERE customer_id = pool.customer_id 
             AND job_type = 'salt_cell_clean'
             AND date > CURRENT_DATE
             AND status <> 'cancelled'
         ) THEN
        -- Find an existing technician for this customer
        SELECT technician_id INTO technician_id 
        FROM schedules 
        WHERE customer_id = pool.customer_id 
        ORDER BY date DESC 
        LIMIT 1;
        
        -- Create the job
        INSERT INTO jobs (
          customer_id, 
          technician_id, 
          job_type, 
          date, 
          status, 
          notes
        ) VALUES (
          pool.customer_id,
          technician_id,
          'salt_cell_clean',
          next_salt_cell_clean_date,
          'scheduled',
          'Auto-scheduled salt cell cleaning'
        ) RETURNING id INTO job_id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to track and notify about route changes
CREATE OR REPLACE FUNCTION track_schedule_change() 
RETURNS TRIGGER AS $$
BEGIN
  -- If date or technician changed
  IF (OLD.date <> NEW.date) OR (OLD.technician_id <> NEW.technician_id) THEN
    -- Record the change
    INSERT INTO route_changes (
      customer_id,
      old_date,
      new_date,
      old_technician_id,
      new_technician_id,
      is_permanent
    ) VALUES (
      NEW.customer_id,
      OLD.date,
      NEW.date,
      OLD.technician_id,
      NEW.technician_id,
      NEW.is_permanent
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for schedule changes
CREATE TRIGGER schedule_change_trigger
AFTER UPDATE ON schedules
FOR EACH ROW
WHEN (OLD.date <> NEW.date OR OLD.technician_id <> NEW.technician_id)
EXECUTE FUNCTION track_schedule_change();

-- Create a cron job to run auto-scheduling daily
-- Note: This requires pg_cron extension to be enabled in Supabase
-- SELECT cron.schedule('0 0 * * *', $$SELECT auto_schedule_maintenance_jobs()$$);
-- Comment out if pg_cron is not available 