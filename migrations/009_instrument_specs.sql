ALTER TABLE public.instruments
ADD COLUMN IF NOT EXISTS volume_step numeric;
