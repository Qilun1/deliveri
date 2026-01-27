-- Run this command in your Supabase SQL Editor to fix the upsert error.
-- The error "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- happens because we are trying to upsert based on 'url', but 'url' is not guaranteed to be unique in the database.

ALTER TABLE metrotukku_products
ADD CONSTRAINT metrotukku_products_url_key UNIQUE (url);
