import queue
import threading
import time
import random
import logging
import uuid
import os
import tempfile
import base64

logger = logging.getLogger('barakah_app')

# Thread-safe FIFO Queue
_blast_queue = queue.Queue()
_worker_thread = None
_worker_lock = threading.Lock()

class BlastTask:
    def __init__(self, task_type, items, delay_seconds=5.0, task_id=None, extra_data=None):
        self.task_id = task_id or uuid.uuid4().hex
        self.task_type = task_type  # 'whatsapp' or 'email'
        self.items = items  # List of dicts with recipient data
        self.delay_seconds = delay_seconds
        self.extra_data = extra_data or {}
        self.created_at = time.time()

def _worker_loop():
    logger.info("BlastQueue background worker thread started.")
    while True:
        try:
            task = _blast_queue.get()
            if task is None:
                break
            try:
                from django.db import close_old_connections
                close_old_connections()
                _process_task(task)
            except Exception as proc_err:
                logger.error(f"Error processing BlastTask {getattr(task, 'task_id', 'unknown')}: {proc_err}", exc_info=True)
            finally:
                try:
                    from django.db import close_old_connections
                    close_old_connections()
                except Exception:
                    pass
                _blast_queue.task_done()
        except Exception as e:
            logger.error(f"Error in BlastQueue worker loop: {e}", exc_info=True)
            time.sleep(1)

def ensure_worker_running():
    global _worker_thread
    with _worker_lock:
        if _worker_thread is None or not _worker_thread.is_alive():
            _worker_thread = threading.Thread(target=_worker_loop, daemon=True, name="BlastQueueWorker")
            _worker_thread.start()
            logger.info("BlastQueueWorker thread initialized and running.")

def _process_task(task):
    logger.info(f"Starting BlastTask {task.task_id} ({task.task_type}) with {len(task.items)} recipients.")
    success_count = 0
    failed_count = 0
    
    # Pre-process file for WA if available
    temp_file_info = None
    if task.task_type == 'whatsapp' and task.extra_data.get('file_data_base64'):
        try:
            file_data_base64 = task.extra_data['file_data_base64']
            filename = task.extra_data.get('filename', 'image.jpg')
            mime_type = 'application/pdf'
            if ',' in file_data_base64:
                header, payload = file_data_base64.split(',', 1)
                try:
                    mime_type = header.split(':')[1].split(';')[0]
                except Exception:
                    pass
            else:
                payload = file_data_base64
            
            payload = payload.replace(' ', '+')
            file_decoded = base64.b64decode(payload)
            
            if len(file_decoded) > 10:
                temp_filename = f"blast_q_{task.task_id}_{filename}"
                temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
                with open(temp_path, 'wb') as f:
                    f.write(file_decoded)
                
                temp_file_info = {
                    'path': temp_path,
                    'mime': mime_type,
                    'filename': filename
                }
        except Exception as e:
            logger.error(f"BlastTask {task.task_id} temp file prep error: {e}")

    try:
        for idx, item in enumerate(task.items):
            if idx > 0:
                # Random jitter delay to prevent anti-spam bot detection
                # WhatsApp: random 3.0 to 6.0 seconds per message (average ~4.5s)
                # Email: random 1.0 to 2.5 seconds per message
                if task.task_type == 'whatsapp':
                    actual_delay = random.uniform(3.0, 6.0)
                else:
                    actual_delay = random.uniform(1.0, 2.5)
                
                time.sleep(actual_delay)

            try:
                if task.task_type == 'whatsapp':
                    from accounts.whatsapp_service import send_message, _send_file_internal
                    phone = item.get('phone')
                    message = item.get('message')
                    
                    if temp_file_info and os.path.exists(temp_file_info['path']):
                        res = _send_file_internal(phone, message, temp_file_info['path'], temp_file_info['filename'], temp_file_info['mime'])
                    else:
                        res = send_message(phone, message)
                    
                    if res.get('success'):
                        success_count += 1
                    else:
                        failed_count += 1
                        logger.warning(f"BlastTask {task.task_id} item {idx+1}/{len(task.items)} WA failed for {phone}: {res.get('message')}")

                elif task.task_type == 'email':
                    from barakah_app.utils import send_email
                    email = item.get('email')
                    subject = item.get('subject')
                    message = item.get('message')
                    attachments = task.extra_data.get('attachments', [])
                    
                    ok = send_email(
                        subject=subject,
                        message=message,
                        recipient_list=[email],
                        attachments=attachments,
                        fail_silently=True
                    )
                    if ok:
                        success_count += 1
                    else:
                        failed_count += 1
                        logger.warning(f"BlastTask {task.task_id} item {idx+1}/{len(task.items)} Email failed for {email}")

            except Exception as item_err:
                failed_count += 1
                logger.error(f"Error processing BlastTask {task.task_id} item {idx+1}: {item_err}")

    finally:
        # Cleanup temp file
        if temp_file_info and os.path.exists(temp_file_info['path']):
            try:
                os.unlink(temp_file_info['path'])
            except Exception:
                pass

    logger.info(f"Completed BlastTask {task.task_id} ({task.task_type}): {success_count} success, {failed_count} failed out of {len(task.items)}.")


def enqueue_whatsapp_blast(phone_list, message_template, placeholder_data_list=None, file_data_base64=None, filename='image.jpg', delay_seconds=5.0):
    """
    Enqueue a WhatsApp message blast task to run asynchronously in background.
    Returns task metadata immediately.
    """
    ensure_worker_running()
    
    items = []
    for i, phone in enumerate(phone_list):
        msg = message_template
        if placeholder_data_list and i < len(placeholder_data_list):
            data = placeholder_data_list[i]
            if isinstance(data, dict):
                for key, value in data.items():
                    msg = msg.replace(f'{{{key}}}', str(value or ''))
        
        items.append({
            'phone': phone,
            'message': msg
        })

    task = BlastTask(
        task_type='whatsapp',
        items=items,
        delay_seconds=delay_seconds,
        extra_data={
            'file_data_base64': file_data_base64,
            'filename': filename
        }
    )
    
    _blast_queue.put(task)
    
    # Calculate estimated completion time in minutes
    est_seconds = len(items) * delay_seconds
    est_minutes = max(1, round(est_seconds / 60, 1))

    return {
        'task_id': task.task_id,
        'status': 'queued',
        'total': len(items),
        'estimated_minutes': est_minutes,
        'message': f'Blast WhatsApp berhasil dimasukkan ke antrian ({len(items)} penerima). Pesan dikirim bertahap di belakang layar.'
    }


def enqueue_email_blast(email_list, subject, message_template, placeholder_data_list=None, attachments=None, delay_seconds=1.5):
    """
    Enqueue an Email blast task to run asynchronously in background.
    Returns task metadata immediately.
    """
    ensure_worker_running()

    # Pre-process attachments into tuples (name, content_bytes, content_type) to survive request lifecycle
    processed_attachments = []
    if attachments:
        for att in attachments:
            if hasattr(att, 'read'):
                try:
                    att.seek(0)
                    content = att.read()
                    content_type = getattr(att, 'content_type', 'application/octet-stream')
                    processed_attachments.append((att.name, content, content_type))
                except Exception as e:
                    logger.error(f"Error reading email attachment {getattr(att, 'name', 'unknown')}: {e}")
            elif isinstance(att, tuple):
                processed_attachments.append(att)

    items = []
    for i, email in enumerate(email_list):
        msg = message_template
        if placeholder_data_list and i < len(placeholder_data_list):
            data = placeholder_data_list[i]
            if isinstance(data, dict):
                for key, value in data.items():
                    msg = msg.replace(f'{{{key}}}', str(value or ''))

        items.append({
            'email': email,
            'subject': subject,
            'message': msg
        })

    task = BlastTask(
        task_type='email',
        items=items,
        delay_seconds=delay_seconds,
        extra_data={
            'attachments': processed_attachments
        }
    )

    _blast_queue.put(task)

    est_seconds = len(items) * delay_seconds
    est_minutes = max(1, round(est_seconds / 60, 1))

    return {
        'task_id': task.task_id,
        'status': 'queued',
        'total': len(items),
        'estimated_minutes': est_minutes,
        'message': f'Blast Email berhasil dimasukkan ke antrian ({len(items)} penerima). Email dikirim bertahap di belakang layar.'
    }
