import requests
import os
import sys

# Simulation of shippings/utils.py
EXPEDITION_API_KEY = 'q4joEsDR64zm4Bz4yl7C5lhFVU7ZytkUC4nJcDPRrNo8AtP5mc'
EXPEDITION_BASE_URL = 'https://use.api.co.id/expedition/'

def test_api():
    url = f"{EXPEDITION_BASE_URL}shipping-cost"
    headers = {'x-api-co-id': EXPEDITION_API_KEY}
    
    params = {
        'origin_village_code': '3216061005',
        'destination_village_code': '3217022002',
        'weight': 1.0
    }
    
    print(f"Testing GET {url}")
    print(f"Params: {params}")
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
