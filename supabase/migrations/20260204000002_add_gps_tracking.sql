-- ============================================
-- GPS Tracking Schema for DeliVeri
-- ============================================

-- 1. Drivers table (for supplier's delivery drivers)
CREATE TABLE IF NOT EXISTS public.drivers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id text NOT NULL,
    clerk_user_id text UNIQUE,
    name text NOT NULL,
    phone text,
    email text,
    vehicle_type text CHECK (vehicle_type IN ('car', 'van', 'bike', 'scooter')),
    vehicle_plate text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for quick supplier lookup
CREATE INDEX IF NOT EXISTS idx_drivers_supplier_id ON public.drivers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_drivers_clerk_user_id ON public.drivers(clerk_user_id);

-- 2. Delivery location history table
CREATE TABLE IF NOT EXISTS public.delivery_locations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id uuid NOT NULL,
    driver_id uuid REFERENCES public.drivers(id),
    latitude decimal(10, 8) NOT NULL,
    longitude decimal(11, 8) NOT NULL,
    accuracy decimal(8, 2),
    altitude decimal(10, 2),
    speed decimal(6, 2),
    heading decimal(5, 2),
    battery_level decimal(5, 2),
    recorded_at timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT fk_delivery_locations_delivery
        FOREIGN KEY (delivery_id)
        REFERENCES public.outgoing_deliveries(id)
        ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_delivery_locations_delivery_id ON public.delivery_locations(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_recorded_at ON public.delivery_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_driver_id ON public.delivery_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_delivery_recorded
    ON public.delivery_locations(delivery_id, recorded_at DESC);

-- 3. Add tracking columns to outgoing_deliveries table
ALTER TABLE public.outgoing_deliveries
ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id),
ADD COLUMN IF NOT EXISTS current_latitude decimal(10, 8),
ADD COLUMN IF NOT EXISTS current_longitude decimal(11, 8),
ADD COLUMN IF NOT EXISTS current_speed decimal(6, 2),
ADD COLUMN IF NOT EXISTS current_heading decimal(5, 2),
ADD COLUMN IF NOT EXISTS last_location_update timestamptz,
ADD COLUMN IF NOT EXISTS tracking_started_at timestamptz,
ADD COLUMN IF NOT EXISTS tracking_ended_at timestamptz,
ADD COLUMN IF NOT EXISTS estimated_arrival_time timestamptz,
ADD COLUMN IF NOT EXISTS route_distance_km decimal(8, 2),
ADD COLUMN IF NOT EXISTS route_duration_minutes integer;

-- 4. Add location columns to restaurants table (delivery destination)
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS latitude decimal(10, 8),
ADD COLUMN IF NOT EXISTS longitude decimal(11, 8),
ADD COLUMN IF NOT EXISTS delivery_instructions text;

-- 5. Add location columns to suppliers table (pickup origin)
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS latitude decimal(10, 8),
ADD COLUMN IF NOT EXISTS longitude decimal(11, 8);

-- 6. Enable realtime for location updates
ALTER TABLE public.delivery_locations REPLICA IDENTITY FULL;

-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;

-- Drivers policies
DROP POLICY IF EXISTS "Suppliers can view their drivers" ON public.drivers;
CREATE POLICY "Suppliers can view their drivers"
ON public.drivers FOR SELECT
TO authenticated
USING (
    supplier_id IN (
        SELECT business_id FROM public.user_business_mapping
        WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
);

DROP POLICY IF EXISTS "Suppliers can create drivers" ON public.drivers;
CREATE POLICY "Suppliers can create drivers"
ON public.drivers FOR INSERT
TO authenticated
WITH CHECK (
    supplier_id IN (
        SELECT business_id FROM public.user_business_mapping
        WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
);

DROP POLICY IF EXISTS "Suppliers can update their drivers" ON public.drivers;
CREATE POLICY "Suppliers can update their drivers"
ON public.drivers FOR UPDATE
TO authenticated
USING (
    supplier_id IN (
        SELECT business_id FROM public.user_business_mapping
        WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
);

DROP POLICY IF EXISTS "Suppliers can delete their drivers" ON public.drivers;
CREATE POLICY "Suppliers can delete their drivers"
ON public.drivers FOR DELETE
TO authenticated
USING (
    supplier_id IN (
        SELECT business_id FROM public.user_business_mapping
        WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
);

-- Drivers can view themselves
DROP POLICY IF EXISTS "Drivers can view themselves" ON public.drivers;
CREATE POLICY "Drivers can view themselves"
ON public.drivers FOR SELECT
TO authenticated
USING (clerk_user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Delivery locations policies
DROP POLICY IF EXISTS "Drivers can insert location updates" ON public.delivery_locations;
CREATE POLICY "Drivers can insert location updates"
ON public.delivery_locations FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.drivers d
        WHERE d.id = driver_id
        AND d.clerk_user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
);

DROP POLICY IF EXISTS "Suppliers can view their delivery locations" ON public.delivery_locations;
CREATE POLICY "Suppliers can view their delivery locations"
ON public.delivery_locations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.outgoing_deliveries od
        WHERE od.id = delivery_id
        AND od.supplier_id IN (
            SELECT business_id FROM public.user_business_mapping
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    )
);

DROP POLICY IF EXISTS "Restaurants can view incoming delivery locations" ON public.delivery_locations;
CREATE POLICY "Restaurants can view incoming delivery locations"
ON public.delivery_locations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.outgoing_deliveries od
        WHERE od.id = delivery_id
        AND od.restaurant_id IN (
            SELECT business_id FROM public.user_business_mapping
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    )
);

-- ============================================
-- Database Functions
-- ============================================

-- Function to update current location on delivery record
CREATE OR REPLACE FUNCTION update_delivery_current_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.outgoing_deliveries
    SET
        current_latitude = NEW.latitude,
        current_longitude = NEW.longitude,
        current_speed = NEW.speed,
        current_heading = NEW.heading,
        last_location_update = NEW.recorded_at
    WHERE id = NEW.delivery_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update current location
DROP TRIGGER IF EXISTS trigger_update_delivery_location ON public.delivery_locations;
CREATE TRIGGER trigger_update_delivery_location
    AFTER INSERT ON public.delivery_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_current_location();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 decimal, lon1 decimal,
    lat2 decimal, lon2 decimal
)
RETURNS decimal AS $$
DECLARE
    R decimal := 6371;
    dlat decimal;
    dlon decimal;
    a decimal;
    c decimal;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get estimated arrival time
CREATE OR REPLACE FUNCTION estimate_arrival_time(p_delivery_id uuid)
RETURNS timestamptz AS $$
DECLARE
    v_current_lat decimal;
    v_current_lon decimal;
    v_current_speed decimal;
    v_dest_lat decimal;
    v_dest_lon decimal;
    v_distance_km decimal;
    v_eta_minutes decimal;
BEGIN
    SELECT current_latitude, current_longitude, current_speed
    INTO v_current_lat, v_current_lon, v_current_speed
    FROM public.outgoing_deliveries
    WHERE id = p_delivery_id;

    SELECT r.latitude, r.longitude
    INTO v_dest_lat, v_dest_lon
    FROM public.outgoing_deliveries od
    JOIN public.restaurants r ON r.id = od.restaurant_id
    WHERE od.id = p_delivery_id;

    IF v_current_lat IS NULL OR v_dest_lat IS NULL THEN
        RETURN NULL;
    END IF;

    v_distance_km := calculate_distance_km(v_current_lat, v_current_lon, v_dest_lat, v_dest_lon);

    IF v_current_speed IS NULL OR v_current_speed < 1 THEN
        v_current_speed := 8.33;
    END IF;

    v_eta_minutes := (v_distance_km / (v_current_speed * 3.6)) * 60;

    RETURN now() + (v_eta_minutes || ' minutes')::interval;
END;
$$ LANGUAGE plpgsql STABLE;

-- Cleanup function for old location data
CREATE OR REPLACE FUNCTION cleanup_old_location_data()
RETURNS void AS $$
BEGIN
    DELETE FROM public.delivery_locations
    WHERE recorded_at < now() - interval '30 days'
    AND delivery_id IN (
        SELECT id FROM public.outgoing_deliveries
        WHERE status IN ('delivered', 'confirmed', 'cancelled')
    );
END;
$$ LANGUAGE plpgsql;
