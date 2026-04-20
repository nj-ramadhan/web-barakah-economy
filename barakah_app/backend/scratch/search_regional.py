import requests
import os

EXPEDITION_API_KEY = 'q4joEsDR64zm4Bz4yl7C5lhFVU7ZytkUC4nJcDPRrNo8AtP5mc'
REGIONAL_BASE_URL = 'https://use.api.co.id/regional/indonesia/'

def search_village(keyword):
    # The documentation said /regional/indonesia/villages might exist or we search by district
    # Let's try to find Tambun Selatan district first.
    # We know Bekasi Regency is usually 3216.
    # District Tambun Selatan is usually 321606.
    
    url = f"{REGIONAL_BASE_URL}districts/321606/villages"
    headers = {'x-api-co-id': EXPEDITION_API_KEY}
    
    print(f"Fetching villages for district 321606...")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        data = response.json()
        villages = data.get('data', [])
        for v in villages:
            if 'LAMBANGJAYA' in v.get('name', '').upper():
                print(f"Found: {v}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    search_village("LAMBANGJAYA")
