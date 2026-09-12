import os
import time
import sys
import threading
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
import MetaTrader5 as mt5

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

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

def upsert_candles_async(supabase_client, updates, symbol, count, newest_time):
    try:
        supabase_client.table('candles_1m').upsert(updates, on_conflict='symbol,opened_at').execute()
        print(f"[{symbol}] Wrote {count} candles. Newest: {newest_time} UTC")
    except Exception as e:
        print(f"[{symbol}] Failed to upsert candles: {e}")

def fetch_and_upsert_candles(supabase_client, broker_symbol, symbol, count, async_mode=False):
    # 1 means start from the last completed bar (skip index 0 which is currently forming)
    rates = mt5.copy_rates_from_pos(broker_symbol, mt5.TIMEFRAME_M1, 1, count)
    if rates is None or len(rates) == 0:
        print(f"[{symbol}] No candles fetched.")
        return

    updates = []
    for r in rates:
        opened_at = datetime.fromtimestamp(r['time'], tz=timezone.utc).isoformat()
        updates.append({
            "symbol": symbol,
            "open": float(r['open']),
            "high": float(r['high']),
            "low": float(r['low']),
            "close": float(r['close']),
            "volume": int(r['tick_volume']),
            "opened_at": opened_at
        })
        
    newest_time = updates[-1]['opened_at']
    
    if async_mode:
        t = threading.Thread(target=upsert_candles_async, args=(supabase_client, updates, symbol, len(updates), newest_time))
        t.daemon = True
        t.start()
    else:
        try:
            supabase_client.table('candles_1m').upsert(updates, on_conflict='symbol,opened_at').execute()
            print(f"Startup: [{symbol}] Wrote {len(updates)} candles. Newest: {newest_time} UTC")
        except Exception as e:
            print(f"Startup: [{symbol}] Failed to upsert candles: {e}")

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
        
    print("Fetching 1000 historical 1m candles for active instruments...")
    for inst in instruments:
        fetch_and_upsert_candles(supabase, inst['broker_symbol'], inst['symbol'], 1000, async_mode=False)
        
    last_candle_fetch = time.time()

    try:
        while True:
            current_time = time.time()
            
            # Fetch 3 completed candles every 60 seconds async so it doesn't block
            if current_time - last_candle_fetch >= 60:
                last_candle_fetch = current_time
                for inst in instruments:
                    fetch_and_upsert_candles(supabase, inst['broker_symbol'], inst['symbol'], 3, async_mode=True)
            
            print(f"--- Price Update: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} ---")
            
            updates = []
            broadcast_payload = []
            
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
                    "updated_at": tick_time.isoformat(),
                    "is_stale": is_stale
                })
                
                broadcast_payload.append({
                    "symbol": symbol,
                    "bid": tick.bid,
                    "ask": tick.ask,
                    "updated_at": tick_time.isoformat(),
                    "is_stale": is_stale
                })
            
            if updates:
                try:
                    # Upsert to latest_prices
                    supabase.table('latest_prices').upsert(updates, on_conflict='symbol').execute()
                    
                    # Broadcast via REST API
                    broadcast_data = {
                        "messages": [
                            {
                                "topic": "prices",
                                "event": "tick",
                                "payload": { "prices": broadcast_payload }
                            }
                        ]
                    }
                    headers = {
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json"
                    }
                    res = requests.post(f"{SUPABASE_URL}/realtime/v1/api/broadcast", json=broadcast_data, headers=headers, timeout=5)
                    if not res.ok:
                        print(f"Broadcast HTTP {res.status_code}: {res.text}")
                except Exception as e:
                    print(f"Failed to upsert or broadcast prices: {e}")
            
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
