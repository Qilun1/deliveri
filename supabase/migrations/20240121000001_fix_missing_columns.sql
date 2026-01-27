-- Ensure all potentially missing columns exist (fix for schema cache errors)
alter table public.deliveries 
add column if not exists price numeric,
add column if not exists product_name text,
add column if not exists total_price numeric,
add column if not exists supplier_name text,
add column if not exists unit text,
add column if not exists order_number text,
add column if not exists image_url text,
add column if not exists restaurant_id text,
add column if not exists quantity numeric; -- Include quantity just in case

-- Force schema cache reload hint
comment on table public.deliveries is 'Deliveries table with all columns verified';
