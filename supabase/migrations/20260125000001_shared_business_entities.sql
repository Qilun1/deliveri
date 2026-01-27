-- Migration: Shared Business Entities (Final Clean Version)
-- Date: 2026-01-25

-- 1. Create mapping table to track user membership in businesses
CREATE TABLE IF NOT EXISTS public.user_business_mapping (
    user_id text PRIMARY KEY,
    business_id text NOT NULL,
    business_name text NOT NULL,
    role text NOT NULL CHECK (role IN ('restaurant', 'supplier'))
);

-- 2. Ensure extra columns exist
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS last_action_by text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS supplier_id text;
ALTER TABLE public.missing_items_reports ADD COLUMN IF NOT EXISTS last_action_by text;
ALTER TABLE public.restaurant_supplier_connections ADD COLUMN IF NOT EXISTS last_action_by text;

-- 3. Populate mapping table and identify canonical business IDs
INSERT INTO public.user_business_mapping (user_id, business_id, business_name, role)
SELECT 
    s.id as user_id, 
    first_value(s.id) OVER (PARTITION BY s.name ORDER BY 
        (CASE WHEN s.logo_url IS NOT NULL THEN 1 ELSE 0 END) DESC,
        (CASE WHEN s.contact_email IS NOT NULL THEN 1 ELSE 0 END) DESC,
        s.created_at ASC
    ) as business_id,
    s.name as business_name,
    'supplier' as role
FROM public.suppliers s
ON CONFLICT (user_id) DO UPDATE SET 
    business_id = EXCLUDED.business_id,
    business_name = EXCLUDED.business_name;

INSERT INTO public.user_business_mapping (user_id, business_id, business_name, role)
SELECT 
    r.id as user_id, 
    first_value(r.id) OVER (PARTITION BY r.name ORDER BY 
        (CASE WHEN r.street_address IS NOT NULL THEN 1 ELSE 0 END) DESC,
        r.updated_at ASC
    ) as business_id,
    r.name as business_name,
    'restaurant' as role
FROM public.restaurants r
ON CONFLICT (user_id) DO UPDATE SET 
    business_id = EXCLUDED.business_id,
    business_name = EXCLUDED.business_name;

-- 4. Update existing data to point to canonical IDs
-- Update connections
UPDATE public.restaurant_supplier_connections t
SET supplier_id = m.business_id
FROM public.user_business_mapping m
WHERE t.supplier_id = m.user_id AND m.role = 'supplier';

UPDATE public.restaurant_supplier_connections t
SET restaurant_id = m.business_id
FROM public.user_business_mapping m
WHERE t.restaurant_id = m.user_id AND m.role = 'restaurant';

-- Update reports
UPDATE public.missing_items_reports t
SET supplier_id = m.business_id
FROM public.user_business_mapping m
WHERE t.supplier_id = m.user_id AND m.role = 'supplier';

UPDATE public.missing_items_reports t
SET restaurant_id = m.business_id
FROM public.user_business_mapping m
WHERE t.restaurant_id = m.user_id AND m.role = 'restaurant';

-- Update deliveries
UPDATE public.deliveries t
SET user_id = m.business_id
FROM public.user_business_mapping m
WHERE t.user_id = m.user_id AND m.role = 'restaurant';

UPDATE public.deliveries t
SET supplier_id = m.business_id
FROM public.user_business_mapping m
WHERE t.supplier_name = m.business_name AND m.role = 'supplier';

-- 5. Delete duplicate business records
DELETE FROM public.suppliers
WHERE id NOT IN (SELECT DISTINCT business_id FROM public.user_business_mapping WHERE role = 'supplier');

DELETE FROM public.restaurants
WHERE id NOT IN (SELECT DISTINCT business_id FROM public.user_business_mapping WHERE role = 'restaurant');

-- 6. Updated RLS Policies
-- ============================================

-- DELIVERIES (Restaurant Access)
DROP POLICY IF EXISTS "Users can view shared restaurant deliveries" ON public.deliveries;
CREATE POLICY "Users can view shared restaurant deliveries" ON public.deliveries
    FOR SELECT
    USING (user_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')));

-- DELIVERIES (Supplier Access)
DROP POLICY IF EXISTS "Suppliers can view shared supplier deliveries" ON public.deliveries;
CREATE POLICY "Suppliers can view shared supplier deliveries" ON public.deliveries
    FOR SELECT
    USING (supplier_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')));

-- CONNECTIONS (Shared Access)
DROP POLICY IF EXISTS "Suppliers can view shared connections v2" ON public.restaurant_supplier_connections;
CREATE POLICY "Suppliers can view shared connections v2" ON public.restaurant_supplier_connections
    FOR SELECT
    USING (
        supplier_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
        OR
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );

-- REPORTS (Shared Access)
DROP POLICY IF EXISTS "Suppliers can view shared reports v2" ON public.missing_items_reports;
CREATE POLICY "Suppliers can view shared reports v2" ON public.missing_items_reports
    FOR SELECT
    USING (
        supplier_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
        OR
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );
