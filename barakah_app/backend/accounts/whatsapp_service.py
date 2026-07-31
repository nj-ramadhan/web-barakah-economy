# accounts/whatsapp_service.py
"""
WhatsApp messaging service - Python port of the PHP WhatsAppController reference.
Uses the go-whatsapp-web-multidevice API.
Supports GoWA v8+ Multi-device scoping via X-Device-Id header with automatic multi-device fallback.
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

_cached_device_ids = []
_cached_device_time = 0


def get_logged_in_device_ids():
    """
    Fetch and cache all active logged_in device IDs for GoWA v8+ multi-device mode,
    sorted newest first so the most recently connected device is prioritized.
    """
    global _cached_device_ids, _cached_device_time
    now = time.time()
    configured = getattr(settings, 'WHATSAPP_API_DEVICE_ID', None) or os.environ.get('WHATSAPP_API_DEVICE_ID')
    if configured:
        return [configured]

    # Cache device IDs for 30 seconds
    if _cached_device_ids and (now - _cached_device_time < 30):
        return _cached_device_ids

    try:
        url = f"{WA_API_URL.rstrip('/')}/devices"
        res = requests.get(url, auth=(WA_API_USER, WA_API_PASS), timeout=10, verify=False)
        if res.status_code == 200:
            data = res.json()
            results = data.get('results', [])
            logged_in = [d for d in results if d.get('state') == 'logged_in' and d.get('id')]
            # Sort newest first based on created_at
            logged_in.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            device_ids = [d.get('id') for d in logged_in]
            if not device_ids and results and results[0].get('id'):
                device_ids = [results[0].get('id')]
            
            _cached_device_ids = device_ids
            _cached_device_time = now
            return _cached_device_ids
    except Exception as e:
        logger.error(f"Error fetching WA devices from {WA_API_URL}: {e}")

    return _cached_device_ids or []


def get_default_device_id():
    devices = get_logged_in_device_ids()
    return devices[0] if devices else None


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
    """Send a text message via WhatsApp API with automatic multi-device fallback."""
    phone = _clean_phone_number(phone)
    if not phone:
        return {'success': False, 'message': 'No HP kosong/tidak valid'}

    api_url = f"{WA_API_URL.rstrip('/')}/send/message"
    payload = {
        'phone': phone,
        'message': message
    }

    device_candidates = [device_id] if device_id else get_logged_in_device_ids()
    if not device_candidates:
        device_candidates = [None]

    last_error = "Unknown error"
    for dev_id in device_candidates:
        headers = {}
        if dev_id:
            headers['X-Device-Id'] = dev_id

        try:
            response = requests.post(
                api_url,
                json=payload,
                auth=(WA_API_USER, WA_API_PASS),
                headers=headers,
                timeout=30,
                verify=False
            )
            
            logger.info(f"WA Text Response to {phone} (Device {dev_id}): {response.status_code}")

            if 200 <= response.status_code < 300:
                return {
                    'success': True,
                    'message': 'Pesan WhatsApp berhasil dikirim',
                    'data': {
                        'mode': 'text',
                        'device_id': dev_id,
                        'api_response': response.json() if response.text else None
                    }
                }
            
            err_json = response.json() if response.text else {}
            err_code = err_json.get('code', '')
            err_msg = err_json.get('message', f"HTTP {response.status_code}")
            last_error = err_msg

            # If rejected with timelock or device required error, try fallback to next candidate
            if err_code in ['WA_REACHOUT_TIMELOCK', 'DEVICE_ID_REQUIRED'] or 'timelock' in err_msg.lower():
                logger.warning(f"Device {dev_id} hit {err_code} for {phone}, trying fallback device...")
                continue
            else:
                return {
                    'success': False,
                    'message': f'Gagal mengirim pesan WhatsApp: {err_msg}',
                    'data': {'mode': 'text', 'http_code': response.status_code, 'api_response': err_json}
                }
        except requests.exceptions.RequestException as e:
            last_error = str(e)
            logger.error(f"WhatsApp send_message error on device {dev_id}: {e}")

    return {
        'success': False,
        'message': f'Gagal mengirim pesan WhatsApp: {last_error}'
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
    """Internal helper to send a file from a local path with automatic fallback."""
    phone = _clean_phone_number(phone)
    if not phone:
        return {'success': False, 'message': 'No HP kosong/tidak valid'}

    is_image = mime_type.startswith('image/')
    endpoint = "image" if is_image else "file"
    api_url = f"{WA_API_URL.rstrip('/')}/send/{endpoint}"

    device_candidates = [device_id] if device_id else get_logged_in_device_ids()
    if not device_candidates:
        device_candidates = [None]

    last_error = "Unknown error"
    for dev_id in device_candidates:
        headers = {}
        if dev_id:
            headers['X-Device-Id'] = dev_id

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
            
            logger.info(f"WA {endpoint.capitalize()} Response to {phone} (Device {dev_id}): {response.status_code}")

            if 200 <= response.status_code < 300:
                return {
                    'success': True,
                    'data': {
                        'mode': endpoint,
                        'mime': mime_type,
                        'device_id': dev_id,
                        'api_response': response.json() if response.text else None
                    }
                }
            
            err_json = response.json() if response.text else {}
            err_code = err_json.get('code', '')
            err_msg = err_json.get('message', f"HTTP {response.status_code}")
            last_error = err_msg

            if err_code in ['WA_REACHOUT_TIMELOCK', 'DEVICE_ID_REQUIRED'] or 'timelock' in err_msg.lower():
                logger.warning(f"Device {dev_id} hit {err_code} for {phone} file send, trying fallback device...")
                continue
            else:
                return {
                    'success': False,
                    'message': f"Gagal kirim {endpoint} ({err_msg})"
                }

        except Exception as e:
            last_error = str(e)
            logger.error(f"WhatsApp _send_file_internal error on device {dev_id}: {e}")

    return {'success': False, 'message': f'Internal error sending {endpoint}: {last_error}'}


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
