from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def send_email(subject, message, recipient_list, from_email=None, fail_silently=False):
    """
    Generic utility to send email using database settings if available,
    falling back to settings.py configuration.
    """
    try:
        from digital_products.models import EmailSettings
        from django.core.mail.backends.smtp import EmailBackend
        from django.core.mail import EmailMessage
        
        email_settings = EmailSettings.get_settings()
        if email_settings.email_host_user and email_settings.email_host_password:
            backend = EmailBackend(
                host=email_settings.email_host,
                port=email_settings.email_port,
                username=email_settings.email_host_user,
                password=email_settings.email_host_password,
                use_tls=email_settings.email_use_tls,
                fail_silently=fail_silently,
            )
            final_from_email = from_email or f"{email_settings.sender_name} <{email_settings.email_host_user}>"
            
            # Use EmailMessage for more control if needed later (e.g. attachments)
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=final_from_email,
                to=recipient_list,
                connection=backend,
            )
            email.send(fail_silently=fail_silently)
            return True
    except Exception as e:
        # Log error but don't crash, try fallback
        import logging
        logger = logging.getLogger('barakah_app')
        logger.error(f"Error sending email via custom backend: {e}")
        
    # Fallback to standard Django send_mail
    try:
        send_mail(
            subject,
            message,
            from_email or settings.DEFAULT_FROM_EMAIL,
            recipient_list,
            fail_silently=fail_silently,
        )
        return True
    except Exception as e:
        import logging
        logger = logging.getLogger('barakah_app')
        logger.error(f"Error sending email via fallback: {e}")
        return False

def send_status_update_email(user, item_name, new_status, reason=None, is_registration=False, extra_details=None):
    """
    Centralized utility to send email notifications for status changes.
    Supports User objects or temporary objects/strings for email.
    """
    user_email = None
    user_name = "User"

    # Normalize user object/email
    if isinstance(user, str):
        user_email = user
        user_name = user.split('@')[0]
    elif hasattr(user, 'email'):
        user_email = user.email
        user_name = getattr(user, 'username', user_email.split('@')[0])
    
    if not user_email:
        return False

    if is_registration:
        subject = f"Status Pendaftaran Event: {item_name}"
        header_text = f"Pendaftaran Anda untuk event '{item_name}'"
    else:
        subject = f"Update Status Pengajuan: {item_name}"
        header_text = f"Pengajuan Anda untuk '{item_name}'"
    
    # Simple formatting for the status
    status_display = {
        'approved': 'DISETUJUI',
        'rejected': 'DITOLAK',
        'pending': 'MENUNGGU VERIFIKASI',
        'draft': 'DRAFT'
    }.get(new_status, new_status.upper())
    
    message = f"Halo {user_name},\n\n"
    message += f"{header_text} telah diperbarui menjadi: {status_display}.\n\n"
    
    if new_status == 'approved':
        if is_registration:
            message += "Selamat! Pendaftaran Anda telah disetujui. Sampai jumpa di lokasi event!\n"
            if extra_details:
                message += f"\nBerikut Detail Tambahan:\n{extra_details}\n"
        else:
            message += "Selamat! Pengajuan Anda telah disetujui dan sekarang aktif di platform kami.\n"
    elif new_status == 'rejected':
        message += "Mohon maaf, pengajuan pendaftaran Anda belum dapat kami setujui saat ini.\n"
        if reason:
            message += f"Alasan: {reason}\n"
        else:
            message += "Silakan hubungi admin untuk informasi lebih lanjut.\n"
            
    message += "\nTerima kasih,\nTim Barakah Economy"
    
    return send_email(subject, message, [user_email], fail_silently=True)
