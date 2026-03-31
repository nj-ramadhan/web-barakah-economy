"""KTP OCR Service - Extract data from Indonesian ID card (KTP) images using AI Default Settings."""
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

def extract_ktp_data(image_file):
    """Extract KTP data from an image using the platform's default Generative AI Vision model."""
    from chat.models import AISettings
    
    settings = AISettings.objects.first()
    if not settings or not settings.is_enabled or not settings.api_key:
        logger.warning("AI Settings not configured or disabled.")
        return {'_error': 'Sistem AI belum dikonfigurasi atau tidak aktif di pengaturan admin.', '_method': 'error'}
        
    base64_image = encode_image(image_file)
    
    # Reset file pointer just in case it's used again later by Django to save the image
    if hasattr(image_file, 'seek'):
        image_file.seek(0)
        
    mime_type = "image/jpeg"
    if hasattr(image_file, 'content_type'):
        mime_type = image_file.content_type

    prompt = """
Anda adalah asisten data entry akurat (OCR AI) yang bertugas mengekstrak data dari pindaian Kartu Tanda Penduduk (KTP) Indonesia.
Tolong baca KTP tersebut dan kembalikan data HANYA dalam format JSON murni yang valid, tanpa tambahan teks apapun di luar { }.

Struktur Field Wajib:
- "nik": (String, tepat 16 digit angka NIK, abaikan jika ada spasi)
- "name_full": (String, Nama Lengkap menggunakan Title Case)
- "birth_place": (String, Tempat Lahir menggunakan Title Case, nama kota/kabupaten saja)
- "birth_date": (String, Tanggal Lahir HANYA dengan format "YYYY-MM-DD", misal "1999-12-05")
- "gender": (String, "l" jika Laki-Laki, "p" jika Perempuan / Wanita)
- "address": (String, Jalan / Alamat lengkap dengan Title Case)
- "address_province": (String, Nama Provinsi sesuaikan dengan slug ini: misal "jawa_barat", "dki_jakarta", "jawa_tengah", "jawa_timur", "banten", "bali", "sumatera_selatan", "sumatera_utara", "nusa_tenggara_barat", dll. Format harus *snake_case*)
- "marital_status": (String, Gunakan kode ini: "bn" jika Belum Kawin, "n" jika Kawin/Sudah Nikah, "d" jika Cerai Hidup, "j" jika Cerai Mati)

Aturan:
1. Jika sebuah field sama sekali tidak terbaca/kabur, isikan *value* dengan *string* kosong "".
2. JANGAN MEMAKAI MARKDOWN BLOCK ```json atau ```. Pastikan jawaban berawal dari { dan berakhir dengan }.
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
        logger.info(f"Extracting KTP using AI: {settings.model_name}")
        response = requests.post(f"{base_url}/chat/completions", headers=headers, json=data, timeout=45)
        
        if response.status_code != 200:
            logger.error(f"AI API Error (KTP): {response.text}")
            return {'_error': f"AI menolak request (HTTP {response.status_code}). Silakan coba sesaat lagi.", '_method': 'error'}
            
        response.raise_for_status()
        
        result = response.json()
        ai_reply = result['choices'][0]['message']['content'].strip()
        
        # Clean up possible markdown code blocks that AI generates despite instruction
        if ai_reply.startswith('```json'):
            ai_reply = ai_reply[7:]
        elif ai_reply.startswith('```'):
            ai_reply = ai_reply[3:]
            
        if ai_reply.endswith('```'):
            ai_reply = ai_reply[:-3]
            
        ai_reply = ai_reply.strip()
        
        parsed_data = json.loads(ai_reply)
        parsed_data['_method'] = 'ai_ocr'
        parsed_data['_raw_text'] = 'AI Vision Extraction'
        return parsed_data
        
    except requests.exceptions.RequestException as e:
        logger.error(f"AI KTP Vision Exception: {e}")
        return {'_error': f"Gagal menghubungi server AI: Pastikan layanan AI menyala.", '_method': 'error'}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI KTP JSON: {ai_reply}")
        return {'_error': "AI mengembalikan format data yang salah, silakan ulangi scan.", '_method': 'error'}
    except Exception as e:
        logger.error(f"Unexpected Error during KTP AI: {e}")
        return {'_error': f"Kesalahan Sistem: {str(e)}", '_method': 'error'}
