import requests
import json
from django.conf import settings

RAJAONGKIR_API_KEY = getattr(settings, 'RAJAONGKIR_API_KEY', 'yVPaNLQjd2d58e2c739ff193MuU0gbTJ')
RAJAONGKIR_BASE_URL = getattr(settings, 'RAJAONGKIR_BASE_URL', 'https://api.rajaongkir.com/starter/')

def get_shipping_cost(origin_id, destination_id, weight, courier):
    """
    Fetch shipping cost from RajaOngkir API.
    Origin and destination are typically City IDs in Starter Tier.
    weight in grams.
    courier can be 'jne', 'pos', 'tiki'.
    """
    url = f"{RAJAONGKIR_BASE_URL}cost"
    headers = {
        'key': RAJAONGKIR_API_KEY,
        'content-type': "application/x-www-form-urlencoded"
    }
    payload = f"origin={origin_id}&destination={destination_id}&weight={weight}&courier={courier}"
    
    try:
        response = requests.request("POST", url, data=payload, headers=headers)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_provinces():
    url = f"{RAJAONGKIR_BASE_URL}province"
    headers = {'key': RAJAONGKIR_API_KEY}
    try:
        response = requests.request("GET", url, headers=headers)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_cities(province_id=None):
    url = f"{RAJAONGKIR_BASE_URL}city"
    if province_id:
        url += f"?province={province_id}"
    headers = {'key': RAJAONGKIR_API_KEY}
    try:
        response = requests.request("GET", url, headers=headers)
        return response.json()
    except Exception as e:
        return {"error": str(e)}
