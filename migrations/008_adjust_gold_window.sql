-- Reason for configuration:
-- Observed close is 20:57 and observed open is 22:01, confirmed across two weekends (4 Sep and 11 Sep 2026).
-- The configured window is deliberately wider on both sides so that no period without ticks is ever treated as a fault.
-- The cost is about nine minutes on Sunday where prices flow but the instrument is reported closed, which is the safe direction to err.
--
-- IMPORTANT: Gold's close shifts by one hour with US daylight saving time,
-- so this window needs re-verifying after each DST change.

UPDATE public.instruments
SET weekly_close_utc = '{"close_day": 5, "close_time": "20:50", "open_day": 0, "open_time": "22:10"}'::jsonb
WHERE symbol = 'XAUUSD';
