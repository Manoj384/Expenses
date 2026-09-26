import urllib.request
import json

schemes = [
    ('Motilal Oswal Midcap Fund Direct Growth', '127042'),
    ('Quant Small Cap Fund Direct Plan Growth', '120828'),
    ('Nippon India Growth Fund Direct Growth', '120505'),
    ('Bandhan Small Cap Fund Direct Growth', '147944'),
    ('HDFC Flexi Cap Direct Plan Growth', '118989')
]

for name, code in schemes:
    try:
        url = f"https://api.mfapi.in/mf/{code}/latest"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            nav = float(data['data'][0]['nav'])
            date = data['data'][0]['date']
            print(f"{name} ({code}): NAV = Rs. {nav:.2f} as of {date}")
    except Exception as e:
        print(f"Error {name}: {e}")
