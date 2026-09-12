import os
import time
import sys
import threading
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
import MetaTrader5 as mt5
from alerts import send_alert

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

def is_market_open(instrument, now_utc):
    if instrument.get('trades_247'):
        return True
    
    weekly_close_utc = instrument.get('weekly_close_utc')
    if not weekly_close_utc:
        return True

    current_day = (now_utc.weekday() + 1) % 7
    current_mins_since_sunday = current_day * 24 * 60 + now_utc.hour * 60 + now_utc.minute
    
    close_day = weekly_close_utc.get('close_day', 5)
    close_time_str = weekly_close_utc.get('close_time', '21:00')
    close_h, close_m = map(int, close_time_str.split(':'))
    close_mins = close_day * 24 * 60 + close_h * 60 + close_m
    
    open_day = weekly_close_utc.get('open_day', 0)
    open_time_str = weekly_close_utc.get('open_time', '22:05')
    open_h, open_m = map(int, open_time_str.split(':'))
    open_mins = open_day * 24 * 60 + open_h * 60 + open_m
    
    if close_mins > open_mins:
        if current_mins_since_sunday >= close_mins or current_mins_since_sunday < open_mins:
            return False
    else:
        if close_mins <= current_mins_since_sunday < open_mins:
            return False
            
    return True

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--test-alert":
        print("Sending test alert...")
        send_alert("🔔 Test alert from Price Worker")
        print("Test alert sent. Exiting.")
        sys.exit(0)

    print("Starting Price Worker...")
    send_alert("🟢 Price Worker started.")

    _init_connected = True
    while True:
        if not init_mt5():
            print("Failed to connect to MT5. Retrying in 5 seconds...")
            send_alert("🔴 MT5 connection lost or initialize failed.")
            _init_connected = False
            time.sleep(5)
            continue
            
        if not _init_connected:
            send_alert("🟢 MT5 connection restored.")
        
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
    _mt5_connected = True
    _fault_states = {}

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
                    if _mt5_connected:
                        send_alert("🔴 MT5 connection lost or tick read failed.")
                        _mt5_connected = False
                    continue
                else:
                    if not _mt5_connected:
                        send_alert("🟢 MT5 connection restored (tick read successful).")
                        _mt5_connected = True
                    
                now_utc = datetime.now(timezone.utc)
                tick_time = datetime.fromtimestamp(tick.time, tz=timezone.utc)
                
                staleness_sec = (now_utc - tick_time).total_seconds()
                
                market_open = is_market_open(inst, now_utc)
                if not market_open:
                    market_state = 'closed'
                elif staleness_sec > 60:
                    market_state = 'stale'
                else:
                    market_state = 'open'

                if market_state == 'stale':
                    if symbol not in _fault_states or not _fault_states[symbol]:
                        _fault_states[symbol] = True
                    send_alert(f"⚠️ Price fault: {symbol} is OPEN but has been stale for {int(staleness_sec)} seconds.")
                elif market_state == 'open':
                    if _fault_states.get(symbol):
                        send_alert(f"✅ Fault cleared: {symbol} is ticking again.")
                        _fault_states[symbol] = False
                elif market_state == 'closed':
                    if _fault_states.get(symbol):
                        _fault_states[symbol] = False
                
                stale_marker = f" [{market_state.upper()}]" if market_state != 'open' else ""
                
                prec = inst.get('price_precision', 5)
                if prec is None:
                    prec = 5
                bid_str = f"{tick.bid:.{prec}f}"
                ask_str = f"{tick.ask:.{prec}f}"
                
                tick_time_str = tick_time.strftime('%Y-%m-%d %H:%M:%S')
                print(f"{symbol:<8} ({broker_symbol:<8}) | Bid: {bid_str:<9} | Ask: {ask_str:<9} | Time: {tick_time_str} UTC{stale_marker}")
                
                updates.append({
                    "symbol": symbol,
                    "bid": tick.bid,
                    "ask": tick.ask,
                    "updated_at": tick_time.isoformat(),
                    "market_state": market_state
                })
                
                broadcast_payload.append({
                    "symbol": symbol,
                    "bid": tick.bid,
                    "ask": tick.ask,
                    "updated_at": tick_time.isoformat(),
                    "market_state": market_state
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
        send_alert("🛑 Price Worker shutting down (Ctrl+C).")
    except Exception as e:
        print(f"Unexpected error: {e}")
        send_alert(f"🛑 Price Worker crashed: {e}")
    finally:
        mt5.shutdown()
        print("MetaTrader 5 connection closed.")

if __name__ == "__main__":
    main()
