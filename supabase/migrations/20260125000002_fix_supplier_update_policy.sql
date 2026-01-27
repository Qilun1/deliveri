-- Migration: Fix Supplier Update Policy
-- Added: 2026-01-25

-- Allow suppliers to update deliveries sent to them
-- This is necessary for suppliers to resolve issues (change status to 'resolved')
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deliveries') THEN
        DROP POLICY IF EXISTS "Suppliers can update shared supplier deliveries" ON public.deliveries;
        
        CREATE POLICY "Suppliers can update shared supplier deliveries" ON public.deliveries
            FOR UPDATE
            USING (
                supplier_id IN (
                    SELECT business_id FROM public.user_business_mapping 
                    WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
                )
            );
    END IF;
END $$;
