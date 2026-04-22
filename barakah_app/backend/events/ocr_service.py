"""Payment Proof OCR Service - Extract data from bank transfer proof images using AI."""
import base64
import json
import logging
import requests
from decimal import Decimal
import re

logger = logging.getLogger(__name__)

def encode_image(image_file):
    """Encodes an image to base64 string safely."""
    if hasattr(image_file, 'read'):
        return base64.b64encode(image_file.read()).decode('utf-8')
    with open(image_file, "rb") as image:
        return base64.b64encode(image.read()).decode('utf-8')

def extract_payment_proof_data(image_file, expected_amount=None):
    """
    Extract payment data from a transfer proof image using AI.
    Validates recipient and amount if expected_amount is provided.
    """
    from chat.models import AISettings
    
    settings = AISettings.objects.first()
    if not settings or not settings.is_enabled or not settings.api_key:
        logger.warning("AI Settings not configured or disabled.")
        return {'_error': 'Sistem verifikasi AI belum aktif.', '_method': 'error'}
        
    base64_image = encode_image(image_file)
    
    # Reset file pointer
    if hasattr(image_file, 'seek'):
        image_file.seek(0)
        
    mime_type = "image/jpeg"
    if hasattr(image_file, 'content_type'):
        mime_type = image_file.content_type

    from django.utils import timezone
    today = timezone.localtime(timezone.now())
    today_str = today.strftime("%d %B %Y")

    prompt = f"""
Anda adalah asisten verifikasi transaksi keuangan Barakah Economy (BAE).
Tugas Anda adalah memverifikasi bukti transfer bank (Mobile Banking / Struk ATM / QRIS).

Tolong ekstrak data berikut dan kembalikan HANYA dalam format JSON murni:
- "recipient_name": Nama penerima uang.
- "amount": Total nilai uang yang ditransfer (Hanya angka).
- "transaction_date": Tanggal transaksi yang tertera di bukti. Kenali berbagai kemungkinan format (DD-MM-YYYY, YYYY-MM-DD, atau MM-DD-YYYY) dan normalisasikan ke format YYYY-MM-DD.
- "is_to_bae": Apakah penerima adalah "BAE Community" atau "Barakah App Economy"? (Boolean)

Tanggal Hari Ini: {today_str}

Aturan Verifikasi:
1. Penerima HARUS mengandung kata "BAE Community" atau "Barakah App Economy".
2. Pastikan nominal transfer di gambar COCOK dengan target nominal: Rp {expected_amount:,.0f}
3. TANGGAL TRANSAKSI: Periksa apakah tanggal di bukti transfer adalah HARI INI ({today_str}) atau MAKSIMAL 1 hari sebelumnya. AI harus cerdas mengenali urutan hari, bulan, dan tahun pada berbagai format bukti transfer bank. Isikan true pada "date_match" jika sesuai.

Format JSON:
{{
  "recipient_name": "string",
  "amount": number,
  "transaction_date": "YYYY-MM-DD",
  "is_to_bae": boolean,
  "date_match": boolean
}}
"""

    messages = [
        {{
            "role": "user",
            "content": [
                {{"type": "text", "text": prompt}},
                {{
                    "type": "image_url",
                    "image_url": {{
                        "url": f"data:{mime_type};base64,{base64_image}"
                    }}
                }}
            ]
        }}
    ]

    headers = {{
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.api_key}"
    }}

    data = {{
        "model": settings.model_name,
        "messages": messages,
        "max_tokens": 300,
        "temperature": 0.0
    }}

    try:
        base_url = settings.base_url.rstrip('/')
        response = requests.post(f"{{base_url}}/chat/completions", headers=headers, json=data, timeout=45)
        
        if response.status_code != 200:
            logger.error(f"AI API Error (Payment): {{response.text}}")
            return {'_error': "Gagal menghubungi server verifikasi.", '_method': 'error'}
            
        result = response.json()
        ai_reply = result['choices'][0]['message']['content'].strip()
        
        # Clean up markdown
        if ai_reply.startswith('```json'): ai_reply = ai_reply[7:]
        elif ai_reply.startswith('```'): ai_reply = ai_reply[3:]
        if ai_reply.endswith('```'): ai_reply = ai_reply[:-3]
        
        parsed_data = json.loads(ai_reply.strip())
        
        # Additional validation logic in Python for robustness
        detected_amount = Decimal(str(parsed_data.get('amount', 0)))
        parsed_data['amount_match'] = False
        
        if expected_amount is not None:
            # Check if amount matches (allow small difference)
            if abs(detected_amount - Decimal(str(expected_amount))) < 5: # Allow small tolerance for rounding
                parsed_data['amount_match'] = True
        
        # Ensure date_match exists
        if 'date_match' not in parsed_data:
            parsed_data['date_match'] = False
            
        return parsed_data
        
    except Exception as e:
        logger.error(f"Error in Payment OCR: {{e}}")
        return {'_error': "Gagal memproses bukti transfer. Pastikan gambar jelas.", '_method': 'error'}
