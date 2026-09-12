import os
from dotenv import load_dotenv
from supabase import create_client, Client
load_dotenv("worker/.env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    # Attempt broadcast
    channel = supabase.channel('prices')
    res = channel.broadcast(event='tick', payload={'test': True})
    print("Broadcast successful", res)
except Exception as e:
    print("Broadcast failed:", e)
