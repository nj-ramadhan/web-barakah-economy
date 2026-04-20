import requests
import json
from django.conf import settings
import urllib3

# Disable warnings for insecure requests
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# API Key for API.co.id Indonesia Expedition Cost API
EXPEDITION_API_KEY = getattr(settings, 'EXPEDITION_API_KEY', '')

# API.co.id Base URLs
REGIONAL_BASE_URL = 'https://use.api.co.id/regional/indonesia/'
EXPEDITION_BASE_URL = 'https://use.api.co.id/expedition/'

def get_shipping_cost(origin_village_code, destination_village_code, weight_grams, courier=None):
    """
    Fetch shipping cost from API.co.id Indonesia Expedition Cost API.
    origin_village_code and destination_village_code must be 10-digit codes.
    weight_grams: Package weight in grams (converted to kg).
    """
    url = f"{EXPEDITION_BASE_URL}shipping-cost"
    headers = {'x-api-co-id': EXPEDITION_API_KEY}
    
    # Weight must be in KG and > 0
    weight_kg = max(weight_grams / 1000, 0.1)
    
    params = {
        'origin_village_code': origin_village_code,
        'destination_village_code': destination_village_code,
        'weight': weight_kg
    }
    
    # API.co.id requires 10-digit village codes (Kemendagri/BPS)
    if len(str(origin_village_code)) != 10 or len(str(destination_village_code)) != 10:
        return {"error": f"Invalid location code length. Required: 10 digits. Got: {len(str(origin_village_code))} and {len(str(destination_village_code))}. Please update your profile with a valid Village/Kelurahan."}

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # Response structure: { status: "success", result: [ { courier_name, price, estimation, ... } ] }
            results = []
            if data.get('status') == 'success':
                for item in data.get('result', []):
                    # Filter by courier code if specified (case insensitive)
                    if courier and courier.upper() != item.get('courier_code', '').upper():
                        continue
                        
                    results.append({
                        'service': item.get('courier_name'),
                        'cost': item.get('price'),
                        'etd': item.get('estimation'),
                        'description': item.get('courier_code', '')
                    })
            return results
        else:
            print(f"DEBUG Expedition API Cost Error: {response.status_code} - {response.text}")
            return {"error": f"API Error: {response.status_code}"}
    except Exception as e:
        print(f"DEBUG Expedition API Cost Exception: {str(e)}")
        return {"error": str(e)}

HARDCODED_PROVINCES = [
    {'province_id': '11', 'province': 'Aceh (NAD)'},
    {'province_id': '51', 'province': 'Bali'},
    {'province_id': '36', 'province': 'Banten'},
    {'province_id': '17', 'province': 'Bengkulu'},
    {'province_id': '34', 'province': 'DI Yogyakarta'},
    {'province_id': '31', 'province': 'DKI Jakarta'},
    {'province_id': '75', 'province': 'Gorontalo'},
    {'province_id': '15', 'province': 'Jambi'},
    {'province_id': '32', 'province': 'Jawa Barat'},
    {'province_id': '33', 'province': 'Jawa Tengah'},
    {'province_id': '35', 'province': 'Jawa Timur'},
    {'province_id': '61', 'province': 'Kalimantan Barat'},
    {'province_id': '63', 'province': 'Kalimantan Selatan'},
    {'province_id': '62', 'province': 'Kalimantan Tengah'},
    {'province_id': '64', 'province': 'Kalimantan Timur'},
    {'province_id': '65', 'province': 'Kalimantan Utara'},
    {'province_id': '19', 'province': 'Kepulauan Bangka Belitung'},
    {'province_id': '21', 'province': 'Kepulauan Riau'},
    {'province_id': '18', 'province': 'Lampung'},
    {'province_id': '81', 'province': 'Maluku'},
    {'province_id': '82', 'province': 'Maluku Utara'},
    {'province_id': '52', 'province': 'Nusa Tenggara Barat (NTB)'},
    {'province_id': '53', 'province': 'Nusa Tenggara Timur (NTT)'},
    {'province_id': '91', 'province': 'Papua'},
    {'province_id': '92', 'province': 'Papua Barat'},
    {'province_id': '95', 'province': 'Papua Pegunungan'},
    {'province_id': '93', 'province': 'Papua Selatan'},
    {'province_id': '94', 'province': 'Papua Tengah'},
    {'province_id': '73', 'province': 'Sulawesi Selatan'},
    {'province_id': '76', 'province': 'Sulawesi Barat'},
    {'province_id': '72', 'province': 'Sulawesi Tengah'},
    {'province_id': '74', 'province': 'Sulawesi Tenggara'},
    {'province_id': '71', 'province': 'Sulawesi Utara'},
    {'province_id': '13', 'province': 'Sumatera Barat'},
    {'province_id': '16', 'province': 'Sumatera Selatan'},
    {'province_id': '12', 'province': 'Sumatera Utara'},
    {'province_id': '14', 'province': 'Riau'},
    {'province_id': '76', 'province': 'Sulawesi Barat'}
]

def get_provinces():
    url = f"{REGIONAL_BASE_URL}provinces"
    headers = {'x-api-co-id': EXPEDITION_API_KEY}
    try:
        if EXPEDITION_API_KEY:
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                source_data = data.get('data', [])
                if source_data:
                    mapped_data = []
                    for item in source_data:
                        mapped_data.append({
                            'province_id': str(item.get('code')),
                            'province': item.get('name')
                        })
                    return mapped_data
        
        # Fallback to hardcoded provinces if API fails or Key is missing
        print("DEBUG: Using Hardcoded Provinces Fallback")
        return HARDCODED_PROVINCES
    except Exception as e:
        print(f"DEBUG Expedition API Province Exception: {str(e)}")
        return HARDCODED_PROVINCES

def get_cities(province_code=None):
    if not province_code:
        return []
    url = f"{REGIONAL_BASE_URL}provinces/{province_code}/regencies"
    headers = {'x-api-co-id': EXPEDITION_API_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'city_id': str(item.get('code')),
                    'city_name': item.get('name'),
                    'type': '' 
                })
            return mapped_data
        return []
    except Exception as e:
        print(f"DEBUG Expedition API City Exception: {str(e)}")
        return []

def get_districts(regency_code=None):
    if not regency_code:
        return []
    url = f"{REGIONAL_BASE_URL}regencies/{regency_code}/districts"
    headers = {'x-api-co-id': EXPEDITION_API_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'district_id': str(item.get('code')),
                    'district_name': item.get('name')
                })
            return mapped_data
        return []
    except Exception as e:
        print(f"DEBUG Expedition API District Exception: {str(e)}")
        return []

def get_villages(district_code=None):
    if not district_code:
        return []
    url = f"{REGIONAL_BASE_URL}districts/{district_code}/villages"
    headers = {'x-api-co-id': EXPEDITION_API_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'village_id': str(item.get('code')),
                    'village_name': item.get('name')
                })
            return mapped_data
        return []
    except Exception as e:
        print(f"DEBUG Expedition API Village Exception: {str(e)}")
        return []
