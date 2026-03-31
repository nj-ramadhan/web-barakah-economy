"""KTP OCR Service - Extract data from Indonesian ID card (KTP) images.
Uses pytesseract for OCR if available, otherwise provides a manual upload fallback.
"""
import re
import logging

logger = logging.getLogger(__name__)

# Province mapping for address extraction
PROVINCE_MAP = {
    'aceh': 'aceh', 'sumatera utara': 'sumatera_utara', 'sumatera barat': 'sumatera_barat',
    'riau': 'riau', 'jambi': 'jambi', 'sumatera selatan': 'sumatera_selatan',
    'bengkulu': 'bengkulu', 'lampung': 'lampung', 'bangka belitung': 'kepulauan_bangka_belitung',
    'kepulauan riau': 'kepulauan_riau', 'dki jakarta': 'dki_jakarta', 'jakarta': 'dki_jakarta',
    'jawa barat': 'jawa_barat', 'jawa tengah': 'jawa_tengah', 'yogyakarta': 'di_yogyakarta',
    'jawa timur': 'jawa_timur', 'banten': 'banten', 'bali': 'bali',
    'nusa tenggara barat': 'nusa_tenggara_barat', 'ntb': 'nusa_tenggara_barat',
    'nusa tenggara timur': 'nusa_tenggara_timur', 'ntt': 'nusa_tenggara_timur',
    'kalimantan barat': 'kalimantan_barat', 'kalimantan tengah': 'kalimantan_tengah',
    'kalimantan selatan': 'kalimantan_selatan', 'kalimantan timur': 'kalimantan_timur',
    'kalimantan utara': 'kalimantan_utara', 'sulawesi utara': 'sulawesi_utara',
    'sulawesi tengah': 'sulawesi_tengah', 'sulawesi selatan': 'sulawesi_selatan',
    'sulawesi tenggara': 'sulawesi_tenggara', 'gorontalo': 'gorontalo',
    'sulawesi barat': 'sulawesi_barat', 'maluku': 'maluku', 'maluku utara': 'maluku_utara',
    'papua': 'papua', 'papua barat': 'papua_barat',
}

MARITAL_MAP = {
    'belum kawin': 'bn', 'kawin': 'n', 'cerai hidup': 'd', 'cerai mati': 'j',
    'belum nikah': 'bn',
}

GENDER_MAP = {
    'laki-laki': 'l', 'laki': 'l', 'perempuan': 'p', 'wanita': 'p',
}


def parse_ktp_text(raw_text):
    """Parse raw OCR text from a KTP image into structured data."""
    text = raw_text.upper()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    result = {}

    # Try to find NIK
    for line in lines:
        nik_match = re.search(r'\d{16}', line)
        if nik_match:
            result['nik'] = nik_match.group()
            break

    # Try to find Nama
    for i, line in enumerate(lines):
        if 'NAMA' in line:
            parts = line.split(':')
            if len(parts) > 1:
                result['name_full'] = parts[-1].strip().title()
            elif i + 1 < len(lines):
                result['name_full'] = lines[i + 1].strip().title()

    # Tempat/Tgl Lahir
    for i, line in enumerate(lines):
        if 'TEMPAT' in line or 'TGL LAHIR' in line or 'LAHIR' in line:
            combined = line
            if ':' in line:
                combined = line.split(':', 1)[-1].strip()
            # Format: "KOTA, DD-MM-YYYY"
            birth_match = re.search(r'([A-Z\s]+),?\s*(\d{2}[-/]\d{2}[-/]\d{4})', combined)
            if birth_match:
                result['birth_place'] = birth_match.group(1).strip().title()
                date_str = birth_match.group(2).replace('/', '-')
                parts = date_str.split('-')
                if len(parts) == 3:
                    result['birth_date'] = f"{parts[2]}-{parts[1]}-{parts[0]}"  # YYYY-MM-DD

    # Jenis Kelamin
    for line in lines:
        for key, val in GENDER_MAP.items():
            if key.upper() in line:
                result['gender'] = val
                break

    # Status Perkawinan
    for line in lines:
        for key, val in MARITAL_MAP.items():
            if key.upper() in line:
                result['marital_status'] = val
                break

    # Alamat
    for i, line in enumerate(lines):
        if 'ALAMAT' in line:
            parts = line.split(':')
            if len(parts) > 1:
                result['address'] = parts[-1].strip().title()
            elif i + 1 < len(lines):
                result['address'] = lines[i + 1].strip().title()

    # Provinsi - check header of KTP (usually first line contains province)
    text_lower = raw_text.lower()
    for key, val in PROVINCE_MAP.items():
        if key in text_lower:
            result['address_province'] = val
            break

    return result


def extract_ktp_data(image_file):
    """Extract KTP data from an image file using Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        
        img = Image.open(image_file)
        # Use Indonesian language if available, fallback to English
        try:
            raw_text = pytesseract.image_to_string(img, lang='ind')
        except Exception:
            raw_text = pytesseract.image_to_string(img)
        
        logger.info(f"KTP OCR raw text: {raw_text}")
        
        result = parse_ktp_text(raw_text)
        result['_raw_text'] = raw_text
        result['_method'] = 'ocr'
        return result
        
    except ImportError:
        logger.warning("pytesseract not installed. Returning empty result.")
        return {
            '_error': 'OCR library (pytesseract) not available on server. Please fill in data manually.',
            '_method': 'unavailable'
        }
    except Exception as e:
        logger.error(f"KTP OCR error: {e}")
        return {
            '_error': f'Gagal membaca KTP: {str(e)}',
            '_method': 'error'
        }
