CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.prune_old_candles()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.candles_1m
    WHERE opened_at < (now() - interval '90 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely unschedule if it exists
DO $$
BEGIN
    PERFORM cron.unschedule('prune-old-candles');
EXCEPTION WHEN OTHERS THEN
    -- Ignored
END;
$$;

SELECT cron.schedule(
    'prune-old-candles',
    '0 3 * * *',
    'SELECT public.prune_old_candles();'
);
