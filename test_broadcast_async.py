import inspect
import asyncio
from supabase.lib.client_options import ClientOptions
from realtime.channel import AsyncRealtimeChannel
print(inspect.signature(AsyncRealtimeChannel.send_broadcast))
