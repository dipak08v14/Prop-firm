import os
import time
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
import MetaTrader5 as mt5

# Load environment variables
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
MT5_PATH = os.environ.get("MT5_TERMINAL_PATH")

if not all([SUPABASE_URL, SUPABASE_KEY, MT5_PATH]):
    print("Missing environment variables. Please check worker/.env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def init_mt5():
    if not mt5.initialize(path=MT5_PATH):
        print(f"MT5 initialize() failed, error code = {mt5.last_error()}")
        return False
    return True

def get_active_instruments():
    try:
        response = supabase.table('instruments').select('*').eq('is_active', True).execute()
        return response.data
    except Exception as e:
        print(f"Failed to fetch active instruments: {e}")
        return None

def main():
    print("Starting Price Worker...")

    while True:
        if not init_mt5():
            print("Failed to connect to MT5. Retrying in 5 seconds...")
            time.sleep(5)
            continue
            
        print("Connected to MT5.")
        break
        
    print("Fetching active instruments from Supabase...")
    instruments = get_active_instruments()
    
    if instruments is None:
        print("Could not fetch instruments. Exiting.")
        sys.exit(1)
        
    if not instruments:
        print("No active instruments found in DB.")
        
    try:
        while True:
            print(f"--- Price Update: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} ---")
            
            updates = []
            
            for inst in instruments:
                symbol = inst['symbol']               # e.g. BTCUSD
                broker_symbol = inst['broker_symbol'] # e.g. BTCUSDm
                
                info = mt5.symbol_info(broker_symbol)
                if info is None:
                    print(f"{broker_symbol}: Not found in MT5")
                    continue
                    
                if not info.visible:
                    if not mt5.symbol_select(broker_symbol, True):
                        print(f"{broker_symbol}: Failed to make symbol visible")
                        continue
                        
                tick = mt5.symbol_info_tick(broker_symbol)
                if tick is None:
                    print(f"{broker_symbol}: Failed to retrieve tick")
                    # If tick fails, MT5 might be disconnected, but we let it loop and handle errors
                    continue
                    
                now_utc = datetime.now(timezone.utc)
                tick_time = datetime.fromtimestamp(tick.time, tz=timezone.utc)
                
                staleness_sec = (now_utc - tick_time).total_seconds()
                
                is_stale = staleness_sec > 60
                stale_marker = " [STALE]" if is_stale else ""
                
                tick_time_str = tick_time.strftime('%Y-%m-%d %H:%M:%S')
                print(f"{symbol:<8} ({broker_symbol:<8}) | Bid: {tick.bid:<9} | Ask: {tick.ask:<9} | Time: {tick_time_str} UTC{stale_marker}")
                
                updates.append({
                    "symbol": symbol,
                    "bid": tick.bid,
                    "ask": tick.ask,
                    "updated_at": tick_time.isoformat()
                })
            
            if updates:
                try:
                    # Upsert to latest_prices
                    supabase.table('latest_prices').upsert(updates, on_conflict='symbol').execute()
                except Exception as e:
                    print(f"Failed to upsert prices to Supabase: {e}")
                    # If the connection failed completely, wait and retry
                    time.sleep(5)
            
            print("-" * 75)
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\nWorker stopped by user (Ctrl+C).")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        mt5.shutdown()
        print("MetaTrader 5 connection closed.")

if __name__ == "__main__":
    main()
