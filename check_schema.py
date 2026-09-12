import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(".env.local")
try:
    conn = psycopg2.connect(
        host="aws-0-ap-southeast-1.pooler.supabase.com",
        port=5432,
        user="postgres.pebwgfgxtxncmrxioowo",
        password="Dipak08v14@",
        dbname="postgres"
    )
    with conn.cursor() as cur:
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'instruments'")
        print(cur.fetchall())
except Exception as e:
    print(e)
