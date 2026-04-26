# accounts/whatsapp_service.py
"""
WhatsApp messaging service - Python port of the PHP WhatsAppController reference.
Uses the go-whatsapp-web-multidevice API.
"""
import requests
import base64
import tempfile
import os
import logging
from django.conf import settings

logger = logging.getLogger('accounts')

# Config from settings/env with defaults from the PHP reference
WA_API_URL = getattr(settings, 'WHATSAPP_API_URL', 
    'http://notif-gowhatsappwebmultidevice-23d189-159-65-58-54.traefik.me')
WA_API_USER = getattr(settings, 'WHATSAPP_API_USER', 'admin')
WA_API_PASS = getattr(settings, 'WHATSAPP_API_PASS', 'reh1sspkbdgul0ebtax6vwxjqnzhzek7')


def send_message(phone, message):
    """Send a text message via WhatsApp API."""
    if not phone:
        return {'success': False, 'message': 'No HP kosong'}

    api_url = f"{WA_API_URL}/send/message"
    payload = {
        'phone': phone,
        'message': message
    }

    try:
        response = requests.post(
            api_url,
            json=payload,
            auth=(WA_API_USER, WA_API_PASS),
            timeout=30,
            verify=False
        )

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
            return {
                'success': False,
                'message': f'Gagal mengirim pesan WhatsApp. HTTP {response.status_code}',
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


def send_file(phone, caption, file_data_base64, filename='document.pdf'):
    """Send a file via WhatsApp API."""
    if not phone:
        return {'success': False, 'message': 'No HP kosong'}

    api_url = f"{WA_API_URL}/send/file"

    try:
        # Separate header from base64 data
        if ',' in file_data_base64:
            payload = file_data_base64.split(',')[1]
        else:
            payload = file_data_base64

        # Fix spaces
        payload = payload.replace(' ', '+')

        # Decode base64
        file_decoded = base64.b64decode(payload)
        if len(file_decoded) < 100:
            return {'success': False, 'message': 'Gagal decode file'}

        # Save to temp file
        temp_path = os.path.join(tempfile.gettempdir(), f'wa_{filename}')
        with open(temp_path, 'wb') as f:
            f.write(file_decoded)

        # Send via multipart
        with open(temp_path, 'rb') as f:
            files = {'file': (filename, f, 'application/pdf')}
            data = {'phone': phone, 'caption': caption}
            
            response = requests.post(
                api_url,
                data=data,
                files=files,
                auth=(WA_API_USER, WA_API_PASS),
                timeout=45,
                verify=False
            )

        # Cleanup
        if os.path.exists(temp_path):
            os.unlink(temp_path)

        if 200 <= response.status_code < 300:
            return {
                'success': True,
                'data': {
                    'mode': 'file',
                    'api_response': response.json() if response.text else None
                }
            }
        else:
            # Fallback to text message
            logger.warning(f"WA file send failed (HTTP {response.status_code}), falling back to text")
            fallback_msg = f"{caption}\n\n*[System]* Gagal lampirkan file."
            return send_message(phone, fallback_msg)

    except Exception as e:
        logger.error(f"WhatsApp send_file error: {e}")
        return {
            'success': False,
            'message': f'Gagal mengirim file WhatsApp: {str(e)}'
        }


def blast_messages(phone_list, message_template, placeholder_data_list=None, file_data_base64=None, filename='image.jpg'):
    """
    Send WhatsApp messages to multiple recipients.
    
    Args:
        phone_list: list of phone numbers
        message_template: message string with optional placeholders like {name}, {username}
        placeholder_data_list: list of dicts with placeholder values per recipient
        file_data_base64: Optional base64 encoded file data to send as attachment
        filename: Optional filename for the attachment
    
    Returns:
        dict with success/fail counts and details
    """
    results = {'total': len(phone_list), 'success': 0, 'failed': 0, 'details': []}

    for i, phone in enumerate(phone_list):
        # Replace placeholders if data provided
        msg = message_template
        if placeholder_data_list and i < len(placeholder_data_list):
            data = placeholder_data_list[i]
            for key, value in data.items():
                msg = msg.replace(f'{{{key}}}', str(value or ''))

        if file_data_base64:
            # If image/file is provided, we send it with the message as caption
            result = send_file(phone, msg, file_data_base64, filename)
        else:
            result = send_message(phone, msg)
            
        if result.get('success'):
            results['success'] += 1
        else:
            results['failed'] += 1
        results['details'].append({
            'phone': phone,
            'success': result.get('success', False),
            'message': result.get('message', '')
        })

    return results
