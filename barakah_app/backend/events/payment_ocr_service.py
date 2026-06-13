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
- "recipient_name": Nama penerima (biasanya BAE Community, Barakah Economy Community, atau Deny Setiawan)
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

def extract_payment_data_via_ocr(image_file, expected_amount):
    """Fallback OCR method using local pytesseract or OCR.space API when AI Vision is down/fails."""
    import re
    
    ocr_text = ""
    
    # 1. Try local pytesseract first (if installed and configured)
    try:
        import pytesseract
        from PIL import Image
        
        if hasattr(image_file, 'seek'):
            image_file.seek(0)
            
        img = Image.open(image_file)
        ocr_text = pytesseract.image_to_string(img, lang='ind')
        logger.info("Local pytesseract OCR extraction succeeded.")
    except Exception as e:
        logger.warning(f"Local pytesseract failed or not installed, trying ocr.space: {e}")
        
    # 2. Try ocr.space if pytesseract didn't return text
    if not ocr_text.strip():
        try:
            # Compress and convert to JPEG to ensure it fits size limits and is standard
            compressed_file, mime_type = compress_image(image_file)
            
            payload = {
                'apikey': 'helloworld',
                'language': 'eng',
                'isOverlayRequired': False,
            }
            
            files = {
                'file': ('receipt.jpg', compressed_file.read(), 'image/jpeg')
            }
            
            response = requests.post(
                'https://api.ocr.space/parse/image',
                files=files,
                data=payload,
                timeout=20
            )
            
            if response.status_code == 200:
                result = response.json()
                if not result.get('IsErroredOnProcessing', False):
                    parsed_results = result.get('ParsedResults', [])
                    if parsed_results:
                        ocr_text = parsed_results[0].get('ParsedText', '')
                        logger.info("OCR.space API extraction succeeded.")
                else:
                    err_msg = result.get('ErrorMessage', 'Unknown error')
                    logger.error(f"OCR.space API processed with error: {result}")
                    return {'_error': f"OCR.space processing error: {err_msg}", '_method': 'error'}
            else:
                logger.error(f"OCR.space API HTTP error: {response.status_code}")
                return {'_error': f"OCR.space HTTP error {response.status_code}", '_method': 'error'}
        except Exception as e:
            logger.error(f"OCR.space API call exception: {e}")
            return {'_error': f"OCR.space connection error: {str(e)}", '_method': 'error'}
            
    # Reset image file pointer
    if hasattr(image_file, 'seek'):
        image_file.seek(0)
        
    if not ocr_text.strip():
        return {'_error': 'Gagal melakukan OCR. Bukti pembayaran tidak dapat diekstraksi.', '_method': 'error'}
        
    # Parse the text according to validation rules
    text_lower = ocr_text.lower()
    
    recipient_name = None
    if "barakah economy" in text_lower or "bae community" in text_lower or "deny setiawan" in text_lower:
        recipient_name = "Barakah Economy Community"
    else:
        recipient_name = "Tidak terdeteksi"
        
    amount = None
    try:
        expected_amount_int = int(float(expected_amount))
        expected_amount_str = str(expected_amount_int)
        
        # Normalize letters 'O' and 'o' to digit '0' in a copy of ocr_text for numerical comparison.
        # This fixes OCR issues where zeros are misread as 'O' or 'o' (e.g. Rp20.OOO or Rp20.ooo).
        normalized_ocr_text = ocr_text.replace('O', '0').replace('o', '0')
        scrubbed_text = re.sub(r'(?i)rp|[\.,\s]', '', normalized_ocr_text)
        
        formatted_dots = f"{expected_amount_int:,}".replace(",", ".")
        formatted_commas = f"{expected_amount_int:,}"
        
        if (expected_amount_str in normalized_ocr_text or 
            formatted_dots in normalized_ocr_text or 
            formatted_commas in normalized_ocr_text or 
            expected_amount_str in scrubbed_text):
            amount = expected_amount_int
    except Exception as e:
        logger.error(f"Error parsing amount in OCR fallback: {e}")
        
    return {
        'recipient_name': recipient_name,
        'amount': amount,
        'bank_name': 'Detected via OCR Fallback',
        'date': None,
        '_method': 'ocr_fallback',
        '_raw_text': ocr_text
    }
