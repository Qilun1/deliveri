-- Create receipt-images storage bucket with RLS policies
-- This allows restaurants to upload/manage their receipts,
-- and suppliers to view receipts from connected restaurants.

-- Create the bucket (idempotent)
-- Public=true allows direct URL access. Security via:
-- 1. Unguessable URLs (user_id + timestamp + filename)
-- 2. RLS policies control who can see URLs in the app
-- 3. Upload RLS ensures only authenticated users can upload to their own folder
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS Policies for receipt-images bucket
-- ============================================
-- Folder structure: {user_id}/{timestamp}_{filename}
-- Using (storage.foldername(name))[1] to get the user_id from path

-- Restaurant owners can upload files to their own folder
CREATE POLICY "Restaurants can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipt-images'
  AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- Restaurant owners can read their own receipts
CREATE POLICY "Restaurants can read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipt-images'
  AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- Restaurant owners can delete their own receipts
CREATE POLICY "Restaurants can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipt-images'
  AND (storage.foldername(name))[1] = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- Suppliers can read receipts from connected restaurants
-- Checks if the file's folder (user_id) belongs to a restaurant connected to this supplier
CREATE POLICY "Suppliers can read connected restaurant receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipt-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurant_supplier_connections rsc
    WHERE rsc.restaurant_id = (storage.foldername(name))[1]
      AND rsc.supplier_id = (current_setting('request.jwt.claims', true)::json->>'sub')
      AND rsc.status = 'active'
  )
);
