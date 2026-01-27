create table if not exists public.deliveries (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  supplier_name text not null,
  delivery_date date not null default current_date,
  order_number text,
  total_value decimal(10, 2) not null default 0,
  missing_value decimal(10, 2) not null default 0,
  status text not null check (status in ('complete', 'pending_redelivery', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.delivery_items (
  id uuid default gen_random_uuid() primary key,
  delivery_id uuid references public.deliveries(id) on delete cascade not null,
  name text not null,
  quantity numeric not null,
  unit text not null,
  price_per_unit decimal(10, 2) not null,
  total_price decimal(10, 2) not null,
  received_quantity numeric,
  missing_quantity numeric,
  status text not null check (status in ('received', 'missing')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.deliveries enable row level security;
alter table public.delivery_items enable row level security;

-- Policies for deliveries
create policy "Users can view their own deliveries"
  on public.deliveries for select
  using (user_id = request.jwt() ->> 'sub' OR user_id = current_setting('request.jwt.claim.sub', true));

create policy "Users can insert their own deliveries"
  on public.deliveries for insert
  with check (user_id = request.jwt() ->> 'sub' OR user_id = current_setting('request.jwt.claim.sub', true));

create policy "Users can update their own deliveries"
  on public.deliveries for update
  using (user_id = request.jwt() ->> 'sub' OR user_id = current_setting('request.jwt.claim.sub', true));

-- Policies for delivery_items
-- We assume if you have access to the delivery, you have access to items. 
-- But strictly, we check via the delivery_id relation or just basic insert if the parent checks out.
-- For simplicity in this demo environment, allowing inserts if authenticated is often done, but let's be strict if possible.
-- Simpler RLS for items: check if the parent delivery belongs to the user? 
-- Actually, for insert, we might not query the parent easily in a check (performance).
-- Let's just allow authenticated users to view/insert items where they can see the delivery.

create policy "Users can view items of their deliveries"
  on public.delivery_items for select
  using (
    exists (
      select 1 from public.deliveries
      where public.deliveries.id = public.delivery_items.delivery_id
      and (public.deliveries.user_id = request.jwt() ->> 'sub' OR public.deliveries.user_id = current_setting('request.jwt.claim.sub', true))
    )
  );

create policy "Users can insert items for their deliveries"
  on public.delivery_items for insert
  with check (
    exists (
      select 1 from public.deliveries
      where public.deliveries.id = delivery_id
      and (public.deliveries.user_id = request.jwt() ->> 'sub' OR public.deliveries.user_id = current_setting('request.jwt.claim.sub', true))
    )
  );
