-- SECURITY FIX: Replace overly permissive RLS policies with proper user-scoped policies
-- This migration fixes policies that use USING (true) or WITH CHECK (true)
-- Applied: 2026-02-04

-- ============================================
-- FIX missing_items_report_items TABLE RLS
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete report items" ON public.missing_items_report_items;
DROP POLICY IF EXISTS "Authenticated users can insert report items" ON public.missing_items_report_items;
DROP POLICY IF EXISTS "Authenticated users can update report items" ON public.missing_items_report_items;

-- Users can only INSERT items for reports they created (restaurant owns report)
CREATE POLICY "Users can insert own report items" ON public.missing_items_report_items
    FOR INSERT
    WITH CHECK (
        report_id IN (
            SELECT id FROM public.missing_items_reports
            WHERE restaurant_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
        )
    );

-- Users can UPDATE items for reports they own (restaurant) or are recipient of (supplier)
CREATE POLICY "Users can update own report items" ON public.missing_items_report_items
    FOR UPDATE
    USING (
        report_id IN (
            SELECT id FROM public.missing_items_reports
            WHERE restaurant_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
            OR supplier_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
        )
    );

-- Users can DELETE items for reports they created (restaurant only)
CREATE POLICY "Users can delete own report items" ON public.missing_items_report_items
    FOR DELETE
    USING (
        report_id IN (
            SELECT id FROM public.missing_items_reports
            WHERE restaurant_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
        )
    );

-- ============================================
-- FIX missing_items_reports TABLE RLS
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert reports" ON public.missing_items_reports;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON public.missing_items_reports;

-- Note: "Restaurants can create reports" and "Users can update own reports"
-- policies were created in the previous migration with proper restrictions

-- ============================================
-- FIX notifications TABLE RLS
-- ============================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Notifications can be inserted by the system (service role) or for the user themselves
-- Since notifications are typically created by triggers/functions, we allow insert
-- only for notifications targeting the authenticated user
CREATE POLICY "Users can receive own notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (
        user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        OR user_id IN (
            SELECT business_id FROM public.user_business_mapping
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

-- ============================================
-- FIX restaurant_supplier_connections TABLE RLS
-- ============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete connections" ON public.restaurant_supplier_connections;
DROP POLICY IF EXISTS "Authenticated users can insert connections" ON public.restaurant_supplier_connections;
DROP POLICY IF EXISTS "Authenticated users can update connections" ON public.restaurant_supplier_connections;

-- Note: "Users can create connections", "Users can delete own connections", and
-- "Users can update own connections" policies were created in the previous migration
-- with proper restrictions using user_business_mapping

-- ============================================
-- FIX outgoing_deliveries TABLE RLS
-- ============================================

-- Ensure suppliers can only access their own outgoing deliveries
DROP POLICY IF EXISTS "Suppliers can view own outgoing deliveries" ON public.outgoing_deliveries;
CREATE POLICY "Suppliers can view own outgoing deliveries" ON public.outgoing_deliveries
    FOR SELECT
    USING (
        supplier_id IN (
            SELECT business_id FROM public.user_business_mapping
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
        OR restaurant_id IN (
            SELECT business_id FROM public.user_business_mapping
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

DROP POLICY IF EXISTS "Suppliers can create outgoing deliveries" ON public.outgoing_deliveries;
CREATE POLICY "Suppliers can create outgoing deliveries" ON public.outgoing_deliveries
    FOR INSERT
    WITH CHECK (
        supplier_id IN (
            SELECT business_id FROM public.user_business_mapping
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

DROP POLICY IF EXISTS "Suppliers can update own outgoing deliveries" ON public.outgoing_deliveries;
CREATE POLICY "Suppliers can update own outgoing deliveries" ON public.outgoing_deliveries
    FOR UPDATE
    USING (
        supplier_id IN (
            SELECT business_id FROM public.user_business_mapping
            WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
        )
    );

-- ============================================
-- FIX outgoing_delivery_items TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view outgoing delivery items" ON public.outgoing_delivery_items;
CREATE POLICY "Users can view outgoing delivery items" ON public.outgoing_delivery_items
    FOR SELECT
    USING (
        outgoing_delivery_id IN (
            SELECT id FROM public.outgoing_deliveries
            WHERE supplier_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
            OR restaurant_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
        )
    );

DROP POLICY IF EXISTS "Suppliers can insert outgoing delivery items" ON public.outgoing_delivery_items;
CREATE POLICY "Suppliers can insert outgoing delivery items" ON public.outgoing_delivery_items
    FOR INSERT
    WITH CHECK (
        outgoing_delivery_id IN (
            SELECT id FROM public.outgoing_deliveries
            WHERE supplier_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
        )
    );

DROP POLICY IF EXISTS "Suppliers can update outgoing delivery items" ON public.outgoing_delivery_items;
CREATE POLICY "Suppliers can update outgoing delivery items" ON public.outgoing_delivery_items
    FOR UPDATE
    USING (
        outgoing_delivery_id IN (
            SELECT id FROM public.outgoing_deliveries
            WHERE supplier_id IN (
                SELECT business_id FROM public.user_business_mapping
                WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
            )
        )
    );
