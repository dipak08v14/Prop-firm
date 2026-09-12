import MetaTrader5 as mt5
import time
from datetime import datetime, timezone
import sys

def main():
    print("Initializing MetaTrader 5...")
    # Initialize MT5 pointing explicitly to the requested terminal
    path = r"C:\Program Files\Five Percent Online MetaTrader 5\terminal64.exe"
    
    if not mt5.initialize(path=path):
        print(f"initialize() failed, error code = {mt5.last_error()}")
        sys.exit(1)
        
    # Get and print connected account info
    account_info = mt5.account_info()
    if account_info is None:
        print(f"Failed to get account info, error code = {mt5.last_error()}")
        mt5.shutdown()
        sys.exit(1)
        
    print(f"Connected to Account: {account_info.login}")
    print(f"Broker/Server: {account_info.company} / {account_info.server}")
    print("-" * 55)
    
    symbols = ["BTCUSDm", "ETHUSDm", "SOLUSDm", "XRPUSDm", "XAUUSDm"]
    
    try:
        while True:
            print(f"--- Price Update: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} ---")
            for symbol in symbols:
                # Check symbol info
                info = mt5.symbol_info(symbol)
                if info is None:
                    print(f"{symbol}: Not found")
                    continue
                
                # Make sure symbol is visible in the Market Watch
                if not info.visible:
                    if not mt5.symbol_select(symbol, True):
                        print(f"{symbol}: Failed to make symbol visible")
                        continue
                        
                # Get the latest tick
                tick = mt5.symbol_info_tick(symbol)
                if tick is None:
                    print(f"{symbol}: Failed to retrieve tick")
                    continue
                    
                # Convert MT5 tick time to readable UTC
                tick_time = datetime.fromtimestamp(tick.time, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                print(f"{symbol:<8} | Bid: {tick.bid:<9} | Ask: {tick.ask:<9} | Time: {tick_time} UTC")
                
            print("-" * 55)
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\nStopped by user (Ctrl+C).")
    finally:
        mt5.shutdown()
        print("MetaTrader 5 connection closed.")

if __name__ == "__main__":
    main()
