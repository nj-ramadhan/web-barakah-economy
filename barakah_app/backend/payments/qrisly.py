import requests
import json
from django.conf import settings

QRISLY_API_KEY = getattr(settings, 'QRISLY_API_KEY', '')
BASE_URL = "https://api.collaborator.komerce.id/user"

def generate_dynamic_qris(amount, order_id=None):
    """
    Generate dynamic QRIS using Qrisly API.
    Note: Requires a static qris_id. 
    If not provided, this might fail or we might need to fetch a default one.
    """
    if not QRISLY_API_KEY:
        return {"error": "QRISLY_API_KEY not configured"}

    # Placeholder for qris_id. 
    # NOTE: User needs to provide this or we need an admin setting for it.
    QRIS_ID = getattr(settings, 'QRISLY_STATIC_ID', '') 
    
    if not QRIS_ID:
        return {"error": "QRISLY_STATIC_ID (Static QRIS ID) not configured in settings"}

    url = f"{BASE_URL}/api/v1/qrisly/generate-qris"
    headers = {
        "X-API-Key": QRISLY_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "qris_id": QRIS_ID,
        "amount": int(amount),
        "output_type": "string", # returns QR string payload
        "unique_amount": True
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Qrisly API Error: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"error": str(e)}

def check_qris_payment_status(history_id):
    if not QRISLY_API_KEY:
        return {"error": "QRISLY_API_KEY not configured"}

    url = f"{BASE_URL}/api/v1/qrisly/payment-status/{history_id}"
    headers = {
        "X-API-Key": QRISLY_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers)
        return response.json()
    except Exception as e:
        return {"error": str(e)}
