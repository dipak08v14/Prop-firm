import os
import requests
import time
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

_last_sent_times = {}
DEDUPE_WINDOW_SECONDS = 15 * 60  # 15 minutes

def send_alert(message):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return

    if TELEGRAM_BOT_TOKEN == "REPLACE_WITH_BOT_TOKEN" or TELEGRAM_CHAT_ID == "REPLACE_WITH_CHAT_ID":
        return

    now = time.time()
    last_sent = _last_sent_times.get(message, 0)
    
    if (now - last_sent) < DEDUPE_WINDOW_SECONDS:
        return  # Deduplicated

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        res = requests.post(url, json=payload, timeout=5)
        if not res.ok:
            print(f"Telegram Alert HTTP {res.status_code}: {res.text}")
        else:
            _last_sent_times[message] = now
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}")
