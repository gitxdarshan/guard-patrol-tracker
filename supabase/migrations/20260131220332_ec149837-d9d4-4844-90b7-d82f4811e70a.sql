-- Add GPS coordinates to checkpoints table
ALTER TABLE public.checkpoints 
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC;

-- Add comment for clarity
COMMENT ON COLUMN public.checkpoints.latitude IS 'Fixed GPS latitude of checkpoint location';
COMMENT ON COLUMN public.checkpoints.longitude IS 'Fixed GPS longitude of checkpoint location';