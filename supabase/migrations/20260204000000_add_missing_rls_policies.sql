-- SECURITY FIX: Add RLS policies for tables missing proper security
-- This migration adds RLS policies to user_business_mapping, connection_requests,
-- suppliers, and restaurants tables
-- Applied: 2026-02-04

-- ============================================
-- ENABLE RLS ON user_business_mapping
-- ============================================
ALTER TABLE public.user_business_mapping ENABLE ROW LEVEL SECURITY;

-- Users can only view their own business mapping
CREATE POLICY "Users can view own business mapping" ON public.user_business_mapping
    FOR SELECT
    USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can insert their own business mapping
CREATE POLICY "Users can insert own business mapping" ON public.user_business_mapping
    FOR INSERT
    WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can update their own business mapping
CREATE POLICY "Users can update own business mapping" ON public.user_business_mapping
    FOR UPDATE
    USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can delete their own business mapping
CREATE POLICY "Users can delete own business mapping" ON public.user_business_mapping
    FOR DELETE
    USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- ============================================
-- FIX connection_requests TABLE RLS POLICIES
-- ============================================

-- Users can view connection requests they sent or received
DROP POLICY IF EXISTS "Users can view own connection requests" ON public.connection_requests;
CREATE POLICY "Users can view own connection requests" ON public.connection_requests
    FOR SELECT
    USING (
        sender_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
        OR receiver_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    );

-- Users can create connection requests as sender
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connection_requests;
CREATE POLICY "Users can create connection requests" ON public.connection_requests
    FOR INSERT
    WITH CHECK (sender_id::text = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can update connection requests they received (to accept/reject)
DROP POLICY IF EXISTS "Receivers can update connection requests" ON public.connection_requests;
CREATE POLICY "Receivers can update connection requests" ON public.connection_requests
    FOR UPDATE
    USING (receiver_id::text = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Users can delete their own sent connection requests
DROP POLICY IF EXISTS "Users can delete own sent requests" ON public.connection_requests;
CREATE POLICY "Users can delete own sent requests" ON public.connection_requests
    FOR DELETE
    USING (sender_id::text = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- ============================================
-- FIX suppliers TABLE RLS POLICIES
-- ============================================

-- All authenticated users can view suppliers (public directory)
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can only insert/update/delete their own supplier record
DROP POLICY IF EXISTS "Users can insert own supplier" ON public.suppliers;
CREATE POLICY "Users can insert own supplier" ON public.suppliers
    FOR INSERT
    WITH CHECK (id = (current_setting('request.jwt.claims', true)::json->>'sub'));

DROP POLICY IF EXISTS "Users can update own supplier" ON public.suppliers;
CREATE POLICY "Users can update own supplier" ON public.suppliers
    FOR UPDATE
    USING (id = (current_setting('request.jwt.claims', true)::json->>'sub'));

DROP POLICY IF EXISTS "Users can delete own supplier" ON public.suppliers;
CREATE POLICY "Users can delete own supplier" ON public.suppliers
    FOR DELETE
    USING (id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- ============================================
-- FIX restaurants TABLE RLS POLICIES
-- ============================================

-- All authenticated users can view restaurants (for supplier connections)
DROP POLICY IF EXISTS "Authenticated users can view restaurants" ON public.restaurants;
CREATE POLICY "Authenticated users can view restaurants" ON public.restaurants
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can only insert/update/delete their own restaurant record
DROP POLICY IF EXISTS "Users can insert own restaurant" ON public.restaurants;
CREATE POLICY "Users can insert own restaurant" ON public.restaurants
    FOR INSERT
    WITH CHECK (id = (current_setting('request.jwt.claims', true)::json->>'sub'));

DROP POLICY IF EXISTS "Users can update own restaurant" ON public.restaurants;
CREATE POLICY "Users can update own restaurant" ON public.restaurants
    FOR UPDATE
    USING (id = (current_setting('request.jwt.claims', true)::json->>'sub'));

DROP POLICY IF EXISTS "Users can delete own restaurant" ON public.restaurants;
CREATE POLICY "Users can delete own restaurant" ON public.restaurants
    FOR DELETE
    USING (id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- ============================================
-- FIX restaurant_supplier_connections RLS POLICIES
-- ============================================

-- Add INSERT policy (was missing)
DROP POLICY IF EXISTS "Users can create connections" ON public.restaurant_supplier_connections;
CREATE POLICY "Users can create connections" ON public.restaurant_supplier_connections
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
        OR supplier_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );

-- Add DELETE policy (was missing)
DROP POLICY IF EXISTS "Users can delete own connections" ON public.restaurant_supplier_connections;
CREATE POLICY "Users can delete own connections" ON public.restaurant_supplier_connections
    FOR DELETE
    USING (
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
        OR supplier_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );

-- Add UPDATE policy for all involved parties
DROP POLICY IF EXISTS "Users can update own connections" ON public.restaurant_supplier_connections;
CREATE POLICY "Users can update own connections" ON public.restaurant_supplier_connections
    FOR UPDATE
    USING (
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
        OR supplier_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );

-- ============================================
-- FIX missing_items_reports RLS POLICIES
-- ============================================

-- Add INSERT policy for restaurants
DROP POLICY IF EXISTS "Restaurants can create reports" ON public.missing_items_reports;
CREATE POLICY "Restaurants can create reports" ON public.missing_items_reports
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );

-- Add DELETE policy
DROP POLICY IF EXISTS "Users can delete own reports" ON public.missing_items_reports;
CREATE POLICY "Users can delete own reports" ON public.missing_items_reports
    FOR DELETE
    USING (
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );

-- Add UPDATE policy for both parties
DROP POLICY IF EXISTS "Users can update own reports" ON public.missing_items_reports;
CREATE POLICY "Users can update own reports" ON public.missing_items_reports
    FOR UPDATE
    USING (
        restaurant_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
        OR supplier_id IN (SELECT business_id FROM public.user_business_mapping WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
    );
