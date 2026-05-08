import os
import django
import sys

# Setup Django
sys.path.append('d:\\Galang\\BAE\\website\\web bae\\web-barakah-economy\\barakah_app\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from accounts import whatsapp_service
from events.models import EventRegistration
import base64

def test_qr_send():
    # Use a real registration ID if possible, or just a dummy
    reg = EventRegistration.objects.get(id=3)
    if not reg:
        print("No registration found")
        return

    phone = reg.responses.get('No HP') or reg.responses.get('no hp') or reg.responses.get('WhatsApp') or reg.responses.get('whatsapp')
    if not phone and reg.user:
        phone = reg.user.phone
    
    if not phone:
        print("No phone found")
        return

    # Format phone
    digits = ''.join(filter(str.isdigit, str(phone)))
    if digits.startswith('0'): digits = '62' + digits[1:]
    elif digits.startswith('8'): digits = '62' + digits
    
    print(f"Testing send to {digits}")
    
    if reg.qr_image:
        try:
            with reg.qr_image.open('rb') as f:
                content = f.read()
                print(f"Read {len(content)} bytes from QR image")
                encoded = base64.b64encode(content).decode('utf-8')
                qr_b64 = f"data:image/png;base64,{encoded}"
                
                res = whatsapp_service.send_file(
                    digits, 
                    f"Test QR {reg.unique_code}", 
                    qr_b64, 
                    filename=f"test_{reg.unique_code}.png"
                )
                print(f"Result: {res}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("No QR image on registration")

if __name__ == "__main__":
    test_qr_send()
