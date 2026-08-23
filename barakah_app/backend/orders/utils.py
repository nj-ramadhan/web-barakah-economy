# orders/utils.py
import logging
from accounts.whatsapp_service import send_message
from profiles.models import Profile
from barakah_app.utils import send_email

from decimal import Decimal
from django.utils import timezone

logger = logging.getLogger('accounts')

def calculate_product_item_price(product, variation=None, quantity=1):
    """
    Calculate the net unit price of a product item considering:
    1. Base price (variation additional_price or product price)
    2. Direct product/variation discount
    3. Active campaign promotions (ProductPromotion: percentage, nominal, wholesale min_qty)
    Returns: Decimal(unit_price)
    """
    try:
        # 1. Base Price
        base_price = Decimal('0')
        if variation and variation.additional_price is not None and Decimal(str(variation.additional_price)) > Decimal('0'):
            base_price = Decimal(str(variation.additional_price))
        elif product and product.price is not None:
            base_price = Decimal(str(product.price))

        unit_price = base_price

        # 2. Direct discount (if no active campaign)
        direct_discount = Decimal('0')
        if variation and getattr(variation, 'discount', None) and Decimal(str(variation.discount)) > Decimal('0'):
            direct_discount = Decimal(str(variation.discount))
        elif product and getattr(product, 'discount', None) and Decimal(str(product.discount)) > Decimal('0'):
            direct_discount = Decimal(str(product.discount))

        if direct_discount > Decimal('0'):
            unit_price = max(Decimal('0'), unit_price - direct_discount)

        # 3. Active Campaign / Promo (ProductPromotion)
        if product:
            now = timezone.now()
            active_promo = product.promotions.filter(
                is_active=True,
                start_date__lte=now,
                end_date__gte=now
            ).first()

            if active_promo:
                promo_val = Decimal(str(active_promo.discount_value or 0))
                disc_type = active_promo.discount_type

                if disc_type == 'percentage':
                    disc_amount = base_price * (promo_val / Decimal('100'))
                    unit_price = max(Decimal('0'), base_price - disc_amount)
                elif disc_type == 'nominal':
                    unit_price = max(Decimal('0'), base_price - promo_val)
                elif disc_type == 'min_qty_discount':
                    min_q = active_promo.min_quantity or 1
                    if quantity >= min_q:
                        if active_promo.is_min_qty_percentage:
                            disc_amount = base_price * (promo_val / Decimal('100'))
                            unit_price = max(Decimal('0'), base_price - disc_amount)
                        else:
                            unit_price = max(Decimal('0'), base_price - promo_val)

        return max(Decimal('0'), unit_price)
    except Exception as e:
        logger.error(f"Error calculating product item price: {e}")
        try:
            return Decimal(str(product.price or 0))
        except Exception:
            return Decimal('0')


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

    admin_fee_val = Decimal(str(getattr(order, 'admin_fee', 0) or 0))
    admin_fee_str = f"Biaya Layanan & Admin: +{format_idr(admin_fee_val)}\n" if admin_fee_val > 0 else ""

    is_cod = (order.payment_method or '').lower() == 'cod'
    cod_amount = order.cod_amount_to_pay if (order.cod_amount_to_pay and order.cod_amount_to_pay > 0) else order.grand_total

    cod_note_str = ""
    if is_cod or (order.cod_amount_to_pay and order.cod_amount_to_pay > 0):
        cod_note_str = (
            f"\n💵 *PEMBAYARAN: COD (BAYAR DI TEMPAT)*\n"
            f"👉 *MOHON SIAPKAN UANG TUNAI:* Sebesar *{format_idr(cod_amount)}* saat paket tiba di alamat Anda.\n"
        )

    message += (
        f"\n*Detail Produk:*\n"
        f"{items_str}\n"
        f"Subtotal: {format_idr(order.total_price)}\n"
        f"Ongkir: {format_idr(order.shipping_cost)} ({order.shipping_courier or 'Standar'})\n"
        f"Voucher: -{format_idr(order.voucher_nominal)}\n"
        f"{admin_fee_str}"
        f"*Total Tagihan: {format_idr(order.grand_total)}*\n"
        f"Metode Bayar: *{order.payment_method}*\n"
        f"{cod_note_str}"
    )

    if order.buyer_note:
        message += f"\n*Catatan Anda:* {order.buyer_note}\n"

    message += "\nTerima kasih telah berbelanja! Pesanan Anda akan segera diproses oleh penjual."

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

    admin_fee_val = Decimal(str(getattr(order, 'admin_fee', 0) or 0))
    admin_fee_str = f"Biaya Layanan & Admin: +{format_idr(admin_fee_val)}\n" if admin_fee_val > 0 else ""

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
        f"Subtotal: {format_idr(order.total_price)}\n"
        f"Ongkos Kirim: {format_idr(order.shipping_cost)}\n"
        f"Diskon Voucher: -{format_idr(order.voucher_nominal)}\n"
        f"{admin_fee_str}"
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

        admin_fee_val = Decimal(str(getattr(order, 'admin_fee', 0) or 0))
        admin_fee_email_str = f"Biaya Layanan & Admin: +{format_idr(admin_fee_val)}\n" if admin_fee_val > 0 else ""

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
{admin_fee_email_str}TOTAL PEMBAYARAN: {format_idr(order.grand_total)}

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

def send_shipping_email_notification(order):
    """Send dedicated delivery email notification to buyer with courier/driver details."""
    try:
        buyer_email = order.user.email if hasattr(order.user, 'email') and order.user.email else None
        if not buyer_email:
            logger.warning(f"No buyer email for order {order.order_number}.")
            return False

        shipping_info = get_order_shipping_details(order)
        items_str = "\n".join([
            f"- {item.product.title}{f' ({item.variation.name})' if item.variation else ''} x{item.quantity} = {format_idr(item.price)}"
            for item in order.items.all()
        ])

        is_kurir_toko = getattr(order, 'shipping_type', '') == 'kurir_toko' or bool(getattr(order, 'driver_name', None))
        confirmation_link = "https://barakah.cloud/riwayat-belanja"

        is_cod = (order.payment_method or '').lower() == 'cod'
        cod_to_pay = order.cod_amount_to_pay if (order.cod_amount_to_pay and order.cod_amount_to_pay > 0) else (order.grand_total if is_cod else Decimal('0'))
        has_cod_pay = cod_to_pay > Decimal('0')

        if is_kurir_toko:
            subject = f"[Barakah Economy] Pesanan #{order.order_number} Sedang Diantar oleh Kurir Toko 🛵"
            driver_phone_clean = clean_phone(order.driver_phone)
            wa_link_str = f"https://wa.me/{driver_phone_clean}" if driver_phone_clean else "-"

            if order.delivery_date and order.delivery_time_slot:
                date_fmt = order.delivery_date.strftime('%d/%m/%Y') if hasattr(order.delivery_date, 'strftime') else str(order.delivery_date)
                jadwal_line = f"Jadwal Pengantaran    : {date_fmt} (Pukul {order.delivery_time_slot} WIB)"
            elif order.delivery_date:
                date_fmt = order.delivery_date.strftime('%d/%m/%Y') if hasattr(order.delivery_date, 'strftime') else str(order.delivery_date)
                jadwal_line = f"Tanggal Pengantaran   : {date_fmt}"
            elif order.estimated_delivery_days and order.estimated_delivery_days > 0:
                jadwal_line = f"Estimasi Waktu Tiba   : {order.estimated_delivery_days} Hari"
            else:
                jadwal_line = f"Estimasi Waktu Tiba   : Pengantaran Langsung Hari Ini"

            shipping_section = f"""=== INFORMASI PENGIRIM (KURIR PRIBADI TOKO) ===
Nama Driver / Pengirim : {order.driver_name or 'Kurir Toko'}
No. Kontak / WA Driver : {order.driver_phone or '-'}
Tautan Chat WhatsApp  : {wa_link_str}
{jadwal_line}
Metode Pengantaran    : Diantar Langsung oleh Toko (Kurir Pribadi)"""
        else:
            subject = f"[Barakah Economy] Pesanan #{order.order_number} Telah Dikirim ({order.shipping_courier or 'Ekspedisi'}) 🚚"
            shipping_section = f"""=== INFORMASI PENGIRIMAN (EKSPEDISI) ===
Ekspedisi / Kurir    : {order.shipping_courier or 'Ekspedisi'}
Nomor Resi Pelacakan : {order.resi_number or 'Sedang diperbarui oleh penjual'}
Estimasi Pengiriman  : {order.estimated_delivery_days or 3} Hari"""

        cod_email_section = ""
        if has_cod_pay:
            cod_email_section = f"""
=== TAGIHAN BAYAR DI TEMPAT (COD) ===
Nominal yang Harus Disiapkan : {format_idr(cod_to_pay)}
* Mohon siapkan uang tunai pas untuk diserahkan kepada kurir saat paket diterima.
"""

        email_body = f"""Halo {shipping_info['recipient_name'] or order.user.username},

Kabar baik! Pesanan Anda di Barakah Economy telah disiapkan dan sedang dalam proses pengiriman.

No. Pesanan : {order.order_number}
Tanggal Pesanan : {order.created_at.strftime('%d/%m/%Y %H:%M')}
Waktu Pengiriman: {timezone.now().strftime('%d/%m/%Y %H:%M')}

{shipping_section}
{cod_email_section}
=== ALAMAT TUJUAN PENGIRIMAN ===
Nama Penerima : {shipping_info['recipient_name']}
No. HP Penerima : {shipping_info['recipient_phone']}
Alamat Tujuan  : {shipping_info['formatted_address']}
{f"Catatan Patokan : {shipping_info['address_detail']}" if shipping_info['address_detail'] else ""}

=== RINCIAN PESANAN ===
{items_str}

Total Pembayaran : {format_idr(order.grand_total)}
Metode Pembayaran: {order.payment_method}

=== KONFIRMASI PENERIMAAN ===
Jika paket sudah Anda terima dengan baik, silakan lakukan konfirmasi penerimaan pesanan melalui link berikut:
{confirmation_link}

Terima kasih telah berbelanja di Barakah Economy!

Salam hangat,
Tim Barakah Economy
https://barakah.cloud
"""

        send_email(
            subject=subject,
            message=email_body,
            recipient_list=[buyer_email],
            fail_silently=True
        )
        return True
    except Exception as e:
        logger.error(f"Error sending shipping email for order {order.order_number}: {e}")
        return False

def send_status_update_notification(order):
    """Notify buyer about order status changes via WhatsApp and Email."""
    raw_phone = order.recipient_phone or (order.user.phone if hasattr(order.user, 'phone') else None)
    phone = clean_phone(raw_phone)

    shipping_info = get_order_shipping_details(order)
    confirmation_link = "https://barakah.cloud/riwayat-belanja"
    is_kurir_toko = getattr(order, 'shipping_type', '') == 'kurir_toko' or bool(getattr(order, 'driver_name', None))

    is_cod = (order.payment_method or '').lower() == 'cod'
    cod_to_pay = order.cod_amount_to_pay if (order.cod_amount_to_pay and order.cod_amount_to_pay > 0) else (order.grand_total if is_cod else Decimal('0'))
    has_cod_pay = cod_to_pay > Decimal('0')

    cod_section_wa = ""
    if has_cod_pay:
        cod_section_wa = (
            f"\n💵 *TAGIHAN BAYAR DI TEMPAT (COD):*\n"
            f"👉 *MOHON SIAPKAN UANG TUNAI:* Sebesar *{format_idr(cod_to_pay)}* untuk diserahkan ke kurir saat paket tiba di alamat Anda.\n"
        )

    items_str = ""
    for item in order.items.all():
        var_str = f" ({item.variation.name})" if item.variation else ""
        items_str += f"- {item.product.title}{var_str} x{item.quantity}\n"

    status_lower = (order.status or '').lower()

    if status_lower == 'proses':
        message = (
            f"*PESANAN SEDANG DIPROSES* 📦\n"
            f"No. Pesanan: {order.order_number}\n\n"
            f"Halo {shipping_info['recipient_name'] or order.user.username}, pesanan Anda sedang dikemas dan disiapkan oleh penjual.\n\n"
            f"*Daftar Produk:*\n{items_str}\n"
            f"Total Tagihan: *{format_idr(order.grand_total)}*\n"
            f"{cod_section_wa}\n"
            f"Kami akan mengirimkan notifikasi kembali saat pesanan siap diberangkatkan.\n"
            f"Cek riwayat belanja: {confirmation_link}"
        )
    elif status_lower == 'dikirim':
        # Also trigger email notification automatically
        send_shipping_email_notification(order)

        if is_kurir_toko:
            driver_phone_clean = clean_phone(order.driver_phone)
            wa_link_str = f"wa.me/{driver_phone_clean}" if driver_phone_clean else "-"

            if order.delivery_date and order.delivery_time_slot:
                date_fmt = order.delivery_date.strftime('%d/%m/%Y') if hasattr(order.delivery_date, 'strftime') else str(order.delivery_date)
                jadwal_info_wa = f"• 📅 Jadwal Pengantaran: *{date_fmt} (Pukul {order.delivery_time_slot} WIB)*\n"
            elif order.delivery_date:
                date_fmt = order.delivery_date.strftime('%d/%m/%Y') if hasattr(order.delivery_date, 'strftime') else str(order.delivery_date)
                jadwal_info_wa = f"• 📅 Tanggal Pengantaran: *{date_fmt}*\n"
            elif order.estimated_delivery_days and order.estimated_delivery_days > 0:
                jadwal_info_wa = f"• ⏱️ Estimasi Tiba: *{order.estimated_delivery_days} Hari*\n"
            else:
                jadwal_info_wa = f"• 🚀 Pengantaran: *Langsung Hari Ini*\n"

            message = (
                f"*PESANAN SEDANG DIKIRIM (KURIR TOKO)* 🛵\n"
                f"No. Pesanan: {order.order_number}\n\n"
                f"Halo *{shipping_info['recipient_name'] or order.user.username}*, paket pesanan Anda sedang *DIANTAR LANGSUNG* oleh kurir/driver toko!\n\n"
                f"🛵 *Detail Pengirim (Driver Toko):*\n"
                f"• Nama Pengirim: *{order.driver_name or 'Driver Toko'}*\n"
                f"• No. Telp / WA: *{order.driver_phone or '-'}*\n"
                f"• Chat WA Driver: {wa_link_str}\n"
                f"{jadwal_info_wa}\n"
                f"📍 *Alamat Pengantaran:*\n"
                f"{shipping_info['formatted_address']}\n\n"
                f"📋 *Daftar Produk:*\n{items_str}\n"
                f"Total Tagihan: *{format_idr(order.grand_total)}*\n"
                f"{cod_section_wa}\n"
                f"Harap pastikan penerima berada di tempat. Jika pesanan sudah diterima, mohon konfirmasi melalui tautan:\n"
                f"{confirmation_link}\n\n"
                f"Terima kasih telah berbelanja di Barakah Economy!"
            )
        else:
            message = (
                f"*PESANAN TELAH DIKIRIM (EKSPEDISI)* 🚚\n"
                f"No. Pesanan: {order.order_number}\n\n"
                f"Halo *{shipping_info['recipient_name'] or order.user.username}*, pesanan Anda telah *DISERAHKAN KE EKSPEDISI* untuk dikirimkan!\n\n"
                f"🚚 *Detail Ekspedisi:*\n"
                f"• Kurir: *{order.shipping_courier or 'Ekspedisi'}*\n"
                f"• Nomor Resi: *{order.resi_number or 'Sedang diperbarui penjual'}*\n"
                f"• Estimasi Pengiriman: *{order.estimated_delivery_days or 3} Hari*\n\n"
                f"📍 *Alamat Tujuan:*\n"
                f"{shipping_info['formatted_address']}\n\n"
                f"📋 *Daftar Produk:*\n{items_str}\n"
                f"Total Tagihan: *{format_idr(order.grand_total)}*\n"
                f"{cod_section_wa}\n"
                f"Lacak pesanan dan konfirmasi penerimaan melalui tautan:\n"
                f"{confirmation_link}\n\n"
                f"Terima kasih telah berbelanja di Barakah Economy!"
            )
    elif status_lower == 'selesai':
        message = (
            f"*PESANAN SELESAI* ✅\n"
            f"No. Pesanan: {order.order_number}\n\n"
            f"Halo {shipping_info['recipient_name'] or order.user.username}, pesanan Anda telah selesai diterima. Terima kasih banyak telah berbelanja di Barakah Economy! Semoga membawa berkah dan manfaat."
        )
    elif status_lower == 'batal':
        message = (
            f"*PESANAN DIBATALKAN* ❌\n"
            f"No. Pesanan: {order.order_number}\n\n"
            f"Halo {shipping_info['recipient_name'] or order.user.username}, mohon maaf pesanan #{order.order_number} telah dibatalkan."
        )
    else:
        message = (
            f"*UPDATE PESANAN BARAKAH ECONOMY*\n"
            f"No. Pesanan: {order.order_number}\n\n"
            f"Status pesanan Anda telah diperbarui menjadi: *{order.status}*\n\n"
            f"Silakan cek dashboard belanja Anda: {confirmation_link}"
        )

    if phone:
        return send_message(phone, message)
    return {'success': False, 'message': 'Nomor HP pembeli tidak tersedia'}
