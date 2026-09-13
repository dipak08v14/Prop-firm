INSERT INTO public.account_templates (
    name, starting_balance, profit_target_pct, daily_drawdown_pct, 
    max_drawdown_pct, min_trading_days, max_days, price_inr, is_active
) 
SELECT 'Evaluation $10K', 10000, 8, 5, 10, 5, 30, 0, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.account_templates WHERE name = 'Evaluation $10K'
);
