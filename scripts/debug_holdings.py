import json

with open('src/data/groww_holdings.json', 'r') as f:
    data = json.load(f)

print(f"Total {len(data)} rows in Groww Excel:")
tot_inv = 0
tot_cur = 0
for i, d in enumerate(data):
    print(f"  {i+1}. {d['scheme_name']} (Folio: {d['folio_number']})")
    print(f"     Units: {d['units']}, Avg NAV: Rs. {d['avg_nav']}, Current NAV: Rs. {d['current_nav']}")
    print(f"     Invested: Rs. {d['invested_amount']:,.2f}, Current Value: Rs. {d['current_value']:,.2f}")
    tot_inv += d['invested_amount']
    tot_cur += d['current_value']

print("-----------------------------------------")
print(f"GRAND TOTAL INVESTED: Rs. {tot_inv:,.2f}")
print(f"GRAND TOTAL CURRENT:  Rs. {tot_cur:,.2f}")
