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
    recipient_email="",
    attachment_files=None
):
    """
    Generate responsive, highly-compatible HTML email template for promotional/newsletter emails.
    Compatible with Gmail, Apple Mail, Outlook, Yahoo, and mobile clients.
    Guarantees lightweight payload (< 100 KB) to prevent Gmail email clipping ('Pesan dipotong').
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
    
    # Clean hero image URL: If it contains huge raw base64 data URI, never embed it directly into HTML!
    clean_hero_url = (hero_image_url or '').strip()
    if clean_hero_url.startswith('data:image'):
        # Auto-save base64 data into media directory to prevent email truncation
        try:
            import os, uuid, base64
            from django.conf import settings
            target_dir = os.path.join(settings.MEDIA_ROOT, 'broadcast_images')
            os.makedirs(target_dir, exist_ok=True)
            hdr, encoded = clean_hero_url.split(',', 1)
            ext = '.png' if 'png' in hdr else ('.webp' if 'webp' in hdr else '.jpg')
            fname = f"auto_{uuid.uuid4().hex[:12]}{ext}"
            fpath = os.path.join(target_dir, fname)
            with open(fpath, 'wb') as f:
                f.write(base64.b64decode(encoded))
            clean_hero_url = f"https://api.barakah.cloud{settings.MEDIA_URL}broadcast_images/{fname}"
        except Exception:
            clean_hero_url = 'cid:broadcast_hero_image'

    # Hero image tag
    hero_html = ''
    if clean_hero_url:
        hero_html = f'''
        <tr>
            <td align="center" style="padding: 0 0 24px 0;">
                <img src="{html.escape(clean_hero_url)}" alt="{html.escape(title)}" style="max-width: 100%; width: 100%; height: auto; border-radius: 12px; display: block; object-fit: cover;" />
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

    # Visual Attachment Box inside body
    attachments_html = ''
    if attachment_files and isinstance(attachment_files, list) and len(attachment_files) > 0:
        att_items = []
        for att in attachment_files:
            if isinstance(att, (list, tuple)) and len(att) >= 1:
                name = str(att[0])
                size_str = f" ({att[1]})" if len(att) > 1 and att[1] else ""
            elif isinstance(att, str):
                name = att
                size_str = ""
            elif hasattr(att, 'name'):
                name = att.name
                size_str = f" ({getattr(att, 'size', 0) // 1024} KB)" if getattr(att, 'size', 0) else ""
            else:
                name = str(att)
                size_str = ""
            att_items.append(f'<li style="margin-bottom: 5px; color: #334155;"><strong>{html.escape(name)}</strong>{html.escape(size_str)}</li>')
        
        if att_items:
            attachments_html = f'''
            <tr>
                <td style="padding: 16px 20px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; margin-top: 16px;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1e293b;">
                        📎 Lampiran Dokumen ({len(att_items)} File):
                    </p>
                    <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569;">
                        {''.join(att_items)}
                    </ul>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">
                        *File terlampir pada email ini dan dapat langsung diunduh/dilihat pada bagian lampiran.
                    </p>
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
                                {attachments_html}
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


def render_standard_email_html(message="", title="", footer_text="", recipient_email="", attachment_files=None):
    """Clean standard HTML wrapper that preserves styling and paragraphs without decorative cards."""
    paragraphs = [p.strip() for p in message.split('\n\n') if p.strip()]
    body_html = ''.join(f'<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">{html.escape(p).replace(chr(10), "<br/>")}</p>' for p in paragraphs)
    footer_content = footer_text or "Barakah Economy &bull; Platform Ekonomi Keumatan Berkah & Mandiri"
    
    attachments_html = ''
    if attachment_files and isinstance(attachment_files, list) and len(attachment_files) > 0:
        att_items = []
        for att in attachment_files:
            name = att[0] if isinstance(att, (list, tuple)) else str(att)
            size_str = f" ({att[1]})" if isinstance(att, (list, tuple)) and len(att) > 1 and att[1] else ""
            att_items.append(f'<li><strong>{html.escape(str(name))}</strong>{html.escape(size_str)}</li>')
        if att_items:
            attachments_html = f'<div style="margin-top: 20px; padding: 12px 16px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 12px; color: #475569;"><p style="margin:0 0 6px 0; font-weight:700;">📎 Lampiran ({len(att_items)} File):</p><ul style="margin:0; padding-left:18px;">{"".join(att_items)}</ul></div>'

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
        {attachments_html}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            {footer_content}
        </div>
    </div>
</body>
</html>'''


def send_email(subject, message, recipient_list, from_email=None, fail_silently=False, attachments=None, html_message=None, inline_images=None):
    """
    Generic utility to send email using database settings if available,
    falling back to settings.py configuration.
    Supports EmailMultiAlternatives for high deliverability, HTML templates,
    inline CID images, and regular file attachments.
    """
    import logging
    from django.core.mail import EmailMultiAlternatives
    from django.utils.html import strip_tags
    from email.mime.image import MIMEImage

    plain_message = strip_tags(html_message or message)
    target_html = html_message if html_message else (message if ('<html' in message.lower() or '<div' in message.lower() or '<table' in message.lower() or '<p' in message.lower()) else None)

    def _attach_all_parts(email_obj):
        # 1. Attach inline CID images
        if inline_images:
            for img in inline_images:
                try:
                    cid = img.get('cid', 'broadcast_hero_image')
                    data = img.get('data')
                    subtype = img.get('subtype', 'jpeg')
                    filename = img.get('filename', f"{cid}.jpg")
                    if data:
                        mime_img = MIMEImage(data, _subtype=subtype)
                        mime_img.add_header('Content-ID', f"<{cid}>")
                        mime_img.add_header('Content-Disposition', 'inline', filename=filename)
                        email_obj.attach(mime_img)
                except Exception as img_err:
                    logger = logging.getLogger('barakah_app')
                    logger.error(f"Error attaching inline image {img.get('cid')}: {img_err}")

        # 2. Attach regular files
        if attachments:
            for attachment in attachments:
                try:
                    if hasattr(attachment, 'read'):
                        if hasattr(attachment, 'seek'):
                            attachment.seek(0)
                        fname = getattr(attachment, 'name', 'lampiran')
                        content = attachment.read()
                        c_type = getattr(attachment, 'content_type', 'application/octet-stream')
                        email_obj.attach(fname, content, c_type)
                    elif isinstance(attachment, tuple) and len(attachment) >= 2:
                        email_obj.attach(*attachment)
                except Exception as att_err:
                    logger = logging.getLogger('barakah_app')
                    logger.error(f"Error attaching file: {att_err}")

        # Ensure correct MIME type hierarchy
        if inline_images and not attachments:
            email_obj.mixed_subtype = 'related'
        elif attachments:
            email_obj.mixed_subtype = 'mixed'

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

            _attach_all_parts(email)
            email.send(fail_silently=fail_silently)
            return True
    except Exception as e:
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

        _attach_all_parts(email)
        email.send(fail_silently=fail_silently)
        return True
    except Exception as e:
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
