-- Create deliveries table
create table if not exists public.deliveries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  restaurant_id text not null, -- correctly TEXT for Clerk IDs
  product_name text not null,
  delivery_date date not null,
  price numeric not null,
  quantity numeric,
  supplier_name text,
  unit text,
  total_price numeric,
  order_number text,
  image_url text
);

-- Enable Row Level Security
alter table public.deliveries enable row level security;

-- DROP existing policies if they exist to avoid conflicts (or just create new ones)
drop policy if exists "Users can insert their own deliveries" on public.deliveries;
drop policy if exists "Users can view their own deliveries" on public.deliveries;

-- Policy: Users can only see and insert their own deliveries
-- FIX: Use (select auth.jwt() ->> 'sub') instead of auth.uid()
-- auth.uid() forces a UUID cast, which crashes with Clerk IDs (e.g. "user_123")

create policy "Users can insert their own deliveries"
on public.deliveries for insert
to authenticated
with check (restaurant_id = (select auth.jwt() ->> 'sub'));

create policy "Users can view their own deliveries"
on public.deliveries for select
to authenticated
using (restaurant_id = (select auth.jwt() ->> 'sub'));

-- Creating an index on restaurant_id is good practice for performance
create index if not exists deliveries_restaurant_id_idx on public.deliveries(restaurant_id);
