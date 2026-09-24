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
                try:
                    from accounts.models import WhatsAppBlastSession
                    WhatsAppBlastSession.objects.filter(task_id=task_id, status__in=['queued', 'processing']).update(status='cancelled')
                except Exception:
                    pass
                return True

    try:
        from accounts.models import WhatsAppBlastSession
        if task_id == 'all':
            WhatsAppBlastSession.objects.filter(status__in=['queued', 'processing']).update(status='cancelled')
        else:
            WhatsAppBlastSession.objects.filter(task_id=task_id, status__in=['queued', 'processing']).update(status='cancelled')
    except Exception:
        pass

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


_scheduler_thread = None


def _check_and_trigger_scheduled_blasts():
    """
    Check for scheduled WhatsApp blast sessions whose scheduled_at has arrived,
    and dispatch them into the active worker queue.
    """
    try:
        from accounts.models import WhatsAppBlastSession
        from django.utils import timezone
        now = timezone.now()

        due_sessions = list(WhatsAppBlastSession.objects.filter(
            status='scheduled',
            scheduled_at__lte=now
        ).order_by('scheduled_at')[:10])

        for session in due_sessions:
            updated = WhatsAppBlastSession.objects.filter(
                id=session.id,
                status='scheduled'
            ).update(status='queued')

            if not updated:
                continue

            session.refresh_from_db()
            logger.info(f"Triggering scheduled WhatsAppBlastSession #{session.id} (task_id: {session.task_id})")
            _dispatch_session_to_queue(session)

    except Exception as err:
        logger.error(f"Error checking scheduled blasts: {err}", exc_info=True)


def _scheduler_loop():
    """
    Background loop that runs every 10 seconds to check for due scheduled blasts.
    """
    logger.info("BlastQueue background scheduler thread started.")
    while True:
        try:
            time.sleep(10)
            from django.db import close_old_connections
            close_old_connections()
            _check_and_trigger_scheduled_blasts()
        except Exception as e:
            logger.error(f"Error in BlastQueue scheduler loop: {e}", exc_info=True)
        finally:
            try:
                from django.db import close_old_connections
                close_old_connections()
            except Exception:
                pass


def ensure_worker_running():
    global _worker_thread, _scheduler_thread
    with _worker_lock:
        if _worker_thread is None or not _worker_thread.is_alive():
            _worker_thread = threading.Thread(target=_worker_loop, daemon=True, name="BlastQueueWorker")
            _worker_thread.start()
            logger.info("BlastQueueWorker thread initialized and running.")
        if _scheduler_thread is None or not _scheduler_thread.is_alive():
            _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True, name="BlastQueueScheduler")
            _scheduler_thread.start()
            logger.info("BlastQueueScheduler thread initialized and running.")


def _dispatch_session_to_queue(session):
    """
    Reconstruct and enqueue a BlastTask for a due or triggered WhatsAppBlastSession.
    """
    recipients = list(session.recipients.all())
    if not recipients:
        from django.utils import timezone
        session.status = 'completed'
        session.completed_at = timezone.now()
        session.save(update_fields=['status', 'completed_at', 'updated_at'])
        return

    items = [
        {
            'phone': r.phone,
            'name': r.name,
            'message': r.message or session.message_template
        }
        for r in recipients
    ]
    payload = session.scheduled_payload or {}
    file_data_base64 = payload.get('file_data_base64')
    filename = payload.get('filename') or session.image_filename or 'image.jpg'
    device_id = payload.get('device_id') or session.device_id
    min_delay = float(payload.get('min_delay', 1.0))
    max_delay = float(payload.get('max_delay', 4.0))
    delay_seconds = float(payload.get('delay_seconds', 2.5))

    task = BlastTask(
        task_type='whatsapp',
        items=items,
        delay_seconds=delay_seconds,
        task_id=session.task_id,
        extra_data={
            'file_data_base64': file_data_base64,
            'filename': filename,
            'device_id': device_id,
            'min_delay': min_delay,
            'max_delay': max_delay
        },
        created_by_user_id=session.created_by_id
    )

    with _worker_lock:
        _active_tasks[session.task_id] = {
            'task_id': session.task_id,
            'task_type': 'whatsapp',
            'status': 'queued',
            'total': len(items),
            'processed_count': 0,
            'success_count': 0,
            'failed_count': 0,
            'current_item': '',
            'is_cancelled': False,
            'created_by_user_id': session.created_by_id,
            'created_at': time.time(),
            'updated_at': time.time()
        }

    _blast_queue.put(task)
    logger.info(f"Dispatched session #{session.id} ({session.task_id}) with {len(items)} recipients to blast queue.")


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
                # Random jitter delay to prevent anti-spam bot detection (default 1.0 ~ 4.0s random)
                if task.task_type == 'whatsapp':
                    min_d = float(task.extra_data.get('min_delay', 1.0))
                    max_d = float(task.extra_data.get('max_delay', 4.0))
                    if min_d > max_d:
                        min_d, max_d = max_d, min_d
                    actual_delay = random.uniform(min_d, max_d)
                else:
                    actual_delay = random.uniform(1.0, 2.5)
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
                    is_ok = bool(res.get('success'))
                    if is_ok:
                        task_data['success_count'] += 1
                    else:
                        task_data['failed_count'] += 1
                        logger.warning(f"BlastTask {task_id} item {idx+1}/{len(task.items)} WA failed for {phone}: {res.get('message')}")

                    # Persist recipient status to database per session
                    try:
                        from accounts.models import WhatsAppBlastRecipient, WhatsAppBlastSession
                        from django.utils import timezone
                        WhatsAppBlastRecipient.objects.filter(session__task_id=task_id, phone=phone).update(
                            status='success' if is_ok else 'failed',
                            error_message=None if is_ok else str(res.get('message', 'Gagal terkirim')),
                            sent_at=timezone.now()
                        )
                        WhatsAppBlastSession.objects.filter(task_id=task_id).update(
                            success_count=task_data['success_count'],
                            failed_count=task_data['failed_count']
                        )
                    except Exception as db_rec_err:
                        logger.error(f"Error updating WhatsAppBlastRecipient in DB: {db_rec_err}")

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
                if task.task_type == 'whatsapp':
                    try:
                        from accounts.models import WhatsAppBlastRecipient
                        from django.utils import timezone
                        WhatsAppBlastRecipient.objects.filter(session__task_id=task_id, phone=item.get('phone')).update(
                            status='failed',
                            error_message=str(item_err),
                            sent_at=timezone.now()
                        )
                    except Exception:
                        pass

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

        # Update final session record in DB
        if task.task_type == 'whatsapp':
            try:
                from accounts.models import WhatsAppBlastSession
                from django.utils import timezone
                WhatsAppBlastSession.objects.filter(task_id=task_id).update(
                    status=task_data['status'],
                    success_count=task_data['success_count'],
                    failed_count=task_data['failed_count'],
                    completed_at=timezone.now()
                )
            except Exception as db_fin_err:
                logger.error(f"Error updating completed WhatsAppBlastSession in DB: {db_fin_err}")

    logger.info(f"Completed BlastTask {task_id} ({task.task_type}): {task_data['success_count']} success, {task_data['failed_count']} failed out of {len(task.items)}.")


def enqueue_whatsapp_blast(phone_list, message_template, placeholder_data_list=None, file_data_base64=None, filename='image.jpg', delay_seconds=2.5, min_delay=1.0, max_delay=4.0, created_by_user_id=None, device_id=None, campaign_title=None, campaign_source='custom_broadcast', scheduled_at=None):
    """
    Enqueue a WhatsApp message blast task to run asynchronously in background,
    or schedule it for future delivery if scheduled_at is provided.
    Returns task metadata immediately and records the session in DB for history/CRM.
    """
    ensure_worker_running()

    # Parse and validate scheduled_at if provided
    scheduled_dt = None
    if scheduled_at:
        from django.utils import timezone
        from django.utils.dateparse import parse_datetime
        if isinstance(scheduled_at, str):
            scheduled_dt = parse_datetime(scheduled_at)
            if scheduled_dt is None:
                try:
                    import dateutil.parser
                    scheduled_dt = dateutil.parser.parse(scheduled_at)
                except Exception:
                    pass
        elif hasattr(scheduled_at, 'strftime'):
            scheduled_dt = scheduled_at

        if scheduled_dt and timezone.is_naive(scheduled_dt):
            scheduled_dt = timezone.make_aware(scheduled_dt, timezone.get_current_timezone())
    
    items = []
    for i, phone in enumerate(phone_list):
        msg = message_template
        data = None
        if placeholder_data_list and i < len(placeholder_data_list):
            data = placeholder_data_list[i]
            if isinstance(data, dict):
                for key, value in data.items():
                    msg = msg.replace(f'{{{key}}}', str(value or ''))
        
        items.append({
            'phone': phone,
            'name': data.get('name', '') if isinstance(data, dict) else '',
            'message': msg
        })

    # Case 1: SCHEDULED BLAST (future execution)
    from django.utils import timezone
    if scheduled_dt and scheduled_dt > timezone.now():
        from accounts.models import WhatsAppBlastSession, WhatsAppBlastRecipient
        task_id = uuid.uuid4().hex

        title = campaign_title
        if not title:
            local_dt = timezone.localtime(scheduled_dt) if timezone.is_aware(scheduled_dt) else scheduled_dt
            time_str = local_dt.strftime('%d %b %Y, %H:%M')
            title = f"Broadcast WA Terjadwal ({len(items)} Nomor) - {time_str} WIB"

        scheduled_payload = {
            'min_delay': min_delay,
            'max_delay': max_delay,
            'delay_seconds': delay_seconds,
            'file_data_base64': file_data_base64,
            'filename': filename,
            'device_id': device_id,
            'campaign_title': title,
            'campaign_source': campaign_source
        }

        session = WhatsAppBlastSession.objects.create(
            task_id=task_id,
            title=title,
            campaign_source=campaign_source,
            message_template=message_template,
            has_image=bool(file_data_base64),
            image_filename=filename if file_data_base64 else '',
            device_id=device_id or '',
            created_by_id=created_by_user_id,
            status='scheduled',
            total_recipients=len(items),
            scheduled_at=scheduled_dt,
            scheduled_payload=scheduled_payload
        )

        recipients_to_create = [
            WhatsAppBlastRecipient(
                session=session,
                phone=item['phone'],
                name=item.get('name', ''),
                message=item.get('message', ''),
                status='pending'
            )
            for item in items
        ]
        WhatsAppBlastRecipient.objects.bulk_create(recipients_to_create)

        local_dt = timezone.localtime(scheduled_dt) if timezone.is_aware(scheduled_dt) else scheduled_dt
        time_display = local_dt.strftime('%d %B %Y, %H:%M WIB')

        logger.info(f"Created scheduled blast session #{session.id} for {time_display} with {len(items)} recipients.")

        return {
            'task_id': task_id,
            'session_id': session.id,
            'status': 'scheduled',
            'total': len(items),
            'scheduled_at': scheduled_dt.isoformat(),
            'message': f'Broadcast WhatsApp berhasil dijadwalkan untuk dikirim pada {time_display} ({len(items)} penerima).'
        }

    # Case 2: IMMEDIATE BLAST (regular queue)
    task = BlastTask(
        task_type='whatsapp',
        items=items,
        delay_seconds=delay_seconds,
        extra_data={
            'file_data_base64': file_data_base64,
            'filename': filename,
            'device_id': device_id,
            'min_delay': min_delay,
            'max_delay': max_delay
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

    # Persist session & recipients in DB for CRM History
    try:
        from accounts.models import WhatsAppBlastSession, WhatsAppBlastRecipient

        title = campaign_title
        if not title:
            now_local = timezone.localtime(timezone.now()) if timezone.is_aware(timezone.now()) else timezone.now()
            time_str = now_local.strftime('%d %b %Y, %H:%M')
            title = f"Broadcast WA ({len(items)} Nomor) - {time_str} WIB"

        session = WhatsAppBlastSession.objects.create(
            task_id=task.task_id,
            title=title,
            campaign_source=campaign_source,
            message_template=message_template,
            has_image=bool(file_data_base64),
            image_filename=filename if file_data_base64 else '',
            device_id=device_id or '',
            created_by_id=created_by_user_id,
            status='queued',
            total_recipients=len(items)
        )

        recipients_to_create = [
            WhatsAppBlastRecipient(
                session=session,
                phone=item['phone'],
                name=item.get('name', ''),
                message=item.get('message', ''),
                status='pending'
            )
            for item in items
        ]
        WhatsAppBlastRecipient.objects.bulk_create(recipients_to_create)
    except Exception as db_err:
        logger.error(f"Failed to record WhatsAppBlastSession in DB: {db_err}")

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


def trigger_scheduled_session_now(session_id, user_id=None, is_superuser=False):
    """
    Trigger an existing scheduled WhatsApp blast session immediately without waiting for its scheduled time.
    """
    from accounts.models import WhatsAppBlastSession
    from django.utils import timezone
    ensure_worker_running()

    qs = WhatsAppBlastSession.objects.filter(id=session_id, status='scheduled')
    if not is_superuser and user_id:
        from django.db.models import Q
        qs = qs.filter(Q(created_by_id=user_id) | Q(created_by__isnull=True))

    session = qs.first()
    if not session:
        return False, "Sesi broadcast terjadwal tidak ditemukan atau sudah diproses."

    updated = WhatsAppBlastSession.objects.filter(id=session.id, status='scheduled').update(
        status='queued',
        scheduled_at=timezone.now()
    )
    if not updated:
        return False, "Sesi broadcast sedang atau sudah diproses oleh antrian lain."

    session.refresh_from_db()
    _dispatch_session_to_queue(session)
    return True, f"Broadcast #{session.id} berhasil segera dijalankan ke antrean pengiriman!"


def reschedule_blast_session(session_id, new_scheduled_at, user_id=None, is_superuser=False):
    """
    Reschedule an existing scheduled WhatsApp blast session to a new date and time.
    """
    from accounts.models import WhatsAppBlastSession
    from django.utils import timezone
    from django.utils.dateparse import parse_datetime

    # Parse new datetime
    scheduled_dt = None
    if isinstance(new_scheduled_at, str):
        scheduled_dt = parse_datetime(new_scheduled_at)
        if scheduled_dt is None:
            try:
                import dateutil.parser
                scheduled_dt = dateutil.parser.parse(new_scheduled_at)
            except Exception:
                pass
    elif hasattr(new_scheduled_at, 'strftime'):
        scheduled_dt = new_scheduled_at

    if not scheduled_dt:
        return False, "Format tanggal dan jam baru tidak valid."

    if timezone.is_naive(scheduled_dt):
        scheduled_dt = timezone.make_aware(scheduled_dt, timezone.get_current_timezone())

    if scheduled_dt <= timezone.now():
        return False, "Waktu jadwal baru harus lebih besar dari waktu saat ini."

    qs = WhatsAppBlastSession.objects.filter(id=session_id, status='scheduled')
    if not is_superuser and user_id:
        from django.db.models import Q
        qs = qs.filter(Q(created_by_id=user_id) | Q(created_by__isnull=True))

    session = qs.first()
    if not session:
        return False, "Sesi broadcast terjadwal tidak ditemukan."

    session.scheduled_at = scheduled_dt
    session.save(update_fields=['scheduled_at', 'updated_at'])

    local_dt = timezone.localtime(scheduled_dt)
    time_str = local_dt.strftime('%d %B %Y, %H:%M WIB')
    return True, f"Jadwal pengiriman berhasil diperbarui ke {time_str}."


def cancel_scheduled_blast_session(session_id, user_id=None, is_superuser=False):
    """
    Cancel an existing scheduled WhatsApp blast session.
    """
    from accounts.models import WhatsAppBlastSession
    qs = WhatsAppBlastSession.objects.filter(id=session_id, status='scheduled')
    if not is_superuser and user_id:
        from django.db.models import Q
        qs = qs.filter(Q(created_by_id=user_id) | Q(created_by__isnull=True))

    session = qs.first()
    if not session:
        return False, "Sesi broadcast terjadwal tidak ditemukan."

    session.status = 'cancelled'
    session.save(update_fields=['status', 'updated_at'])
    return True, "Jadwal broadcast WhatsApp berhasil dibatalkan."


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
