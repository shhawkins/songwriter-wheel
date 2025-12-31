#!/usr/bin/env python3
"""
Lobbying Analysis - Find top fee filings from LDA Senate API.
"""

import requests
import time
import json

# ============================================================================
# CONFIG
# ============================================================================

API_URL = "https://lda.senate.gov/api/v1/filings/"
YEAR = 2024
DELAY = 1.0

# Tickers
TICKERS = [
    "TCMD", "AORT", "PODD", "NEE", "AAPL", "ABT", "ADBE", "AMAT", "AMD", "AMZN",
    "AXON", "AXP", "AZO", "BLK", "BMI", "BRK.B", "BSX", "CAT", "CELH", "CMG",
    "CMCSA", "COP", "COST", "CRM", "CSX", "CTVA", "CVX", "CYBR", "DE", "ELF",
    "ELV", "EMR", "ETN", "EW", "EXLS", "FCFS", "FI", "FN", "FRPT", "GS",
    "GOOGL", "HD", "HLT", "HON", "HUBB", "ICE", "INST", "IQV", "JPM", "KO",
    "LLY", "LRCX", "LRN", "MA", "META", "MSFT", "NKE", "NVDA", "OLLI", "PANW",
    "PEP", "PG", "PH", "PYPL", "RTX", "SBUX", "SFM", "SHOP", "SHW", "SPGI",
    "STZ", "TJX", "TMO", "TXN", "UNH", "UNP", "VLTO", "ZTS", "CEQP", "DDOG",
    "ETRN", "LSXMK", "FWONK", "LINE", "BATRK"
]

# Ticker -> Client name for LDA search
CLIENTS = {
    "TCMD": "Tactile Medical", "AORT": "Artivion", "PODD": "Insulet",
    "NEE": "NextEra Energy", "AAPL": "Apple", "ABT": "Abbott",
    "ADBE": "Adobe", "AMAT": "Applied Materials", "AMD": "Advanced Micro Devices",
    "AMZN": "Amazon", "AXON": "Axon", "AXP": "American Express",
    "AZO": "AutoZone", "BLK": "BlackRock", "BMI": "Badger Meter",
    "BRK.B": "Berkshire Hathaway", "BSX": "Boston Scientific", "CAT": "Caterpillar",
    "CELH": "Celsius Holdings", "CMG": "Chipotle", "CMCSA": "Comcast",
    "COP": "ConocoPhillips", "COST": "Costco", "CRM": "Salesforce",
    "CSX": "CSX", "CTVA": "Corteva", "CVX": "Chevron",
    "CYBR": "CyberArk", "DE": "Deere", "ELF": "e.l.f. Beauty",
    "ELV": "Elevance Health", "EMR": "Emerson", "ETN": "Eaton",
    "EW": "Edwards Lifesciences", "EXLS": "ExlService", "FCFS": "FirstCash",
    "FI": "Fiserv", "FN": "Fabrinet", "FRPT": "Freshpet",
    "GS": "Goldman Sachs", "GOOGL": "Google", "HD": "Home Depot",
    "HLT": "Hilton", "HON": "Honeywell", "HUBB": "Hubbell",
    "ICE": "Intercontinental Exchange", "INST": "Instructure", "IQV": "IQVIA",
    "JPM": "JPMorgan", "KO": "Coca-Cola", "LLY": "Eli Lilly",
    "LRCX": "Lam Research", "LRN": "Stride", "MA": "Mastercard",
    "META": "Meta", "MSFT": "Microsoft", "NKE": "Nike",
    "NVDA": "NVIDIA", "OLLI": "Ollie's", "PANW": "Palo Alto Networks",
    "PEP": "PepsiCo", "PG": "Procter & Gamble", "PH": "Parker Hannifin",
    "PYPL": "PayPal", "RTX": "RTX", "SBUX": "Starbucks",
    "SFM": "Sprouts Farmers Market", "SHOP": "Shopify", "SHW": "Sherwin-Williams",
    "SPGI": "S&P Global", "STZ": "Constellation Brands", "TJX": "TJX",
    "TMO": "Thermo Fisher", "TXN": "Texas Instruments", "UNH": "UnitedHealth",
    "UNP": "Union Pacific", "VLTO": "Veralto", "ZTS": "Zoetis",
    "CEQP": "Crestwood Equity", "DDOG": "Datadog", "ETRN": "Equitrans",
    "LSXMK": "Liberty Media", "FWONK": "Liberty Media", "LINE": "Lineage",
    "BATRK": "Liberty Media"
}

# ============================================================================
# FUNCTIONS
# ============================================================================

def fetch(client):
    """Fetch all filings for a client for federal FY 2024 (Oct 2023 - Sept 2024)."""
    results = []
    
    # FY 2024 = Q4 2023 + Q1-Q3 2024
    queries = [
        {"client_name": client, "filing_year": 2023, "filing_period": "fourth_quarter"},
        {"client_name": client, "filing_year": 2024, "filing_period": "first_quarter"},
        {"client_name": client, "filing_year": 2024, "filing_period": "second_quarter"},
        {"client_name": client, "filing_year": 2024, "filing_period": "third_quarter"},
    ]
    
    for params in queries:
        url = API_URL
        while url:
            r = requests.get(url, params=params)
            
            if r.status_code == 429:
                print(f"  {client}... rate limited, waiting 10s")
                time.sleep(10)
                continue
            if r.status_code != 200:
                break
                
            data = r.json()
            results.extend(data.get("results", []))
            url, params = data.get("next"), None
            time.sleep(DELAY)
    
    print(f"  {client}: {len(results)} filings")
    return results

def main():
    print(f"\n{'='*60}\nLDA FILINGS ANALYSIS - FY {YEAR}\n{'='*60}\n")
    
    # Collect all filings with income
    filings = []
    for ticker in TICKERS:
        client = CLIENTS.get(ticker)
        if not client:
            continue
        
        for f in fetch(client):
            if f.get("income"):
                try:
                    filings.append({
                        "ticker": ticker,
                        "client": client,
                        "firm": f.get("registrant", {}).get("name", "?"),
                        "amount": float(f["income"]),
                        "date": f.get("dt_posted", "")[:10],
                        "lobbyists": [l["name"] for l in f.get("lobbyists", []) if l.get("name")]
                    })
                except ValueError:
                    pass
    
    # Sort by amount
    filings.sort(key=lambda x: x["amount"], reverse=True)
    
    # Get top 3 unique amounts (handles ties)
    amounts = sorted(set(f["amount"] for f in filings), reverse=True)[:3]
    top = [f for f in filings if f["amount"] in amounts]
    
    # Output
    print(f"\n{'='*60}\nTOP FILINGS (includes ties)\n{'='*60}")
    for i, f in enumerate(top, 1):
        print(f"\n{i}. ${f['amount']:,.0f}")
        print(f"   {f['client']} ({f['ticker']}) → {f['firm']}")
        print(f"   Lobbyists: {', '.join(f['lobbyists'][:5]) or 'N/A'}")
        print(f"   Date: {f['date']}")
    
    # Save
    with open("top_filings.json", "w") as out:
        json.dump(top, out, indent=2)
    print(f"\nSaved to top_filings.json")

if __name__ == "__main__":
    main()
