-- MT5 is the source of truth for price precision.
-- The sync script flagged this mismatch (MT5 reported 4 digits for SOLUSD 
-- while the DB had 3) rather than silently overwriting it.
UPDATE public.instruments
SET price_precision = 4
WHERE symbol = 'SOLUSD';
