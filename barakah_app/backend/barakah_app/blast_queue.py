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

# Thread-safe FIFO Queue & Active Task Tracker
_blast_queue = queue.Queue()
_active_tasks = {}
_worker_thread = None
_worker_lock = threading.Lock()

class BlastTask:
    def __init__(self, task_type, items, delay_seconds=5.0, task_id=None, extra_data=None, created_by_user_id=None):
        self.task_id = task_id or uuid.uuid4().hex
        self.task_type = task_type  # 'whatsapp' or 'email'
        self.items = items  # List of dicts with recipient data
        self.delay_seconds = delay_seconds
        self.extra_data = extra_data or {}
        self.created_by_user_id = created_by_user_id
        self.created_at = time.time()


def get_active_blast_tasks(user_id=None, is_superuser=False):
    """
    Get a list of active, queued, or recently updated blast tasks for monitoring UI.
    Only shows tasks belonging to user_id unless is_superuser=True.
    """
    now = time.time()
    result = []
    with _worker_lock:
        for tid, task_data in list(_active_tasks.items()):
            # Purge completed/cancelled tasks older than 30 minutes
            if now - task_data.get('updated_at', 0) > 1800 and task_data.get('status') in ['completed', 'cancelled', 'failed']:
                _active_tasks.pop(tid, None)
                continue
            
            # Filter by creator if not superuser
            if not is_superuser and user_id and task_data.get('created_by_user_id') and task_data.get('created_by_user_id') != user_id:
                continue

            result.append({
                'task_id': task_data.get('task_id'),
                'task_type': task_data.get('task_type'),
                'status': task_data.get('status'),
                'total': task_data.get('total', 0),
                'processed_count': task_data.get('processed_count', 0),
                'success_count': task_data.get('success_count', 0),
                'failed_count': task_data.get('failed_count', 0),
                'current_item': task_data.get('current_item', ''),
                'is_cancelled': task_data.get('is_cancelled', False),
                'created_by_user_id': task_data.get('created_by_user_id'),
                'created_at': task_data.get('created_at'),
                'updated_at': task_data.get('updated_at'),
            })
            
    result.sort(key=lambda x: x.get('created_at') or 0, reverse=True)
    return result


def cancel_blast_task(task_id, user_id=None, is_superuser=False):
    """
    Cancel an active or queued blast task.
    If task_id is 'all', cancels active/queued tasks belonging to user.
    """
    with _worker_lock:
        if task_id == 'all':
            for tid, task_data in _active_tasks.items():
                if is_superuser or not user_id or task_data.get('created_by_user_id') == user_id:
                    task_data['is_cancelled'] = True
                    if task_data.get('status') in ['queued', 'processing']:
                        task_data['status'] = 'cancelled'
                    task_data['updated_at'] = time.time()
            return True
        elif task_id in _active_tasks:
            task_data = _active_tasks[task_id]
            if is_superuser or not user_id or task_data.get('created_by_user_id') == user_id:
                task_data['is_cancelled'] = True
                if task_data.get('status') in ['queued', 'processing']:
                    task_data['status'] = 'cancelled'
                task_data['updated_at'] = time.time()
                return True
    return False


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
    task_id = task.task_id
    with _worker_lock:
        task_data = _active_tasks.get(task_id)
        if not task_data:
            task_data = {
                'task_id': task_id,
                'task_type': task.task_type,
                'status': 'processing',
                'total': len(task.items),
                'processed_count': 0,
                'success_count': 0,
                'failed_count': 0,
                'current_item': '',
                'is_cancelled': False,
                'created_by_user_id': task.created_by_user_id,
                'created_at': task.created_at,
                'updated_at': time.time()
            }
            _active_tasks[task_id] = task_data
        else:
            task_data['status'] = 'processing'
            task_data['updated_at'] = time.time()

    logger.info(f"Starting BlastTask {task_id} ({task.task_type}) with {len(task.items)} recipients.")

    if task_data.get('is_cancelled'):
        logger.info(f"BlastTask {task_id} cancelled before processing start.")
        task_data['status'] = 'cancelled'
        task_data['updated_at'] = time.time()
        return
    
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
                temp_filename = f"blast_q_{task_id}_{filename}"
                temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
                with open(temp_path, 'wb') as f:
                    f.write(file_decoded)
                
                temp_file_info = {
                    'path': temp_path,
                    'mime': mime_type,
                    'filename': filename
                }
        except Exception as e:
            logger.error(f"BlastTask {task_id} temp file prep error: {e}")

    try:
        for idx, item in enumerate(task.items):
            if task_data.get('is_cancelled'):
                logger.info(f"BlastTask {task_id} cancelled during execution at item {idx+1}/{len(task.items)}.")
                task_data['status'] = 'cancelled'
                task_data['updated_at'] = time.time()
                break

            if idx > 0:
                # Random jitter delay to prevent anti-spam bot detection
                # WhatsApp: random 3.0 to 6.0 seconds per message (average ~4.5s)
                # Email: random 1.0 to 2.5 seconds per message
                actual_delay = random.uniform(3.0, 6.0) if task.task_type == 'whatsapp' else random.uniform(1.0, 2.5)
                time.sleep(actual_delay)

            if task_data.get('is_cancelled'):
                task_data['status'] = 'cancelled'
                task_data['updated_at'] = time.time()
                break

            try:
                if task.task_type == 'whatsapp':
                    from accounts.whatsapp_service import send_message, _send_file_internal
                    phone = item.get('phone')
                    message = item.get('message')
                    
                    task_data['current_item'] = phone
                    task_data['updated_at'] = time.time()
                    
                    wa_device_id = task.extra_data.get('device_id')
                    if temp_file_info and os.path.exists(temp_file_info['path']):
                        res = _send_file_internal(phone, message, temp_file_info['path'], temp_file_info['filename'], temp_file_info['mime'], device_id=wa_device_id)
                    else:
                        res = send_message(phone, message, device_id=wa_device_id)
                    
                    task_data['processed_count'] += 1
                    if res.get('success'):
                        task_data['success_count'] += 1
                    else:
                        task_data['failed_count'] += 1
                        logger.warning(f"BlastTask {task_id} item {idx+1}/{len(task.items)} WA failed for {phone}: {res.get('message')}")

                elif task.task_type == 'email':
                    from barakah_app.utils import send_email
                    email = item.get('email')
                    subject = item.get('subject')
                    message = item.get('message')
                    attachments = task.extra_data.get('attachments', [])

                    task_data['current_item'] = email
                    task_data['updated_at'] = time.time()
                    
                    ok = send_email(
                        subject=subject,
                        message=message,
                        recipient_list=[email],
                        attachments=attachments,
                        fail_silently=True
                    )
                    task_data['processed_count'] += 1
                    if ok:
                        task_data['success_count'] += 1
                    else:
                        task_data['failed_count'] += 1
                        logger.warning(f"BlastTask {task_id} item {idx+1}/{len(task.items)} Email failed for {email}")

            except Exception as item_err:
                task_data['processed_count'] += 1
                task_data['failed_count'] += 1
                task_data['updated_at'] = time.time()
                logger.error(f"Error processing BlastTask {task_id} item {idx+1}: {item_err}")

    finally:
        # Cleanup temp file
        if temp_file_info and os.path.exists(temp_file_info['path']):
            try:
                os.unlink(temp_file_info['path'])
            except Exception:
                pass

        if task_data['status'] == 'processing':
            task_data['status'] = 'completed'
        task_data['updated_at'] = time.time()

    logger.info(f"Completed BlastTask {task_id} ({task.task_type}): {task_data['success_count']} success, {task_data['failed_count']} failed out of {len(task.items)}.")


def enqueue_whatsapp_blast(phone_list, message_template, placeholder_data_list=None, file_data_base64=None, filename='image.jpg', delay_seconds=5.0, created_by_user_id=None, device_id=None):
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
            'filename': filename,
            'device_id': device_id
        },
        created_by_user_id=created_by_user_id
    )
    
    with _worker_lock:
        _active_tasks[task.task_id] = {
            'task_id': task.task_id,
            'task_type': 'whatsapp',
            'status': 'queued',
            'total': len(items),
            'processed_count': 0,
            'success_count': 0,
            'failed_count': 0,
            'current_item': '',
            'is_cancelled': False,
            'created_by_user_id': created_by_user_id,
            'created_at': task.created_at,
            'updated_at': time.time()
        }

    _blast_queue.put(task)
    
    est_seconds = len(items) * delay_seconds
    est_minutes = max(1, round(est_seconds / 60, 1))

    return {
        'task_id': task.task_id,
        'status': 'queued',
        'total': len(items),
        'estimated_minutes': est_minutes,
        'message': f'Blast WhatsApp berhasil dimasukkan ke antrian ({len(items)} penerima). Pesan dikirim bertahap di belakang layar.'
    }


def enqueue_email_blast(email_list, subject, message_template, placeholder_data_list=None, attachments=None, delay_seconds=1.5, created_by_user_id=None):
    """
    Enqueue an Email blast task to run asynchronously in background.
    Returns task metadata immediately.
    """
    ensure_worker_running()

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
        },
        created_by_user_id=created_by_user_id
    )

    with _worker_lock:
        _active_tasks[task.task_id] = {
            'task_id': task.task_id,
            'task_type': 'email',
            'status': 'queued',
            'total': len(items),
            'processed_count': 0,
            'success_count': 0,
            'failed_count': 0,
            'current_item': '',
            'is_cancelled': False,
            'created_by_user_id': created_by_user_id,
            'created_at': task.created_at,
            'updated_at': time.time()
        }

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
