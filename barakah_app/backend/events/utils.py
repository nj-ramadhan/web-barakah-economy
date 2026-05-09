import os
import qrcode
import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from django.conf import settings
from django.core.files.base import ContentFile

def generate_special_qr_image(registration):
    event = registration.event
    try:
        special_qr = event.special_qr_template
    except:
        return None

    if not special_qr or not special_qr.template_image or not special_qr.is_active:
        return None

    # Load template
    try:
        img = Image.open(special_qr.template_image.path).convert("RGB")
    except Exception as e:
        print(f"Error opening template: {e}")
        return None

    draw = ImageDraw.Draw(img)
    width, height = img.size

    # 1. Draw QR or Barcode
    code_buffer = BytesIO()
    if special_qr.code_type == 'barcode':
        # Generate Barcode
        EAN = barcode.get_barcode_class('code128')
        ean = EAN(registration.unique_code, writer=ImageWriter())
        ean.write(code_buffer)
    else:
        # Generate QR Code
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(registration.unique_code)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img.save(code_buffer, format="PNG")

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
    # field_layouts: [ { field_id: ID, x: X, y: Y, font_size: SIZE, color: COLOR, font_family: FONT, is_photo: BOOL, shape: SHAPE, width: W, height: H }, ... ]
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

                # Resize photo with cropping to fit target aspect ratio
                # (Standard thumbnail logic: crop to center)
                p_w, p_h = participant_photo.size
                target_ratio = target_w / target_h
                actual_ratio = p_w / p_h

                if actual_ratio > target_ratio:
                    # Photo is wider than target
                    new_w = int(target_ratio * p_h)
                    offset = (p_w - new_w) // 2
                    participant_photo = participant_photo.crop((offset, 0, offset + new_w, p_h))
                else:
                    # Photo is taller than target
                    new_h = int(p_w / target_ratio)
                    offset = (p_h - new_h) // 2
                    participant_photo = participant_photo.crop((0, offset, p_w, offset + new_h))

                participant_photo = participant_photo.resize((target_w, target_h), Image.Resampling.LANCZOS)

                # Apply Shape Mask
                mask = Image.new('L', (target_w, target_h), 0)
                mask_draw = ImageDraw.Draw(mask)
                
                if shape == 'circle':
                    mask_draw.ellipse((0, 0, target_w, target_h), fill=255)
                elif shape == 'square' or shape == 'portrait':
                    mask_draw.rectangle((0, 0, target_w, target_h), fill=255)
                
                # Paste photo
                img.paste(participant_photo, (px - target_w // 2, py - target_h // 2), mask)

            except Exception as e:
                print(f"Error drawing photo: {e}")
                continue

        else:
            # Handle Text field
            value = registration.responses.get(field_id, "")
            
            # If not found in responses, check if it's a fixed field (Nama/Email/etc)
            if not value:
                # Try to match label if it's not ID based (legacy support)
                from .models import EventFormField
                try:
                    field = EventFormField.objects.get(id=field_id)
                    value = registration.responses.get(field.label, "")
                except:
                    pass

            if not value:
                continue

            # Position
            fx = int(layout.get('x', 0) * width / 100)
            fy = int(layout.get('y', 0) * height / 100)
            fsize = int(layout.get('font_size', 20))
            fcolor = layout.get('color', '#000000')
            ffamily = layout.get('font_family', 'Roboto-Bold.ttf')

            # Load font
            font_path = os.path.join(settings.BASE_DIR, 'events', 'fonts', ffamily)
            if not os.path.exists(font_path):
                font_path = os.path.join(settings.BASE_DIR, 'events', 'fonts', 'Roboto-Bold.ttf')
            
            try:
                font = ImageFont.truetype(font_path, fsize)
            except:
                font = ImageFont.load_default()

            # Draw text (centered at fx, fy)
            try:
                text_bbox = draw.textbbox((0, 0), str(value), font=font)
                text_width = text_bbox[2] - text_bbox[0]
                text_height = text_bbox[3] - text_bbox[1]
                draw.text((fx - text_width // 2, fy - text_height // 2), str(value), fill=fcolor, font=font)
            except:
                draw.text((fx, fy), str(value), fill=fcolor, font=font)

    # Save to buffer
    result_buffer = BytesIO()
    img.save(result_buffer, format="JPEG", quality=90)
    return ContentFile(result_buffer.getvalue())
