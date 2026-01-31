-- Add distance column to checkpoints table (in meters)
ALTER TABLE public.checkpoints
ADD COLUMN distance numeric DEFAULT 100;

-- Add comment for clarity
COMMENT ON COLUMN public.checkpoints.distance IS 'Allowed scanning distance from checkpoint in meters';