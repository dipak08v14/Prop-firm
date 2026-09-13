import os
import sys
import MetaTrader5 as mt5
from supabase import create_client
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
MT5_PATH = os.environ.get("MT5_TERMINAL_PATH")

if not all([SUPABASE_URL, SUPABASE_KEY, MT5_PATH]):
    print("Missing env vars.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

if not mt5.initialize(path=MT5_PATH):
    print("MT5 initialize failed.")
    sys.exit(1)

res = supabase.table('instruments').select('*').eq('is_active', True).execute()
instruments = res.data

print(f"{'SYMBOL':<8} | {'FIELD':<15} | {'BEFORE':<12} | {'AFTER':<12} | {'CHANGED'}")
print("-" * 65)

spreads_report = []
mismatches = []

for inst in instruments:
    sym = inst['symbol']
    br_sym = inst['broker_symbol']
    
    info = mt5.symbol_info(br_sym)
    if info is None:
        print(f"Skipping {sym}, not found in MT5 as {br_sym}")
        continue
        
    tick = mt5.symbol_info_tick(br_sym)

    updates = {
        'contract_size': info.trade_contract_size,
        'min_quantity': info.volume_min,
        'max_quantity': info.volume_max,
        'volume_step': info.volume_step
    }
    
    # Verify digits vs price_precision
    if info.digits != inst.get('price_precision'):
        mismatches.append(f"[{sym}] MT5 digits={info.digits}, DB price_precision={inst.get('price_precision')}")
        
    # Spread in price units and percentage of bid
    if tick and tick.bid > 0:
        spread_price = tick.ask - tick.bid
        spread_pct = (spread_price / tick.bid) * 100
        spreads_report.append(f"{sym:<8}: {spread_price:.{info.digits}f} ({spread_pct:.5f}%)")
    else:
        spreads_report.append(f"{sym:<8}: No tick data to calc spread")
        
    for k, v in updates.items():
        before = inst.get(k)
        changed = before != v
        print(f"{sym:<8} | {k:<15} | {str(before):<12} | {str(v):<12} | {'YES' if changed else 'NO'}")
        
    # Write back to DB
    supabase.table('instruments').update(updates).eq('symbol', sym).execute()

print("\n--- DIGITS MISMATCHES ---")
if mismatches:
    for m in mismatches:
        print(m)
else:
    print("None. All digits match price_precision perfectly.")
    
print("\n--- WEEKEND SPREAD REPORT (SATURDAY/SUNDAY) ---")
print("NOTE: Crypto CFD spreads widen significantly during weekends. Re-check on a weekday.")
for s in spreads_report:
    print(s)

mt5.shutdown()
