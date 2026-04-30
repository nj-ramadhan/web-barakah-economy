# orders/utils.py
import logging
from accounts.whatsapp_service import send_message
from profiles.models import Profile

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

def send_order_invoice_to_buyer(order, alternate_phone=None):
    """Send a formatted text invoice to the buyer."""
    raw_phone = alternate_phone if alternate_phone else (order.user.phone if hasattr(order.user, 'phone') else None)
    phone = clean_phone(raw_phone)
    if not phone:
        logger.warning(f"Cannot send invoice to buyer {order.user.username}: No phone number.")
        return {'success': False, 'message': 'Nomor HP tidak ditemukan'}

    items_str = ""
    for item in order.items.all():
        var_str = f" ({item.variation.name})" if item.variation else ""
        items_str += f"- {item.product.title}{var_str} x{item.quantity}\n"

    message = (
        f"*INVOICE BARAKAH ECONOMY*\n"
        f"No. Pesanan: {order.order_number}\n"
        f"Tanggal: {order.created_at.strftime('%d/%m/%Y %H:%M')}\n\n"
        f"*Detail Produk:*\n"
        f"{items_str}\n"
        f"Subtotal: {format_idr(order.total_price)}\n"
        f"Ongkir: {format_idr(order.shipping_cost)} ({order.shipping_courier})\n"
        f"Voucher: -{format_idr(order.voucher_nominal)}\n"
        f"*Total Bayar: {format_idr(order.grand_total)}*\n\n"
        f"Status: *{order.status}*\n"
        f"{'Metode: *COD (Bayar di Tempat)*' if order.payment_method == 'COD' else ''}\n\n"
    )

    if order.buyer_note:
        message += f"*Catatan Anda:* {order.buyer_note}\n\n"

    # Add instructions from products
    instr_list = [i.product.purchase_instructions for i in order.items.all() if i.product.purchase_instructions]
    if instr_list:
        message += f"*INFORMASI PENTING (INSTRUKSI):*\n"
        for instr in instr_list:
            message += f"- {instr}\n"
        message += "\n"

    if order.seller and order.seller.phone:
        message += f"*KONTAK PENJUAL:* wa.me/{clean_phone(order.seller.phone)}\n\n"

    message += f"Terima kasih telah berbelanja! Pesanan Anda akan segera diproses oleh penjual."
    
    return send_message(phone, message)

def send_order_notification_to_seller(order):
    """Send detailed order info to the seller."""
    if not order.seller:
        logger.warning(f"Order {order.order_number} has no seller assigned.")
        return
        
    # Get seller phone (prioritizing User.phone as Profile has no phone field)
    raw_phone = order.seller.phone
    phone = clean_phone(raw_phone)
    
    # Fallback to a default admin number if seller phone is missing
    if not phone:
        # Example default Barakah Admin number
        phone = '628121111111' 
        logger.warning(f"Seller {order.seller.username} has no phone number. Using default: {phone}")

    # Get buyer profile for full address
    try:
        profile = Profile.objects.get(user=order.user)
        address = (
            f"{profile.address}\n"
            f"{profile.address_city_name}, {profile.address_province}\n"
            f"{profile.address_postal_code}"
        )
        buyer_name = profile.name_full or order.user.username
    except Profile.DoesNotExist:
        address = "Alamat tidak ditemukan di profil."
        buyer_name = order.user.username

    items_str = ""
    for item in order.items.all():
        var_str = f" ({item.variation.name})" if item.variation else ""
        items_str += f"- {item.product.title}{var_str} x{item.quantity}\n"

    message = (
        f"*PESANAN BARU MASUK! (SINERGY)*\n"
        f"No. Pesanan: {order.order_number}\n\n"
        f"*Data Pemesan:*\n"
        f"Nama: {buyer_name}\n"
        f"No. HP: {order.user.phone}\n"
        f"Chat Pembeli: wa.me/{clean_phone(order.user.phone)}\n\n"
        f"*Alamat Kirim:*\n"
        f"{address}\n\n"
        f"*Daftar Produk:*\n"
        f"{items_str}\n"
        f"Total Transaksi: {format_idr(order.grand_total)}\n"
        f"Metode Bayar: *{order.payment_method}*\n\n"
    )

    if order.buyer_note:
        message += f"*Catatan Pembeli:* {order.buyer_note}\n\n"

    if order.payment_method == 'COD':
        message += "⚠️ *PESANAN COD:* Harap hubungi pembeli untuk konfirmasi pengiriman dan pembayaran di tempat.\n\n"

    message += f"Silakan segera diproses dan didaftarkan ke ekspedisi sesuai kurir pilihan ({order.shipping_courier})."
    
    return send_message(phone, message)

def send_status_update_notification(order):
    """Notify buyer about order status changes."""
    phone = clean_phone(order.user.phone)
    if not phone:
        return

    status_msg = ""
    if order.status.lower() == 'proses':
        status_msg = "Pesanan Anda sedang diproses oleh penjual."
    elif order.status.lower() == 'dikirim':
        status_msg = f"Pesanan Anda telah dikirim!\nNomor Resi: *{order.resi_number or 'Sedang diupdate'}*"
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
