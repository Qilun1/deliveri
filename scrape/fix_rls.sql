-- The error "new row violates row-level security policy" means the database is protecting the table
-- from writes because no policy allows the 'anon' role to insert/update data.

-- This policy allows the anonymous API key (which your script uses) to perform ALL operations (SELECT, INSERT, UPDATE, DELETE).
-- NOTE: This makes the table publicly writable. For a production app, you should use the SERVICE_ROLE_KEY instead.

CREATE POLICY "Allow public access to products"
ON metrotukku_products
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
