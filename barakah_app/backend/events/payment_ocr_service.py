"""Payment OCR Service - Extract data from bank transfer receipts using AI Vision."""
import base64
import json
import logging
import requests

logger = logging.getLogger(__name__)

def compress_image(image_file, max_size=(1024, 1024), quality=80):
    """Resizes and compresses the image to JPEG to reduce payload size and standardize format."""
    try:
        from PIL import Image
        import io
        
        # Reset file pointer
        if hasattr(image_file, 'seek'):
            image_file.seek(0)
            
        img = Image.open(image_file)
        
        # Convert to RGB (JPEG does not support RGBA)
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            background = Image.new("RGB", img.size, (255, 255, 255))
            mask = img.split()[3] if img.mode == 'RGBA' else None
            background.paste(img, mask=mask)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
            
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality)
        output.seek(0)
        return output, "image/jpeg"
    except Exception as e:
        logger.error(f"Failed to compress image: {e}")
        if hasattr(image_file, 'seek'):
            image_file.seek(0)
        
        mime_type = "image/jpeg"
        if hasattr(image_file, 'content_type'):
            mime_type = image_file.content_type
        return image_file, mime_type

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
        
    # Standardize format and compress image to reduce payload size
    compressed_file, mime_type = compress_image(image_file)
    
    # Encode compressed image
    base64_image = base64.b64encode(compressed_file.read()).decode('utf-8')
    
    # Reset file pointer of original image
    if hasattr(image_file, 'seek'):
        image_file.seek(0)
        
    prompt = """
Tolong baca data dari bukti transfer ini dan kembalikan dalam format JSON.
Field:
- "recipient_name": Nama penerima (harus BAE Community / Barakah Economy Community)
- "amount": Nominal angka murni (tanpa titik pemisah ribuan). Penting: ABAIKAN nilai desimal atau dua angka nol di belakang koma jika ada (contoh: Rp50.000,00 menjadi "50000").
- "bank_name": Nama bank
- "date": Tanggal

Aturan Khusus:
1. Kembalikan JSON murni tanpa markdown.
2. Jika tidak terbaca atau gambar bukan merupakan bukti transfer bank / QRIS yang valid, isi semua field dengan null.
3. Untuk "amount", pastikan benar-benar membuang ,00 di belakang koma.
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
            try:
                err_detail = response.json().get('error', {}).get('message', response.text)
            except:
                err_detail = response.text
            return {'_error': f"AI menolak request (HTTP {response.status_code}): {err_detail}", '_method': 'error'}
            
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
