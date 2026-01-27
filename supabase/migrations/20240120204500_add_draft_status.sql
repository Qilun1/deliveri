-- Update the status check constraint to include 'draft'
ALTER TABLE public.deliveries 
DROP CONSTRAINT IF EXISTS deliveries_status_check;

ALTER TABLE public.deliveries 
ADD CONSTRAINT deliveries_status_check 
CHECK (status IN ('draft', 'complete', 'pending_redelivery', 'resolved'));
