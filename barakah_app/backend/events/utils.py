import os
import qrcode
import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from django.conf import settings
from django.core.files.base import ContentFile

def generate_special_qr_image(registration):
    import logging
    logger = logging.getLogger(__name__)
    event = registration.event
    try:
        special_qr = event.special_qr_template
    except Exception as e:
        logger.warning(f"No special QR template found for event {event.id}: {e}")
        return None

    if not special_qr:
        logger.warning(f"Special QR template is None for event {event.id}")
        return None
        
    if not special_qr.template_image:
        logger.warning(f"Special QR template has no image for event {event.id}")
        return None
        
    if not special_qr.is_active:
        logger.warning(f"Special QR template is NOT active for event {event.id}")
        return None

    # Load template
    img = None
    try:
        # 1. Try standard Django .path
        img = Image.open(special_qr.template_image.path).convert("RGB")
    except Exception as e:
        logger.warning(f"Failed to open template via .path: {e}. Trying fallback...")
        try:
            # 2. Try manual path building if .path is weird (e.g. starts with /media/)
            raw_path = str(special_qr.template_image.name)
            if raw_path.startswith('/media/'):
                raw_path = raw_path.replace('/media/', '', 1)
            full_path = os.path.join(settings.MEDIA_ROOT, raw_path)
            img = Image.open(full_path).convert("RGB")
        except Exception as e2:
            logger.error(f"All attempts to open template image failed: {e2}")
            return None

    if not img:
        return None

    draw = ImageDraw.Draw(img)
    width, height = img.size

    # 1. Draw QR or Barcode
    code_buffer = BytesIO()
    try:
        if special_qr.code_type == 'barcode':
            # Generate Barcode
            EAN = barcode.get_barcode_class('code128')
            ean = EAN(registration.unique_code, writer=ImageWriter())
            # writer_options = {'write_text': False} # Can hide text if needed
            ean.write(code_buffer)
        else:
            # Generate QR Code
            qr = qrcode.QRCode(version=1, box_size=10, border=2)
            qr.add_data(registration.unique_code)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_img.save(code_buffer, format="PNG")
    except Exception as e:
        logger.error(f"Error generating code for special QR: {e}")
        return None

    code_buffer.seek(0)
    code_img = Image.open(code_buffer).convert("RGBA")
    
    # Calculate pixel position
    cx = int(special_qr.code_x * width / 100)
    cy = int(special_qr.code_y * height / 100)
    cw = int(special_qr.code_width * width / 100)
    ch = int(special_qr.code_height * height / 100)
    
    # Resize code image
    code_img = code_img.resize((cw, ch), Image.Resampling.LANCZOS)
    
    # Paste code (cx, cy are center coordinates)
    paste_x = cx - (cw // 2)
    paste_y = cy - (ch // 2)
    img.paste(code_img, (paste_x, paste_y), code_img)

    # 2. Draw Dynamic Fields & Photos
    for layout in special_qr.field_layouts:
        field_id = str(layout.get('field_id'))
        is_photo = layout.get('is_photo', False)
        
        if is_photo:
            # Handle Image/Photo field
            from .models import EventRegistrationFile
            photo_file = EventRegistrationFile.objects.filter(registration=registration, field_id=field_id).first()
            if not photo_file or not photo_file.file:
                continue

            try:
                participant_photo = Image.open(photo_file.file.path).convert("RGBA")
                
                # Position
                px = int(layout.get('x', 0) * width / 100)
                py = int(layout.get('y', 0) * height / 100)
                pw_pct = layout.get('width', 15)
                ph_pct = layout.get('height', 20)
                shape = layout.get('shape', 'square')

                # Calculate target size in pixels
                target_w = int(pw_pct * width / 100)
                target_h = int(ph_pct * height / 100)

                # Resize photo with cropping
                p_w, p_h = participant_photo.size
                target_ratio = target_w / target_h
                actual_ratio = p_w / p_h

                if actual_ratio > target_ratio:
                    new_w = int(target_ratio * p_h)
                    offset = (p_w - new_w) // 2
                    participant_photo = participant_photo.crop((offset, 0, offset + new_w, p_h))
                else:
                    new_h = int(p_w / target_ratio)
                    offset = (p_h - new_h) // 2
                    participant_photo = participant_photo.crop((0, offset, p_w, offset + new_h))

                participant_photo = participant_photo.resize((target_w, target_h), Image.Resampling.LANCZOS)

                # Mask
                mask = Image.new('L', (target_w, target_h), 0)
                mask_draw = ImageDraw.Draw(mask)
                if shape == 'circle':
                    mask_draw.ellipse((0, 0, target_w, target_h), fill=255)
                else:
                    mask_draw.rectangle((0, 0, target_w, target_h), fill=255)
                
                img.paste(participant_photo, (px - target_w // 2, py - target_h // 2), mask)
            except Exception as e:
                logger.error(f"Error drawing photo field {field_id}: {e}")

        else:
            # Handle Text field
            value = registration.responses.get(field_id, "")
            if not value:
                # Try fallback by label if ID fails
                from .models import EventFormField
                try:
                    field = EventFormField.objects.get(id=field_id)
                    value = registration.responses.get(field.label, "")
                except: pass

            if not value: continue

            fx = int(layout.get('x', 0) * width / 100)
            fy = int(layout.get('y', 0) * height / 100)
            fsize = int(layout.get('font_size', 20))
            fcolor = layout.get('color', '#000000')
            ffamily = layout.get('font_family', 'Roboto-Bold.ttf')

            font_path = os.path.join(settings.BASE_DIR, 'events', 'fonts', ffamily)
            if not os.path.exists(font_path):
                font_path = os.path.join(settings.BASE_DIR, 'events', 'fonts', 'Roboto-Bold.ttf')
            
            try:
                font = ImageFont.truetype(font_path, fsize)
            except:
                font = ImageFont.load_default()

            try:
                # Support for older Pillow versions
                if hasattr(draw, 'textbbox'):
                    bbox = draw.textbbox((0, 0), str(value), font=font)
                    tw = bbox[2] - bbox[0]
                    th = bbox[3] - bbox[1]
                else:
                    tw, th = draw.textsize(str(value), font=font)
                
                draw.text((fx - tw // 2, fy - th // 2), str(value), fill=fcolor, font=font)
            except Exception as e:
                logger.warning(f"Text drawing fallback: {e}")
                draw.text((fx, fy), str(value), fill=fcolor, font=font)

    # Save to buffer
    result_buffer = BytesIO()
    img.save(result_buffer, format="JPEG", quality=95)
    return ContentFile(result_buffer.getvalue())
