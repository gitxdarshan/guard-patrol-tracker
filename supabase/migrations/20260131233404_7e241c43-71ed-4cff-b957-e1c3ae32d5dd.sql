-- Create guard_locations table for real-time tracking
CREATE TABLE public.guard_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guard_id uuid NOT NULL,
  guard_name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  status text NOT NULL DEFAULT 'on_patrol',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guard_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all guard locations"
ON public.guard_locations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Guards can update their own location"
ON public.guard_locations
FOR ALL
USING (auth.uid() = guard_id)
WITH CHECK (auth.uid() = guard_id);

-- Create unique index on guard_id (one location per guard)
CREATE UNIQUE INDEX idx_guard_locations_guard_id ON public.guard_locations(guard_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_locations;