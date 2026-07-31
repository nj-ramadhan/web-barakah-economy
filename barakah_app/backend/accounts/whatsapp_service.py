# accounts/whatsapp_service.py
"""
WhatsApp messaging service - Python port of the PHP WhatsAppController reference.
Uses the go-whatsapp-web-multidevice API.
Supports GoWA v8+ Multi-device scoping via X-Device-Id header.
"""
import requests
import base64
import tempfile
import os
import logging
import uuid
import time
from django.conf import settings

logger = logging.getLogger('accounts')

# Config from settings/env with defaults from the PHP reference
WA_API_URL = getattr(settings, 'WHATSAPP_API_URL', 'https://bae.dailykas.com')
WA_API_USER = getattr(settings, 'WHATSAPP_API_USER', 'admin')
WA_API_PASS = getattr(settings, 'WHATSAPP_API_PASS', 'admin123')

_cached_device_id = None
_cached_device_id_time = 0

def get_default_device_id():
    """
    Fetch and cache active logged_in device ID for GoWA v8+ multi-device mode.
    """
    global _cached_device_id, _cached_device_id_time
    now = time.time()
    configured = getattr(settings, 'WHATSAPP_API_DEVICE_ID', None) or os.environ.get('WHATSAPP_API_DEVICE_ID')
    if configured:
        return configured

    # Cache device ID for 60 seconds
    if _cached_device_id and (now - _cached_device_id_time < 60):
        return _cached_device_id

    try:
        url = f"{WA_API_URL.rstrip('/')}/devices"
        res = requests.get(url, auth=(WA_API_USER, WA_API_PASS), timeout=10, verify=False)
        if res.status_code == 200:
            data = res.json()
            results = data.get('results', [])
            for d in results:
                if d.get('state') == 'logged_in' and d.get('id'):
                    _cached_device_id = d.get('id')
                    _cached_device_id_time = now
                    return _cached_device_id
            if results and results[0].get('id'):
                _cached_device_id = results[0].get('id')
                _cached_device_id_time = now
                return _cached_device_id
    except Exception as e:
        logger.error(f"Error fetching WA devices from {WA_API_URL}: {e}")

    return None

def get_wa_headers(device_id=None):
    headers = {}
    dev_id = device_id or get_default_device_id()
    if dev_id:
        headers['X-Device-Id'] = dev_id
    return headers

def _clean_phone_number(phone):
    if not phone: return ""
    phone_str = str(phone).strip()
    digits = ''.join(filter(str.isdigit, phone_str))
    if digits.startswith('0'):
        digits = '62' + digits[1:]
    elif digits.startswith('8'):
        digits = '62' + digits
    return digits


def send_message(phone, message, device_id=None):
    """Send a text message via WhatsApp API."""
    phone = _clean_phone_number(phone)
    if not phone:
        return {'success': False, 'message': 'No HP kosong/tidak valid'}

    api_url = f"{WA_API_URL.rstrip('/')}/send/message"
    payload = {
        'phone': phone,
        'message': message
    }
    headers = get_wa_headers(device_id)

    try:
        response = requests.post(
            api_url,
            json=payload,
            auth=(WA_API_USER, WA_API_PASS),
            headers=headers,
            timeout=30,
            verify=False
        )
        
        logger.info(f"WA Text Response to {phone}: {response.status_code}")

        if 200 <= response.status_code < 300:
            return {
                'success': True,
                'message': 'Pesan WhatsApp berhasil dikirim',
                'data': {
                    'mode': 'text',
                    'api_response': response.json() if response.text else None
                }
            }
        else:
            err_msg = response.json().get('message') if response.text else f"HTTP {response.status_code}"
            logger.warning(f"WA Text send failed for {phone}: {err_msg}")
            return {
                'success': False,
                'message': f'Gagal mengirim pesan WhatsApp: {err_msg}',
                'data': {
                    'mode': 'text',
                    'http_code': response.status_code,
                    'api_response': response.json() if response.text else None
                }
            }
    except requests.exceptions.RequestException as e:
        logger.error(f"WhatsApp send_message error: {e}")
        return {
            'success': False,
            'message': f'Gagal mengirim pesan WhatsApp: {str(e)}'
        }


def send_file(phone, caption, file_data_base64, filename='document.pdf', device_id=None):
    """Send a file via WhatsApp API from base64 data."""
    if not phone:
        return {'success': False, 'message': 'No HP kosong'}

    try:
        mime_type = 'application/pdf'
        if ',' in file_data_base64:
            header, payload = file_data_base64.split(',', 1)
            try:
                mime_type = header.split(':')[1].split(';')[0]
            except Exception: pass
        else:
            payload = file_data_base64

        payload = payload.replace(' ', '+')
        file_decoded = base64.b64decode(payload)
        if len(file_decoded) < 10:
            return {'success': False, 'message': 'Gagal decode file (terlalu kecil)'}

        temp_filename = f"wa_{uuid.uuid4().hex}_{filename}"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        with open(temp_path, 'wb') as f:
            f.write(file_decoded)

        result = _send_file_internal(phone, caption, temp_path, filename, mime_type, device_id=device_id)

        if os.path.exists(temp_path):
            os.unlink(temp_path)

        return result

    except Exception as e:
        logger.error(f"WhatsApp send_file error: {e}")
        return {
            'success': False,
            'message': f'Gagal mengirim file WhatsApp: {str(e)}'
        }


def _send_file_internal(phone, caption, file_path, filename, mime_type, device_id=None):
    """Internal helper to send a file from a local path."""
    phone = _clean_phone_number(phone)
    if not phone:
        return {'success': False, 'message': 'No HP kosong/tidak valid'}

    is_image = mime_type.startswith('image/')
    endpoint = "image" if is_image else "file"
    api_url = f"{WA_API_URL.rstrip('/')}/send/{endpoint}"
    headers = get_wa_headers(device_id)

    try:
        with open(file_path, 'rb') as f:
            field_name = 'image' if is_image else 'file'
            files = {field_name: (filename, f, mime_type)}
            data = {'phone': phone, 'caption': caption}
            
            response = requests.post(
                api_url,
                data=data,
                files=files,
                auth=(WA_API_USER, WA_API_PASS),
                headers=headers,
                timeout=45,
                verify=False
            )
        
        logger.info(f"WA {endpoint.capitalize()} Response to {phone} ({mime_type}): {response.status_code}")

        if 200 <= response.status_code < 300:
            return {
                'success': True,
                'data': {
                    'mode': endpoint,
                    'mime': mime_type,
                    'api_response': response.json() if response.text else None
                }
            }
        else:
            err_msg = response.json().get('message') if response.text else f"HTTP {response.status_code}"
            logger.warning(f"WA {endpoint} send failed ({err_msg}, MIME: {mime_type})")
            return {
                'success': False,
                'message': f"Gagal kirim {endpoint} ({err_msg})"
            }

    except Exception as e:
        logger.error(f"WhatsApp _send_file_internal error: {e}")
        return {'success': False, 'message': f'Internal error sending {endpoint}: {str(e)}'}


def blast_messages(phone_list, message_template, placeholder_data_list=None, file_data_base64=None, filename='image.jpg', use_queue=True, delay_seconds=5.0, created_by_user_id=None, device_id=None):
    """
    Send WhatsApp messages to multiple recipients efficiently via background queue by default.
    """
    if use_queue:
        from barakah_app.blast_queue import enqueue_whatsapp_blast
        return enqueue_whatsapp_blast(
            phone_list=phone_list,
            message_template=message_template,
            placeholder_data_list=placeholder_data_list,
            file_data_base64=file_data_base64,
            filename=filename,
            delay_seconds=delay_seconds,
            created_by_user_id=created_by_user_id,
            device_id=device_id
        )

    results = {'total': len(phone_list), 'success': 0, 'failed': 0, 'details': []}
    
    file_info = None
    if file_data_base64:
        try:
            mime_type = 'application/pdf'
            if ',' in file_data_base64:
                header, payload = file_data_base64.split(',', 1)
                try:
                    mime_type = header.split(':')[1].split(';')[0]
                except Exception: pass
            else:
                payload = file_data_base64
            
            payload = payload.replace(' ', '+')
            file_decoded = base64.b64decode(payload)
            
            if len(file_decoded) > 10:
                temp_filename = f"blast_{uuid.uuid4().hex}_{filename}"
                temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
                with open(temp_path, 'wb') as f:
                    f.write(file_decoded)
                
                file_info = {
                    'path': temp_path,
                    'mime': mime_type,
                    'filename': filename
                }
        except Exception as e:
            logger.error(f"Blast file preparation error: {e}")

    try:
        for i, phone in enumerate(phone_list):
            msg = message_template
            if placeholder_data_list and i < len(placeholder_data_list):
                data = placeholder_data_list[i]
                for key, value in data.items():
                    msg = msg.replace(f'{{{key}}}', str(value or ''))

            if file_info:
                result = _send_file_internal(phone, msg, file_info['path'], file_info['filename'], file_info['mime'], device_id=device_id)
            elif file_data_base64:
                result = send_file(phone, msg, file_data_base64, filename, device_id=device_id)
            else:
                result = send_message(phone, msg, device_id=device_id)
                
            if result.get('success'):
                results['success'] += 1
            else:
                results['failed'] += 1
            results['details'].append({
                'phone': phone,
                'success': result.get('success', False),
                'message': result.get('message', '')
            })
    finally:
        if file_info and os.path.exists(file_info['path']):
            try:
                os.unlink(file_info['path'])
            except Exception: pass

    return results
