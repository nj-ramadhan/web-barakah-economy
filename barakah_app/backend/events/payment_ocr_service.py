"""Payment OCR Service - Extract data from bank transfer receipts using AI Vision."""
import base64
import json
import logging
import requests

logger = logging.getLogger(__name__)

def encode_image(image_file):
    """Encodes an image to base64 string safely."""
    if hasattr(image_file, 'read'):
        return base64.b64encode(image_file.read()).decode('utf-8')
    with open(image_file, "rb") as image:
        return base64.b64encode(image.read()).decode('utf-8')

def extract_payment_data(image_file):
    """Extract payment receipt data from an image using AI Vision."""
    from chat.models import AISettings
    
    settings = AISettings.objects.first()
    if not settings or not settings.is_enabled or not settings.api_key:
        logger.warning("AI Settings not configured or disabled.")
        return {'_error': 'Sistem AI belum dikonfigurasi atau tidak aktif di pengaturan admin.', '_method': 'error'}
        
    base64_image = encode_image(image_file)
    
    # Reset file pointer
    if hasattr(image_file, 'seek'):
        image_file.seek(0)
        
    mime_type = "image/jpeg"
    if hasattr(image_file, 'content_type'):
        mime_type = image_file.content_type

    prompt = """
Tolong baca data dari bukti transfer ini dan kembalikan dalam format JSON.
Field:
- "recipient_name": Nama penerima (harus BAE Community / Deny Setiawan)
- "amount": Nominal angka tanpa pemisah
- "bank_name": Nama bank
- "date": Tanggal

Aturan Khusus:
1. Kembalikan JSON murni.
2. Jika tidak terbaca, gunakan null atau string kosong.
"""

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_image}"
                    }
                }
            ]
        }
    ]

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.api_key}"
    }

    data = {
        "model": settings.model_name,
        "messages": messages,
        "max_tokens": 500,
        "temperature": 0.0
    }

    try:
        base_url = settings.base_url.rstrip('/')
        logger.info(f"Extracting Payment Receipt using AI: {settings.model_name}")
        response = requests.post(f"{base_url}/chat/completions", headers=headers, json=data, timeout=45)
        
        if response.status_code != 200:
            logger.error(f"AI API Error (Payment Receipt): {response.text}")
            return {'_error': f"AI menolak request (HTTP {response.status_code}). Silakan coba sesaat lagi.", '_method': 'error'}
            
        result = response.json()
        ai_reply = result['choices'][0]['message']['content'].strip()
        
        # Clean up possible markdown code blocks
        if ai_reply.startswith('```json'):
            ai_reply = ai_reply[7:]
        elif ai_reply.startswith('```'):
            ai_reply = ai_reply[3:]
            
        if ai_reply.endswith('```'):
            ai_reply = ai_reply[:-3]
            
        ai_reply = ai_reply.strip()
        
        parsed_data = json.loads(ai_reply)
        parsed_data['_method'] = 'ai_ocr'
        return parsed_data
        
    except Exception as e:
        logger.error(f"Error during Payment Receipt AI: {e}")
        return {'_error': f"Gagal membaca bukti transfer: {str(e)}", '_method': 'error'}
