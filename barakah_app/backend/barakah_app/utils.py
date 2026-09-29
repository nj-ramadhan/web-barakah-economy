from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import html
import re

def render_promotional_email_html(
    title="Barakah Economy",
    subtitle="",
    message="",
    hero_image_url="",
    badge_text="",
    theme_color="#059669",
    cta_text="",
    cta_url="",
    secondary_links=None,
    footer_text="",
    recipient_name="",
    recipient_email=""
):
    """
    Generate responsive, highly-compatible HTML email template for promotional/newsletter emails.
    Compatible with Gmail, Apple Mail, Outlook, Yahoo, and mobile clients.
    """
    theme_color = theme_color or '#059669'
    title = title or 'Barakah Economy'
    
    # Process message body: replace newlines with paragraphs if not already HTML
    if '<p' not in message.lower() and '<div' not in message.lower():
        paragraphs = [p.strip() for p in message.split('\n\n') if p.strip()]
        body_html = ''.join(f'<p style="margin: 0 0 16px 0; line-height: 1.65; color: #334155; font-size: 15px;">{html.escape(p).replace(chr(10), "<br/>")}</p>' for p in paragraphs)
    else:
        body_html = f'<div style="color: #334155; font-size: 15px; line-height: 1.65;">{message}</div>'

    # Preheader snippet for inbox preview
    plain_snippet = re.sub(r'<[^>]+>', '', message)[:120]
    
    # Hero image tag
    hero_html = ''
    if hero_image_url and hero_image_url.strip():
        hero_html = f'''
        <tr>
            <td align="center" style="padding: 0 0 24px 0;">
                <img src="{html.escape(hero_image_url.strip())}" alt="{html.escape(title)}" style="max-width: 100%; width: 100%; height: auto; border-radius: 12px; display: block; object-fit: cover;" />
            </td>
        </tr>
        '''

    # Badge tag
    badge_html = ''
    if badge_text and badge_text.strip():
        badge_html = f'''
        <div style="margin-bottom: 14px;">
            <span style="display: inline-block; padding: 6px 14px; background-color: {theme_color}; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; border-radius: 9999px;">
                {html.escape(badge_text.strip())}
            </span>
        </div>
        '''

    # CTA Button
    cta_html = ''
    if cta_text and cta_url and cta_text.strip() and cta_url.strip():
        cta_html = f'''
        <tr>
            <td align="center" style="padding: 24px 0 16px 0;">
                <table border="0" cellspacing="0" cellpadding="0" role="presentation">
                    <tr>
                        <td align="center" style="border-radius: 10px; background-color: {theme_color};">
                            <a href="{html.escape(cta_url.strip())}" target="_blank" style="font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 14px 32px; display: inline-block; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                {html.escape(cta_text.strip())} &rarr;
                            </a>
                        </td>
                    </tr>
                </table>
                <p style="margin: 10px 0 0 0; font-size: 11px; color: #94a3b8;">
                    Tautan: <a href="{html.escape(cta_url.strip())}" style="color: {theme_color}; text-decoration: underline;">{html.escape(cta_url.strip())}</a>
                </p>
            </td>
        </tr>
        '''

    # Secondary links
    links_html = ''
    if secondary_links and isinstance(secondary_links, list) and len(secondary_links) > 0:
        links_items = []
        for lk in secondary_links:
            if isinstance(lk, dict) and lk.get('url'):
                label = lk.get('title') or lk.get('label') or lk.get('url')
                links_items.append(f'<li style="margin-bottom: 6px;"><a href="{html.escape(lk["url"])}" target="_blank" style="color: {theme_color}; font-weight: 600; text-decoration: underline;">{html.escape(label)}</a></li>')
        if links_items:
            links_html = f'''
            <tr>
                <td style="padding: 16px 0; border-top: 1px dashed #e2e8f0;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #475569;">Tautan & Informasi Tambahan:</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
                        {''.join(links_items)}
                    </ul>
                </td>
            </tr>
            '''

    footer_content = footer_text or "Barakah Economy &bull; Platform Ekonomi Keumatan Berkah & Mandiri<br/>Email ini dikirim secara otomatis. Jika Anda ingin berhenti berlangganan, hubungi admin pengelola."

    template = f'''<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #fff;">
        {html.escape(plain_snippet)}
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color: #f1f5f9; table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 24px 12px 36px 12px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;" role="presentation">
                    <tr>
                        <td style="background-color: {theme_color}; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding: 28px 32px 18px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                            {badge_html}
                            <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                                {html.escape(title)}
                            </h1>
                            {f'<p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 500;">{html.escape(subtitle)}</p>' if subtitle else ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 28px 32px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                                {hero_html}
                                <tr>
                                    <td>
                                        {body_html}
                                    </td>
                                </tr>
                                {cta_html}
                                {links_html}
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                                {footer_content}
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                Terkirim ke: <strong>{html.escape(recipient_email or 'Penerima Terdaftar')}</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''
    return template


def render_standard_email_html(message="", title="", footer_text="", recipient_email=""):
    """Clean standard HTML wrapper that preserves styling and paragraphs without decorative cards."""
    paragraphs = [p.strip() for p in message.split('\n\n') if p.strip()]
    body_html = ''.join(f'<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">{html.escape(p).replace(chr(10), "<br/>")}</p>' for p in paragraphs)
    footer_content = footer_text or "Barakah Economy &bull; Platform Ekonomi Keumatan Berkah & Mandiri"
    
    return f'''<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(title or 'Pemberitahuan')}</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto;">
        {body_html}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            {footer_content}
        </div>
    </div>
</body>
</html>'''


def send_email(subject, message, recipient_list, from_email=None, fail_silently=False, attachments=None, html_message=None):
    """
    Generic utility to send email using database settings if available,
    falling back to settings.py configuration.
    Supports EmailMultiAlternatives for high deliverability and HTML templates.
    """
    from django.core.mail import EmailMultiAlternatives
    from django.utils.html import strip_tags

    plain_message = strip_tags(html_message or message)
    target_html = html_message if html_message else (message if ('<html' in message.lower() or '<div' in message.lower() or '<table' in message.lower() or '<p' in message.lower()) else None)

    try:
        from digital_products.models import EmailSettings
        from django.core.mail.backends.smtp import EmailBackend
        
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
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=final_from_email,
                to=recipient_list,
                connection=backend,
                headers={'X-Mailer': 'BarakahEconomy Mailer'}
            )
            if target_html:
                email.attach_alternative(target_html, "text/html")

            if attachments:
                for attachment in attachments:
                    if hasattr(attachment, 'read'):
                        email.attach(attachment.name, attachment.read(), getattr(attachment, 'content_type', 'application/octet-stream'))
                    elif isinstance(attachment, tuple) and len(attachment) >= 2:
                        email.attach(*attachment)
            email.send(fail_silently=fail_silently)
            return True
    except Exception as e:
        import logging
        logger = logging.getLogger('barakah_app')
        logger.error(f"Error sending email via custom backend: {e}")
        
    # Fallback to standard Django EmailMultiAlternatives to support attachments & HTML
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=from_email or settings.DEFAULT_FROM_EMAIL,
            to=recipient_list,
            headers={'X-Mailer': 'BarakahEconomy Fallback Mailer'}
        )
        if target_html:
            email.attach_alternative(target_html, "text/html")

        if attachments:
            for attachment in attachments:
                if hasattr(attachment, 'read'):
                    email.attach(attachment.name, attachment.read(), getattr(attachment, 'content_type', 'application/octet-stream'))
                elif isinstance(attachment, tuple) and len(attachment) >= 2:
                    email.attach(*attachment)
        email.send(fail_silently=fail_silently)
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
