import urllib.request
import json

url = "https://raw.githubusercontent.com/supabase/supabase/master/spec/common.yaml"
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
        print(content[:500])
except Exception as e:
    print(e)
