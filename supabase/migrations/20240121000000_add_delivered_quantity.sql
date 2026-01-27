-- Add delivered_quantity column to deliveries table
alter table public.deliveries 
add column if not exists delivered_quantity numeric;

comment on column public.deliveries.delivered_quantity is 'The actual quantity delivered/received, separate from the invoiced/ordered quantity';
