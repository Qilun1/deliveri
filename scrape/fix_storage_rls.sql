-- 1. Ensure the 'product-images' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create RLS policy to allow public access to the bucket
-- Note: usage of 'create policy if not exists' is not standard SQL, so we drop if exists first to be safe/idempotent
DROP POLICY IF EXISTS "Allow public access to product-images" ON storage.objects;

CREATE POLICY "Allow public access to product-images"
ON storage.objects
FOR ALL
TO anon
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');
