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
import uuid
from django.conf import settings

logger = logging.getLogger('accounts')

# Config from settings/env with defaults from the PHP reference
WA_API_URL = getattr(settings, 'WHATSAPP_API_URL', 
    'http://notif-gowhatsappwebmultidevice-g19qsd-b2e86e-159-65-58-54.nip.io')
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
    """Send a file via WhatsApp API from base64 data."""
    if not phone:
        return {'success': False, 'message': 'No HP kosong'}

    try:
        # Detect MIME type and separate payload
        mime_type = 'application/pdf'
        if ',' in file_data_base64:
            header, payload = file_data_base64.split(',', 1)
            try:
                mime_type = header.split(':')[1].split(';')[0]
            except: pass
        else:
            payload = file_data_base64

        # Fix spaces
        payload = payload.replace(' ', '+')

        # Decode base64
        file_decoded = base64.b64decode(payload)
        if len(file_decoded) < 10: # Min size reduced to 10 bytes
            return {'success': False, 'message': 'Gagal decode file (terlalu kecil)'}

        # Save to unique temp file to prevent collisions
        temp_filename = f"wa_{uuid.uuid4().hex}_{filename}"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        with open(temp_path, 'wb') as f:
            f.write(file_decoded)

        result = _send_file_internal(phone, caption, temp_path, filename, mime_type)

        # Cleanup
        if os.path.exists(temp_path):
            os.unlink(temp_path)

        return result

    except Exception as e:
        logger.error(f"WhatsApp send_file error: {e}")
        return {
            'success': False,
            'message': f'Gagal mengirim file WhatsApp: {str(e)}'
        }


def _send_file_internal(phone, caption, file_path, filename, mime_type):
    """Internal helper to send a file from a local path."""
    api_url = f"{WA_API_URL}/send/file"
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, mime_type)}
            data = {'phone': phone, 'caption': caption}
            
            response = requests.post(
                api_url,
                data=data,
                files=files,
                auth=(WA_API_USER, WA_API_PASS),
                timeout=45,
                verify=False
            )

        if 200 <= response.status_code < 300:
            return {
                'success': True,
                'data': {
                    'mode': 'file',
                    'mime': mime_type,
                    'api_response': response.json() if response.text else None
                }
            }
        else:
            # Fallback to text message
            logger.warning(f"WA file send failed (HTTP {response.status_code}, MIME: {mime_type}), falling back to text")
            fallback_msg = f"{caption}\n\n*[System]* Gagal lampirkan file ({mime_type})."
            return send_message(phone, fallback_msg)

    except Exception as e:
        logger.error(f"WhatsApp _send_file_internal error: {e}")
        return {'success': False, 'message': f'Internal error sending file: {str(e)}'}


def blast_messages(phone_list, message_template, placeholder_data_list=None, file_data_base64=None, filename='image.jpg'):
    """
    Send WhatsApp messages to multiple recipients efficiently.
    """
    results = {'total': len(phone_list), 'success': 0, 'failed': 0, 'details': []}
    
    # Pre-process file once if provided
    file_info = None
    if file_data_base64:
        try:
            mime_type = 'application/pdf'
            if ',' in file_data_base64:
                header, payload = file_data_base64.split(',', 1)
                try:
                    mime_type = header.split(':')[1].split(';')[0]
                except: pass
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
            # Replace placeholders if data provided
            msg = message_template
            if placeholder_data_list and i < len(placeholder_data_list):
                data = placeholder_data_list[i]
                for key, value in data.items():
                    msg = msg.replace(f'{{{key}}}', str(value or ''))

            if file_info:
                # Reuse the prepared temp file
                result = _send_file_internal(phone, msg, file_info['path'], file_info['filename'], file_info['mime'])
            elif file_data_base64:
                # Fallback if file_info failed but base64 was provided (should not happen normally)
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
    finally:
        # Final cleanup of blast temp file
        if file_info and os.path.exists(file_info['path']):
            try:
                os.unlink(file_info['path'])
            except: pass

    return results
