# orders/utils.py
import logging
from accounts.whatsapp_service import send_message
from profiles.models import Profile
from barakah_app.utils import send_email

logger = logging.getLogger('accounts')

def format_idr(amount):
    return 'Rp ' + '{:,.0f}'.format(amount).replace(',', '.')

def clean_phone(phone):
    """Clean phone number for WhatsApp API (e.g., 0812 -> 62812)."""
    if not phone:
        return None
    phone = str(phone).strip().replace(' ', '').replace('-', '').replace('+', '')
    if phone.startswith('0'):
        phone = '62' + phone[1:]
    return phone

def get_order_shipping_details(order):
    """Helper to extract full shipping address details for an order."""
    recipient_name = order.recipient_name
    recipient_phone = order.recipient_phone

    if not recipient_name or not recipient_phone:
        try:
            profile = Profile.objects.get(user=order.user)
            recipient_name = recipient_name or profile.name_full or order.user.username
            recipient_phone = recipient_phone or getattr(order.user, 'phone', '') or getattr(profile, 'phone', '')
        except Profile.DoesNotExist:
            recipient_name = recipient_name or order.user.username
            recipient_phone = recipient_phone or getattr(order.user, 'phone', '')

    addr_parts = [
        order.shipping_address,
        f"Kel. {order.shipping_village}" if order.shipping_village else None,
        f"Kec. {order.shipping_district}" if order.shipping_district else None,
        order.shipping_city,
        order.shipping_province,
        order.shipping_postal_code
    ]
    formatted_address = ", ".join([p for p in addr_parts if p])

    if not formatted_address:
        try:
            profile = Profile.objects.get(user=order.user)
            p_parts = [
                profile.address,
                profile.address_village_name,
                profile.address_subdistrict_name,
                profile.address_city_name,
                profile.address_province,
                profile.address_postal_code
            ]
            formatted_address = ", ".join([p for p in p_parts if p])
        except Profile.DoesNotExist:
            formatted_address = "Alamat belum disetting."

    maps_link = None
    if order.shipping_coordinates:
        coords = order.shipping_coordinates.strip().replace(' ', '')
        maps_link = f"https://maps.google.com/?q={coords}"

    return {
        'recipient_name': recipient_name,
        'recipient_phone': recipient_phone,
        'formatted_address': formatted_address,
        'address_detail': order.shipping_address_detail or '',
        'coordinates': order.shipping_coordinates or '',
        'maps_link': maps_link
    }

def send_order_invoice_to_buyer(order, alternate_phone=None):
    """Send a formatted text invoice to the buyer."""
    raw_phone = alternate_phone if alternate_phone else (order.recipient_phone or (order.user.phone if hasattr(order.user, 'phone') else None))
    phone = clean_phone(raw_phone)
    if not phone:
        logger.warning(f"Cannot send invoice to buyer {order.user.username}: No phone number.")
        return {'success': False, 'message': 'Nomor HP tidak ditemukan'}

    shipping_info = get_order_shipping_details(order)

    items_str = ""
    for item in order.items.all():
        var_str = f" ({item.variation.name})" if item.variation else ""
        items_str += f"- {item.product.title}{var_str} x{item.quantity}\n"

    message = (
        f"*INVOICE BARAKAH ECONOMY*\n"
        f"No. Pesanan: {order.order_number}\n"
        f"Tanggal: {order.created_at.strftime('%d/%m/%Y %H:%M')}\n\n"
        f"*Penerima & Alamat Pengiriman:*\n"
        f"Nama Penerima: {shipping_info['recipient_name']}\n"
        f"No. Telp: {shipping_info['recipient_phone']}\n"
        f"Alamat: {shipping_info['formatted_address']}\n"
    )
    if shipping_info['address_detail']:
        message += f"Catatan Patokan: {shipping_info['address_detail']}\n"
    if shipping_info['maps_link']:
        message += f"Titik GPS: {shipping_info['maps_link']}\n"

    message += (
        f"\n*Detail Produk:*\n"
        f"{items_str}\n"
        f"Subtotal: {format_idr(order.total_price)}\n"
        f"Ongkir: {format_idr(order.shipping_cost)} ({order.shipping_courier or 'Standar'})\n"
        f"Voucher: -{format_idr(order.voucher_nominal)}\n"
        f"*Total Bayar: {format_idr(order.grand_total)}*\n\n"
        f"Metode: *COD (Bayar di Tempat)*\n" if order.payment_method == 'COD' else f"Metode: *{order.payment_method}*\n"
    )

    if order.buyer_note:
        message += f"*Catatan Anda:* {order.buyer_note}\n\n"

    message += "Terima kasih telah berbelanja! Pesanan Anda akan segera diproses oleh penjual."

    return send_message(phone, message)

def send_order_notification_to_seller(order):
    """Send detailed order info to the seller via WhatsApp."""
    if not order.seller:
        logger.warning(f"Order {order.order_number} has no seller assigned.")
        return

    raw_phone = order.seller.phone
    phone = clean_phone(raw_phone)

    if not phone:
        phone = '628121111111'
        logger.warning(f"Seller {order.seller.username} has no phone number. Using default: {phone}")

    shipping_info = get_order_shipping_details(order)

    items_str = ""
    for item in order.items.all():
        var_str = f" ({item.variation.name})" if item.variation else ""
        items_str += f"- {item.product.title}{var_str} x{item.quantity}\n"

    pay_status = "BAYAR DI TEMPAT (COD)" if (order.payment_method or '').lower() == 'cod' else ("SUDAH DIBAYAR (LUNAS via QRIS/Transfer)" if (order.status or '').lower() in ['paid', 'lunas', 'proses'] else "MENUNGGU PEMBAYARAN")

    message = (
        f"*PESANAN BARU MASUK! (BARAKAH ECONOMY)*\n"
        f"No. Pesanan: {order.order_number}\n"
        f"STATUS PEMBAYARAN: *{pay_status}*\n\n"
        f"*Data Pemesan & Penerima:*\n"
        f"Nama Akun Pembeli: {order.user.username}\n"
        f"Nama Penerima: {shipping_info['recipient_name']}\n"
        f"No. HP Penerima: {shipping_info['recipient_phone']}\n"
        f"Chat Pembeli (WA): wa.me/{clean_phone(shipping_info['recipient_phone']) or ''}\n\n"
        f"*Alamat Pengiriman Lengkap:*\n"
        f"{shipping_info['formatted_address']}\n"
    )

    if shipping_info['address_detail']:
        message += f"Catatan Patokan: {shipping_info['address_detail']}\n"
    if shipping_info['maps_link']:
        message += f"Titik Lokasi GPS: {shipping_info['maps_link']}\n"

    message += (
        f"\n*Daftar Produk:*\n"
        f"{items_str}\n"
        f"Total Transaksi: {format_idr(order.grand_total)}\n"
        f"Metode Bayar: *{order.payment_method}* ({pay_status})\n"
        f"Ekspedisi / Kurir: *{order.shipping_courier or '-'}*\n\n"
    )

    if order.buyer_note:
        message += f"*Catatan Pembeli:* {order.buyer_note}\n\n"

    if (order.payment_method or '').lower() == 'cod':
        message += "⚠️ *PESANAN COD:* Harap hubungi pembeli untuk konfirmasi pengiriman dan pembayaran di tempat.\n\n"

    message += f"Silakan segera diproses dan didaftarkan ke ekspedisi sesuai kurir pilihan ({order.shipping_courier or '-'})."

    return send_message(phone, message)

def send_order_email_notifications(order):
    """Send order details & full shipping address to buyer & seller emails."""
    try:
        shipping_info = get_order_shipping_details(order)
        items_str = "\n".join([
            f"- {item.product.title}{f' ({item.variation.name})' if item.variation else ''} x{item.quantity} = {format_idr(item.price)}"
            for item in order.items.all()
        ])

        subject = f"[Barakah Economy] Pesanan Baru #{order.order_number}"
        
        gps_text = f"Lokasi GPS: {shipping_info['maps_link']}" if shipping_info['maps_link'] else "Lokasi GPS: Tidak dicantumkan"
        patokan_text = f"Catatan Patokan: {shipping_info['address_detail']}" if shipping_info['address_detail'] else ""

        email_body = f"""
Halo,

Berikut adalah rincian transaksi pesanan Barakah Economy:

No. Pesanan: {order.order_number}
Tanggal: {order.created_at.strftime('%d/%m/%Y %H:%M')}
Status Pembayaran: {order.status.upper()} (Metode: {order.payment_method})

=== DATA PENERIMA & ALAMAT PENGIRIMAN ===
Nama Penerima: {shipping_info['recipient_name']}
No. HP: {shipping_info['recipient_phone']}
Alamat Lengkap: {shipping_info['formatted_address']}
{patokan_text}
{gps_text}

=== DETAIL PESANAN ===
{items_str}

Subtotal Produk: {format_idr(order.total_price)}
Ongkos Kirim: {format_idr(order.shipping_cost)} ({order.shipping_courier or '-'})
Voucher Diskon: -{format_idr(order.voucher_nominal)}
TOTAL PEMBAYARAN: {format_idr(order.grand_total)}

Catatan Pembeli: {order.buyer_note or '-'}

Terima Kasih,
Barakah Economy Team
        """

        # 1. Send to Buyer login email
        buyer_email = order.user.email
        if buyer_email:
            send_email(
                subject=f"Konfirmasi Pesanan #{order.order_number} - Barakah Economy",
                message=email_body,
                recipient_list=[buyer_email],
                fail_silently=True
            )

        # 2. Send to Seller login email
        seller_email = order.seller.email if order.seller else None
        if seller_email and seller_email != buyer_email:
            send_email(
                subject=f"Pesanan Baru Diterima #{order.order_number} - Barakah Economy",
                message=email_body,
                recipient_list=[seller_email],
                fail_silently=True
            )

    except Exception as e:
        logger.error(f"Error sending order email notifications for {order.order_number}: {e}")

def send_status_update_notification(order):
    """Notify buyer about order status changes."""
    phone = clean_phone(order.recipient_phone or order.user.phone)
    if not phone:
        return

    status_msg = ""
    if order.status.lower() == 'proses':
        status_msg = "Pesanan Anda sedang diproses oleh penjual."
    elif order.status.lower() == 'dikirim':
        confirmation_link = f"https://barakah.cloud/dashboard/history"
        status_msg = (
            f"Pesanan Anda telah dikirim!\n"
            f"Nomor Resi: *{order.resi_number or 'Sedang diupdate'}*\n\n"
            f"Silakan konfirmasi jika pesanan sudah diterima di link berikut:\n"
            f"{confirmation_link}"
        )
    elif order.status.lower() == 'selesai':
        status_msg = "Pesanan Anda telah dinyatakan selesai. Terima kasih!"
    elif order.status.lower() == 'batal':
        status_msg = "Mohon maaf, pesanan Anda telah dibatalkan."
    else:
        status_msg = f"Status pesanan Anda telah diperbarui menjadi: *{order.status}*"

    message = (
        f"*UPDATE PESANAN BARAKAH ECONOMY*\n"
        f"No. Pesanan: {order.order_number}\n\n"
        f"{status_msg}\n\n"
        f"Silakan cek dashboard untuk detail selengkapnya."
    )

    return send_message(phone, message)
