from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def send_status_update_email(user, item_name, new_status, reason=None):
    """
    Centralized utility to send email notifications for status changes.
    Uses database-driven EmailSettings if available, otherwise falls back to defaults.
    """
    if not user or not user.email:
        return False

    # Try to get custom email settings from digital_products app
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
                fail_silently=False,
            )
            from_email = f"{email_settings.sender_name} <{email_settings.email_host_user}>"
        else:
            backend = None
            from_email = settings.DEFAULT_FROM_EMAIL
    except ImportError:
        backend = None
        from_email = settings.DEFAULT_FROM_EMAIL
        
    subject = f"Update Status Pengajuan: {item_name}"
    
    # Simple formatting for the status
    status_display = {
        'approved': 'DISETUJUI',
        'rejected': 'DITOLAK',
        'pending': 'MENUNGGU VERIFIKASI',
        'draft': 'DRAFT'
    }.get(new_status, new_status.upper())
    
    message = f"Halo {user.username},\n\n"
    message += f"Status pengajuan Anda untuk '{item_name}' telah diperbarui menjadi: {status_display}.\n\n"
    
    if new_status == 'approved':
        message += "Selamat! Pengajuan Anda telah disetujui dan sekarang aktif di platform kami.\n"
    elif new_status == 'rejected':
        message += "Mohon maaf, pengajuan Anda belum dapat kami setujui saat ini.\n"
        if reason:
            message += f"Alasan: {reason}\n"
        else:
            message += "Silakan hubungi admin untuk informasi lebih lanjut.\n"
            
    message += "\nTerima kasih,\nTim Barakah Economy"
    
    try:
        if backend:
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=from_email,
                to=[user.email],
                connection=backend,
            )
            email.send(fail_silently=True)
        else:
            send_mail(
                subject,
                message,
                from_email,
                [user.email],
                fail_silently=True,
            )
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
