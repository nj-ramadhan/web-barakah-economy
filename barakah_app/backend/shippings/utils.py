import requests
import json
from django.conf import settings

RAJAONGKIR_API_KEY = getattr(settings, 'RAJAONGKIR_API_KEY', '')
# Komerce RajaOngkir Base URL
RAJAONGKIR_BASE_URL = 'https://rajaongkir.komerce.id/api/v1/'

def get_shipping_cost(origin_id, destination_id, weight, courier):
    """
    Fetch shipping cost from Komerce RajaOngkir API.
    origin_id and destination_id should be DISTRICT (Kecamatan) IDs for better accuracy.
    weight in grams.
    courier can be 'jne', 'pos', 'tiki', 'jnt', etc.
    """
    url = f"{RAJAONGKIR_BASE_URL}calculate/district/domestic-cost"
    headers = {
        'key': RAJAONGKIR_API_KEY,
        'content-type': "application/x-www-form-urlencoded"
    }
    # Komerce format: origin, destination (district IDs), weight, courier (separated by :)
    payload = f"origin={origin_id}&destination={destination_id}&weight={weight}&courier={courier}"
    
    try:
        response = requests.post(url, data=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            # The domestic-cost API for Komerce returns a list of services directly in 'data'
            # We map them to the format expected by the frontend: { service, cost, etd }
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
            print(f"Komerce RajaOngkir Cost Error: {response.status_code} - {response.text}")
            return {"error": f"API Error: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

def get_provinces():
    url = f"{RAJAONGKIR_BASE_URL}destination/province"
    headers = {'key': RAJAONGKIR_API_KEY}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            # Map Komerce keys (id, name) to Legacy names (province_id, province)
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'province_id': str(item.get('id')),
                    'province': item.get('name')
                })
            return mapped_data
        else:
            print(f"Komerce Province Error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Komerce Province Exception: {str(e)}")
        return []

def get_cities(province_id=None):
    if not province_id:
        return []
    url = f"{RAJAONGKIR_BASE_URL}destination/city/{province_id}"
    headers = {'key': RAJAONGKIR_API_KEY}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            # Map Komerce keys (id, name) to Legacy names (city_id, city_name)
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'city_id': str(item.get('id')),
                    'city_name': item.get('name'),
                    'type': '' # Komerce doesn't seem to provide separate type (Kota/Kab)
                })
            return mapped_data
        else:
            print(f"Komerce City Error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Komerce City Exception: {str(e)}")
        return []

def get_districts(city_id=None):
    if not city_id:
        return []
    url = f"{RAJAONGKIR_BASE_URL}destination/district/{city_id}"
    headers = {'key': RAJAONGKIR_API_KEY}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            source_data = data.get('data', [])
            # Map Komerce keys (id, name) to Legacy names (district_id, district_name)
            mapped_data = []
            for item in source_data:
                mapped_data.append({
                    'district_id': str(item.get('id')),
                    'district_name': item.get('name')
                })
            return mapped_data
        else:
            print(f"Komerce District Error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Komerce District Exception: {str(e)}")
        return []
