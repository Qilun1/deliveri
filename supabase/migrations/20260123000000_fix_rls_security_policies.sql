-- SECURITY FIX: Replace overly permissive RLS policies with proper user-scoped policies
-- This migration fixes critical security vulnerabilities where anyone could access all data
-- Applied: 2026-01-23

-- ============================================
-- FIX DELIVERIES TABLE RLS
-- ============================================

-- Drop the insecure "Allow all" policy
DROP POLICY IF EXISTS "Allow all for deliveries" ON public.deliveries;

-- Users can only SELECT their own deliveries (as restaurant owner)
CREATE POLICY "Users can view own deliveries" ON public.deliveries
    FOR SELECT
    USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can INSERT deliveries for themselves
CREATE POLICY "Users can insert own deliveries" ON public.deliveries
    FOR INSERT
    WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can UPDATE their own deliveries
CREATE POLICY "Users can update own deliveries" ON public.deliveries
    FOR UPDATE
    USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can DELETE their own deliveries
CREATE POLICY "Users can delete own deliveries" ON public.deliveries
    FOR DELETE
    USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Suppliers can view deliveries sent to them (via supplier_name match)
-- This allows suppliers to see deliveries addressed to their company
CREATE POLICY "Suppliers can view deliveries to them" ON public.deliveries
    FOR SELECT
    USING (
        supplier_name IN (
            SELECT name FROM public.suppliers
            WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

-- ============================================
-- FIX DELIVERY_ITEMS TABLE RLS
-- ============================================

-- Drop the insecure "Allow all" policy
DROP POLICY IF EXISTS "Allow all for delivery_items" ON public.delivery_items;

-- Users can SELECT items for deliveries they own
CREATE POLICY "Users can view own delivery items" ON public.delivery_items
    FOR SELECT
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

-- Users can INSERT items for their deliveries
CREATE POLICY "Users can insert own delivery items" ON public.delivery_items
    FOR INSERT
    WITH CHECK (
        delivery_id IN (
            SELECT id FROM public.deliveries
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

-- Users can UPDATE items for their deliveries
CREATE POLICY "Users can update own delivery items" ON public.delivery_items
    FOR UPDATE
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

-- Users can DELETE items for their deliveries
CREATE POLICY "Users can delete own delivery items" ON public.delivery_items
    FOR DELETE
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

-- Suppliers can view items for deliveries sent to them
CREATE POLICY "Suppliers can view delivery items for their deliveries" ON public.delivery_items
    FOR SELECT
    USING (
        delivery_id IN (
            SELECT id FROM public.deliveries
            WHERE supplier_name IN (
                SELECT name FROM public.suppliers
                WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
        )
    );

-- ============================================
-- SECURE METROTUKKU_PRODUCTS TABLE
-- ============================================
-- This is product catalog data - should be read-only for users, write only by service role

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow public access" ON public.metrotukku_products;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.metrotukku_products;

-- Allow authenticated users to READ product catalog (public read is acceptable for product info)
CREATE POLICY "Authenticated users can view products" ON public.metrotukku_products
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can modify products (handled outside RLS via service key)
