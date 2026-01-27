-- Migration: Multi-user support and action tracking
-- Added: 2026-01-25

-- 1. Add action tracking columns
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS last_action_by text;

ALTER TABLE public.missing_items_reports 
ADD COLUMN IF NOT EXISTS last_action_by text;

ALTER TABLE public.restaurant_supplier_connections 
ADD COLUMN IF NOT EXISTS last_action_by text;

-- 2. Update RLS for deliveries to ensure all users of a supplier see shared data
-- The existing policy already uses supplier_name match, which is shared.
-- "Suppliers can view deliveries to them" 
-- USING (supplier_name IN (SELECT name FROM public.suppliers WHERE id = ...))

-- 3. Shared access for connection requests (if table exists)
-- This allows all users of the same supplier to see and manage restaurant connections
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'restaurant_supplier_connections') THEN
        -- Drop old policies if they exist
        DROP POLICY IF EXISTS "Suppliers can view their connections" ON public.restaurant_supplier_connections;
        
        -- New shared policy
        CREATE POLICY "Suppliers can view shared connections" ON public.restaurant_supplier_connections
            FOR SELECT
            USING (
                supplier_id IN (
                    SELECT id FROM public.suppliers 
                    WHERE name IN (
                        SELECT name FROM public.suppliers 
                        WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')
                    )
                )
            );

        CREATE POLICY "Suppliers can update shared connections" ON public.restaurant_supplier_connections
            FOR UPDATE
            USING (
                supplier_id IN (
                    SELECT id FROM public.suppliers 
                    WHERE name IN (
                        SELECT name FROM public.suppliers 
                        WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')
                    )
                )
            );
    END IF;
END $$;

-- 4. Shared access for missing items reports
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'missing_items_reports') THEN
        DROP POLICY IF EXISTS "Suppliers can view reports" ON public.missing_items_reports;
        
        CREATE POLICY "Suppliers can view shared reports" ON public.missing_items_reports
            FOR SELECT
            USING (
                supplier_id IN (
                    SELECT id FROM public.suppliers 
                    WHERE name IN (
                        SELECT name FROM public.suppliers 
                        WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')
                    )
                )
            );

        CREATE POLICY "Suppliers can update shared reports" ON public.missing_items_reports
            FOR UPDATE
            USING (
                supplier_id IN (
                    SELECT id FROM public.suppliers 
                    WHERE name IN (
                        SELECT name FROM public.suppliers 
                        WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')
                    )
                )
            );
    END IF;
END $$;
