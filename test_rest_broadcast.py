import os
import requests
from dotenv import load_dotenv

load_dotenv("worker/.env")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

payload = {
    "messages": [
        {
            "topic": "realtime:prices",
            "event": "tick",
            "payload": {"test": True}
        }
    ]
}

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

res = requests.post(f"{SUPABASE_URL}/realtime/v1/api/broadcast", json=payload, headers=headers)
print(res.status_code, res.text)
