import requests
import json
from django.conf import settings
import urllib3

# Disable warnings for insecure requests because we are using verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

RAJAONGKIR_API_KEY = getattr(settings, 'RAJAONGKIR_API_KEY', '')
# Komerce RajaOngkir Base URL
RAJAONGKIR_BASE_URL = 'https://rajaongkir.komerce.id/api/v1/'

# Global setting to bypass SSL verification for debugging
VERIFY_SSL = False 

def get_shipping_cost(origin_id, destination_id, weight, courier):
    """
    Fetch shipping cost from Komerce RajaOngkir API.
    """
    url = f"{RAJAONGKIR_BASE_URL}calculate/district/domestic-cost"
    headers = {
        'key': RAJAONGKIR_API_KEY,
        'content-type': "application/x-www-form-urlencoded"
    }
    payload = f"origin={origin_id}&destination={destination_id}&weight={weight}&courier={courier}"
    
    try:
        response = requests.post(url, data=payload, headers=headers, verify=VERIFY_SSL, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results = []
            for item in data.get('data', []):
                results.append({
                    'service': item.get('service'),
                    'cost': item.get('cost'),
                    'etd': item.get('etd'),
                    'description': item.get('description', '')
                })
            return results
        else:
            print(f"DEBUG RajaOngkir Cost Error: {response.status_code} - {response.text}")
            return {"error": f"API Error: {response.status_code}"}
    except Exception as e:
        print(f"DEBUG RajaOngkir Cost Exception: {str(e)}")
        return {"error": str(e)}

def get_provinces():
    url = f"{RAJAONGKIR_BASE_URL}destination/province"
    headers = {'key': RAJAONGKIR_API_KEY}
    print(f"DEBUG RajaOngkir Province: Start (Key len: {len(RAJAONGKIR_API_KEY)})")
    try:
        response = requests.get(url, headers=headers, verify=VERIFY_SSL, timeout=10)
        print(f"DEBUG RajaOngkir Province Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            print(f"DEBUG RajaOngkir Province: Success, items: {len(source_data)}")
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'province_id': str(item.get('id')),
                    'province': item.get('name')
                })
            return mapped_data
        else:
            print(f"DEBUG RajaOngkir Province Error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"DEBUG RajaOngkir Province Exception: {str(e)}")
        return []

def get_cities(province_id=None):
    if not province_id:
        return []
    url = f"{RAJAONGKIR_BASE_URL}destination/city/{province_id}"
    headers = {'key': RAJAONGKIR_API_KEY}
    try:
        response = requests.get(url, headers=headers, verify=VERIFY_SSL, timeout=10)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'city_id': str(item.get('id')),
                    'city_name': item.get('name'),
                    'type': ''
                })
            return mapped_data
        else:
            return []
    except Exception as e:
        print(f"DEBUG RajaOngkir City Exception: {str(e)}")
        return []

def get_districts(city_id=None):
    if not city_id:
        return []
    url = f"{RAJAONGKIR_BASE_URL}destination/district/{city_id}"
    headers = {'key': RAJAONGKIR_API_KEY}
    try:
        response = requests.get(url, headers=headers, verify=VERIFY_SSL, timeout=10)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'district_id': str(item.get('id')),
                    'district_name': item.get('name')
                })
            return mapped_data
        else:
            return []
    except Exception as e:
        print(f"DEBUG RajaOngkir District Exception: {str(e)}")
        return []
