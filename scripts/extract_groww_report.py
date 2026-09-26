import openpyxl
import json
import os

def extract_groww():
    path = r'C:\Users\ManojShankar\Downloads\Mutual_Funds_7254961990_26-09-2026_26-09-2026.xlsx'
    if not os.path.exists(path):
        print("File does not exist:", path)
        return
        
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb['Holdings']
    rows = list(ws.iter_rows(values_only=True))

    holdings = []
    header_found = False

    for r in rows:
        if not r or not any(r):
            continue
        if r[0] == 'Scheme Name':
            header_found = True
            continue
        if header_found and r[0] and str(r[0]).strip():
            name = str(r[0]).strip()
            amc = str(r[1] or '').strip()
            category = f"{r[2]} - {r[3]}" if r[2] and r[3] else str(r[2] or 'Equity')
            folio = str(r[4] or '').strip()
            units = float(r[6] or 0)
            invested = float(str(r[7] or 0).replace(',', ''))
            current = float(str(r[8] or 0).replace(',', ''))
            returns = float(r[9] or (current - invested))
            xirr = str(r[10] or '').strip()
            avg_nav = round(invested / units, 4) if units > 0 else 0.0
            current_nav = round(current / units, 4) if units > 0 else 0.0
            
            holdings.append({
                'scheme_name': name,
                'fund_house': amc,
                'category': category,
                'folio_number': folio,
                'units': round(units, 4),
                'avg_nav': avg_nav,
                'invested_amount': invested,
                'current_nav': current_nav,
                'current_value': current,
                'returns': returns,
                'xirr': xirr
            })

    total_inv = sum(h['invested_amount'] for h in holdings)
    total_curr = sum(h['current_value'] for h in holdings)
    total_returns = total_curr - total_inv
    pct = (total_returns / total_inv) * 100 if total_inv > 0 else 0.0

    print(f"Extracted {len(holdings)} holdings.")
    print(f"Total Invested: Rs. {total_inv:,.2f}")
    print(f"Current Value: Rs. {total_curr:,.2f}")
    print(f"Profit/Loss: +Rs. {total_returns:,.2f} (+{pct:.2f}%)")

    out_dir = r'C:\Users\ManojShankar\Desktop\Learnings\Expenses_website\Version_1.1\finance-tracker\src\data'
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'groww_holdings.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(holdings, f, indent=2)
    print(f"Saved to {out_file}")

if __name__ == '__main__':
    extract_groww()
