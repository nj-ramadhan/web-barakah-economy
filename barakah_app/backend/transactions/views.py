# transactions/views.py
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from decimal import Decimal
from django.utils import timezone
from .models import UserWallet, WalletTransaction, OutgoingFund
from .serializers import UserWalletSerializer, WalletTransactionSerializer

logger = logging.getLogger(__name__)

class UserWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = UserWallet.get_or_create_wallet(request.user)
        serializer = UserWalletSerializer(wallet)
        return Response(serializer.data)

class WalletTransactionHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = UserWallet.get_or_create_wallet(request.user)
        transactions = WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
        serializer = WalletTransactionSerializer(transactions, many=True)
        return Response({
            'balance': wallet.balance,
            'transactions': serializer.data
        })


class AdminIncomingFundsView(APIView):
    """
    Unified Incoming Funds (Manajemen Uang Masuk) tracking endpoint for Admin role.
    Filters strictly to incoming funds:
    - Paid / Verified / Completed / Shipping orders are included.
    - Cancelled orders that were never paid/transferred are omitted.
    - Cancelled orders that were already paid/transferred (and refunded) are included with full refund notes.
    - Allows Admin deletion of buggy/invalid transaction records.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_admin = (
            user.is_superuser or 
            user.is_staff or 
            getattr(user, 'role', '') in ['admin', 'staff'] or 
            getattr(getattr(user, 'profile', None), 'role', '') in ['admin', 'staff'] or
            (hasattr(user, 'custom_roles') and user.custom_roles.filter(Q(name__icontains='admin') | Q(code__icontains='admin')).exists())
        )

        if not is_admin:
            return Response(
                {'error': 'Akses khusus administrator. Anda tidak memiliki izin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        account_filter = request.query_params.get('account', 'all').lower()
        category_filter = request.query_params.get('category', 'all').lower()
        status_filter = request.query_params.get('status', 'all').lower()
        payment_method_filter = request.query_params.get('payment_method', 'all').lower()
        search_query = request.query_params.get('search', '').strip().lower()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        transactions = []

        # 1. STORE / E-COMMERCE ORDERS (ALL SELLERS TRACKING)
        try:
            from orders.models import Order
            store_orders = Order.objects.all().select_related(
                'user', 'seller', 'user__profile', 'seller__profile'
            ).prefetch_related('items', 'items__product', 'items__variation', 'items__product__seller', 'items__product__seller__profile').order_by('-created_at')

            for o in store_orders:
                try:
                    raw_status = (o.status or '').lower()
                    has_proof = bool(getattr(o, 'payment_proof', None) and hasattr(o.payment_proof, 'url') and o.payment_proof)
                    is_paid_status = raw_status in ['paid', 'lunas', 'proses', 'dikirim', 'shipped', 'selesai', 'delivered']
                    is_batal = raw_status in ['batal', 'cancelled']
                    
                    # Check if cancelled order had money transferred / refunded
                    has_refund_tx = WalletTransaction.objects.filter(order=o, transaction_type='REFUND').exists()
                    used_bal = float(getattr(o, 'used_balance', 0) or 0)
                    was_paid_before_cancel = is_batal and (has_proof or has_refund_tx or used_bal > 0)

                    if is_paid_status:
                        norm_status = 'verified'
                    elif is_batal:
                        norm_status = 'refunded' if was_paid_before_cancel else 'batal'
                    else:
                        norm_status = 'pending'

                    prod_names = []
                    seller_candidates = []
                    if o.seller:
                        seller_candidates.append(o.seller)

                    for it in o.items.all():
                        var_str = f" ({it.variation.name})" if getattr(it, 'variation', None) and it.variation else ""
                        prod_title = it.product.title if getattr(it, 'product', None) and it.product else 'Produk'
                        qty_str = f"{it.quantity}x " if getattr(it, 'quantity', None) else ""
                        prod_names.append(f"{qty_str}{prod_title}{var_str}")

                        if getattr(it, 'product', None) and getattr(it.product, 'seller', None):
                            seller_candidates.append(it.product.seller)

                    title_str = ", ".join(prod_names) if prod_names else "Pesanan Toko / Sinergy"
                    proof_url = o.payment_proof.url if has_proof else ''

                    resolved_seller = seller_candidates[0] if seller_candidates else None
                    seller_name = ''
                    seller_username = ''
                    seller_id = None
                    if resolved_seller:
                        seller_name = getattr(getattr(resolved_seller, 'profile', None), 'name_full', None) or resolved_seller.username
                        seller_username = resolved_seller.username
                        seller_id = resolved_seller.id
                    else:
                        seller_name = 'BAE Store / Vendor Utama'
                        seller_username = 'admin'

                    extra_notes = []
                    if resolved_seller:
                        extra_notes.append(f"Penjual: {seller_name} (@{seller_username})")
                    if is_batal:
                        if was_paid_before_cancel:
                            extra_notes.append(f"⚠️ Dibatalkan & Telah Direfund ({o.cancel_request_reason or 'Refund'})")
                        else:
                            extra_notes.append(f"Pesanan Dibatalkan ({o.cancel_request_reason or 'Batal'})")
                    elif o.status:
                        extra_notes.append(f"Status Pesanan: {o.status}")

                    cust_phone = (
                        getattr(o, 'recipient_phone', '') or 
                        (getattr(getattr(o.user, 'profile', None), 'phone_number', '') if o.user else '') or 
                        ''
                    )

                    transactions.append({
                        'id': f"store_{o.id}",
                        'raw_id': o.id,
                        'category': 'store',
                        'category_label': 'Toko / Sinergy',
                        'order_number': o.order_number or f"ORD-{o.id:06d}",
                        'title': title_str,
                        'customer_name': o.recipient_name or (getattr(getattr(o.user, 'profile', None), 'name_full', None) or (o.user.username if o.user else 'Tamu')),
                        'customer_email': o.user.email if o.user else '',
                        'customer_phone': cust_phone,
                        'seller_name': seller_name,
                        'seller_username': seller_username,
                        'seller_id': seller_id,
                        'base_amount': float(o.total_price or 0),
                        'admin_fee': float(o.admin_fee or 0),
                        'shipping_cost': float(o.shipping_cost or 0),
                        'grand_total': float(o.grand_total or o.total_price or 0),
                        'payment_method': o.payment_method or 'transfer',
                        'payment_status': norm_status,
                        'raw_status': o.status,
                        'payment_proof_url': proof_url,
                        'created_at': o.created_at.isoformat() if o.created_at else None,
                        'action_link': '/dashboard/sinergy/seller/orders',
                        'extra_info': " • ".join(extra_notes)
                    })
                except Exception as item_err:
                    logger.error(f"Error serializing store order {getattr(o, 'id', '?')}: {item_err}")
        except Exception as e:
            logger.error(f"Error loading store orders in incoming funds: {e}")

        # 2. DIGITAL PRODUCTS
        try:
            from digital_products.models import DigitalOrder
            dig_orders = DigitalOrder.objects.all().select_related('digital_product', 'buyer')
            for do in dig_orders:
                raw_status = (do.payment_status or '').lower()
                has_proof = bool(getattr(do, 'payment_proof', None) and hasattr(do.payment_proof, 'url') and do.payment_proof)
                
                if raw_status in ['verified', 'paid', 'lunas']:
                    norm_status = 'verified'
                elif raw_status in ['rejected', 'batal', 'cancelled']:
                    # If rejected without proof, skip
                    if not has_proof:
                        continue
                    norm_status = 'refunded'
                else:
                    norm_status = 'pending'

                proof_url = do.payment_proof.url if has_proof else ''
                base_amt = float(do.amount or 0)
                adm_fee = float(do.admin_fee or 0)

                extra_notes = []
                if do.paid_to_seller_directly:
                    extra_notes.append("Transfer Langsung ke Seller")
                if norm_status == 'refunded':
                    extra_notes.append("⚠️ Transaksi Dibatalkan/Ditolak")

                transactions.append({
                    'id': f"digital_{do.id}",
                    'raw_id': do.id,
                    'category': 'digital',
                    'category_label': 'Produk Digital',
                    'order_number': do.order_number or f"DIG-{do.id:06d}",
                    'title': do.digital_product.title if do.digital_product else "Produk Digital",
                    'customer_name': do.buyer_name or (do.buyer.username if do.buyer else 'Pembeli'),
                    'customer_email': do.buyer_email or (do.buyer.email if do.buyer else ''),
                    'customer_phone': do.buyer_phone or '',
                    'base_amount': base_amt,
                    'admin_fee': adm_fee,
                    'shipping_cost': 0,
                    'grand_total': base_amt + adm_fee,
                    'payment_method': 'transfer_direct' if do.paid_to_seller_directly else 'transfer',
                    'payment_status': norm_status,
                    'raw_status': do.payment_status,
                    'payment_proof_url': proof_url,
                    'created_at': do.created_at.isoformat() if do.created_at else None,
                    'action_link': '/dashboard/digital-products',
                    'extra_info': " • ".join(extra_notes) if extra_notes else "Produk Digital"
                })
        except Exception as e:
            pass

        # 3. E-COURSES
        try:
            from courses.models import CourseEnrollment
            enrollments = CourseEnrollment.objects.all().select_related('course', 'user')
            for ce in enrollments:
                raw_status = (ce.payment_status or '').lower()
                has_proof = bool(getattr(ce, 'payment_proof', None) and hasattr(ce.payment_proof, 'url') and ce.payment_proof)
                
                if raw_status in ['verified', 'paid', 'lunas']:
                    norm_status = 'verified'
                elif raw_status in ['rejected', 'batal', 'cancelled']:
                    if not has_proof:
                        continue
                    norm_status = 'refunded'
                else:
                    norm_status = 'pending'

                proof_url = ce.payment_proof.url if has_proof else ''
                base_amt = float(ce.amount or 0)
                adm_fee = float(getattr(ce, 'admin_fee', 0) or 0)

                extra_notes = []
                if ce.course and ce.course.instructor:
                    extra_notes.append(f"Instruktur: @{ce.course.instructor.username}")
                if ce.paid_to_seller_directly:
                    extra_notes.append("Transfer Langsung ke Instruktur")

                transactions.append({
                    'id': f"course_{ce.id}",
                    'raw_id': ce.id,
                    'category': 'course',
                    'category_label': 'E-Course / Kelas',
                    'order_number': ce.order_number or f"CRS-{ce.id:06d}",
                    'title': ce.course.title if ce.course else "Kelas Online",
                    'customer_name': ce.buyer_name or (ce.user.username if ce.user else 'Peserta'),
                    'customer_email': ce.buyer_email or (ce.user.email if ce.user else ''),
                    'customer_phone': ce.buyer_phone or '',
                    'base_amount': base_amt,
                    'admin_fee': adm_fee,
                    'shipping_cost': 0,
                    'grand_total': base_amt + adm_fee,
                    'payment_method': 'transfer_direct' if ce.paid_to_seller_directly else 'transfer',
                    'payment_status': norm_status,
                    'raw_status': ce.payment_status,
                    'payment_proof_url': proof_url,
                    'created_at': ce.enrolled_at.isoformat() if ce.enrolled_at else None,
                    'action_link': '/dashboard/ecourses',
                    'extra_info': " • ".join(extra_notes) if extra_notes else "E-Course"
                })
        except Exception as e:
            pass

        # 4. EVENTS
        try:
            from events.models import EventRegistration
            event_regs = EventRegistration.objects.all().select_related('event', 'user')
            for er in event_regs:
                raw_status = (er.payment_status or '').lower()
                tot_amt = float(er.payment_amount or 0)
                has_proof = bool(getattr(er, 'payment_proof', None) and hasattr(er.payment_proof, 'url') and er.payment_proof)

                # Only show paid registrations or registrations with payment amounts/proofs
                if raw_status in ['verified', 'approved', 'paid', 'lunas']:
                    norm_status = 'verified'
                elif raw_status in ['rejected', 'batal', 'cancelled']:
                    if not has_proof and tot_amt == 0:
                        continue
                    norm_status = 'refunded'
                else:
                    norm_status = 'pending'

                proof_url = er.payment_proof.url if has_proof else ''

                cust_name = er.guest_name or (getattr(getattr(er.user, 'profile', None), 'name_full', None) or er.user.username if er.user else 'Peserta')
                cust_email = er.guest_email or (er.user.email if er.user else '')
                cust_phone = (er.responses.get('phone') or er.responses.get('telepon') or er.responses.get('whatsapp') or getattr(getattr(er.user, 'profile', None), 'phone_number', '')) if er.responses else ''

                extra_notes = []
                if er.bib_number:
                    extra_notes.append(f"No. BIB: {er.bib_number}")
                if er.team:
                    extra_notes.append(f"Tim: {er.team.name}")

                transactions.append({
                    'id': f"event_{er.id}",
                    'raw_id': er.id,
                    'category': 'event',
                    'category_label': 'Event / Tiket',
                    'order_number': f"EVT-{er.unique_code or er.id}",
                    'title': er.event.title if er.event else "Event BAE",
                    'customer_name': cust_name,
                    'customer_email': cust_email,
                    'customer_phone': cust_phone,
                    'base_amount': tot_amt,
                    'admin_fee': 0,
                    'shipping_cost': 0,
                    'grand_total': tot_amt,
                    'payment_method': er.payment_method or 'transfer',
                    'payment_status': norm_status,
                    'raw_status': er.payment_status,
                    'payment_proof_url': proof_url,
                    'created_at': er.created_at.isoformat() if er.created_at else None,
                    'action_link': f"/dashboard/event/submissions/{er.event.slug}" if er.event and er.event.slug else "/dashboard/event",
                    'extra_info': " • ".join(extra_notes) if extra_notes else "Pendaftaran Event"
                })
        except Exception as e:
            pass

        # 5. CHARITY / DONATIONS
        try:
            from donations.models import Donation
            donations = Donation.objects.all().select_related('campaign', 'donor').prefetch_related('waqaf_items', 'waqaf_items__product')
            for d in donations:
                raw_status = (d.payment_status or '').lower()
                has_proof = bool(getattr(d, 'proof_file', None) and hasattr(d.proof_file, 'url') and d.proof_file)

                if raw_status in ['verified', 'paid', 'approved']:
                    norm_status = 'verified'
                elif raw_status in ['rejected', 'batal']:
                    norm_status = 'refunded'
                else:
                    norm_status = 'pending'

                proof_url = d.proof_file.url if has_proof else ''
                amt = float(d.amount or 0)

                extra_notes = []
                if getattr(d, 'donation_type', '') == 'waqaf':
                    w_items = [f"{it.quantity}x {it.product.title}" for it in d.waqaf_items.all() if it.product]
                    extra_notes.append("📦 Waqaf: " + (", ".join(w_items) if w_items else "Produk Store"))
                if d.is_anonymous:
                    extra_notes.append("Donatur Anonim (Hamba Allah)")
                if d.message:
                    extra_notes.append(f'Doa: "{d.message[:40]}..."' if len(d.message) > 40 else f'Doa: "{d.message}"')

                cust_name = d.donor_name
                if (not cust_name or cust_name.strip().lower() in ['hamba allah', 'anonim', 'anonymous']) and d.donor:
                    donor_full = f"{d.donor.first_name} {d.donor.last_name}".strip()
                    cust_name = donor_full or d.donor.username
                elif not cust_name:
                    cust_name = 'Hamba Allah'

                transactions.append({
                    'id': f"charity_{d.id}",
                    'raw_id': d.id,
                    'category': 'charity',
                    'category_label': 'Charity / Donasi',
                    'order_number': f"DON-{d.id:06d}",
                    'title': d.campaign.title if d.campaign else "Program Charity",
                    'customer_name': cust_name,
                    'customer_email': d.donor_email or (d.donor.email if d.donor else ''),
                    'customer_phone': d.donor_phone or '',
                    'base_amount': amt,
                    'admin_fee': 0,
                    'shipping_cost': 0,
                    'grand_total': amt,
                    'payment_method': d.payment_method or 'transfer',
                    'payment_status': norm_status,
                    'raw_status': d.payment_status,
                    'payment_proof_url': proof_url,
                    'created_at': d.created_at.isoformat() if d.created_at else None,
                    'action_link': f"/dashboard/admin/campaigns",
                    'campaign_id': d.campaign.id if d.campaign else None,
                    'extra_info': " • ".join(extra_notes) if extra_notes else "Donasi Program"
                })
        except Exception as e:
            pass

        # 6. ZIS SUBMISSIONS
        try:
            from zis.models import ZISSubmission
            zis_items = ZISSubmission.objects.all().select_related('user', 'config')
            for z in zis_items:
                raw_status = (z.status or '').lower()
                has_proof = bool(getattr(z, 'transfer_proof', None) and hasattr(z.transfer_proof, 'url') and z.transfer_proof)

                if raw_status in ['verified', 'approved']:
                    norm_status = 'verified'
                elif raw_status in ['rejected', 'batal']:
                    norm_status = 'refunded'
                else:
                    norm_status = 'pending'

                proof_url = z.transfer_proof.url if has_proof else ''
                amt = float(z.total_amount or 0)

                transactions.append({
                    'id': f"zis_{z.id}",
                    'raw_id': z.id,
                    'category': 'zis',
                    'category_label': 'ZIS Rutin',
                    'order_number': f"ZIS-{z.id:06d}",
                    'title': f"Setoran ZIS ({z.month})",
                    'customer_name': getattr(getattr(z.user, 'profile', None), 'name_full', None) or z.user.username,
                    'customer_email': z.user.email,
                    'customer_phone': getattr(getattr(z.user, 'profile', None), 'phone_number', ''),
                    'base_amount': amt,
                    'admin_fee': 0,
                    'shipping_cost': 0,
                    'grand_total': amt,
                    'payment_method': 'transfer',
                    'payment_status': norm_status,
                    'raw_status': z.status,
                    'payment_proof_url': proof_url,
                    'created_at': z.created_at.isoformat() if z.created_at else None,
                    'action_link': '/dashboard/admin/zis-verify',
                    'extra_info': f"Periode: {z.month}"
                })
        except Exception as e:
            pass

        # Sort all by created_at descending
        transactions.sort(key=lambda x: x['created_at'] or '', reverse=True)

        # Compute Global / Overall Summary (KPI) across all verified/pending records
        overall_summary = {
            'total_income_all': 0.0,
            'total_income_pending': 0.0,
            'total_income_refunded': 0.0,
            'total_count': len(transactions),
            'by_category': {
                'store': {'count': 0, 'verified_amount': 0.0, 'pending_amount': 0.0},
                'digital': {'count': 0, 'verified_amount': 0.0, 'pending_amount': 0.0},
                'course': {'count': 0, 'verified_amount': 0.0, 'pending_amount': 0.0},
                'event': {'count': 0, 'verified_amount': 0.0, 'pending_amount': 0.0},
                'charity': {'count': 0, 'verified_amount': 0.0, 'pending_amount': 0.0},
                'zis': {'count': 0, 'verified_amount': 0.0, 'pending_amount': 0.0},
            },
            'by_payment_method': {
                'dynaqris': {'count': 0, 'amount': 0.0},
                'transfer': {'count': 0, 'amount': 0.0},
                'saldo_bae': {'count': 0, 'amount': 0.0},
                'cod': {'count': 0, 'amount': 0.0},
                'other': {'count': 0, 'amount': 0.0},
            }
        }

        for tx in transactions:
            cat = tx['category']
            st = tx['payment_status']
            amt = tx['grand_total']
            pm = (tx['payment_method'] or '').lower()

            if cat in overall_summary['by_category']:
                overall_summary['by_category'][cat]['count'] += 1
                if st == 'verified':
                    overall_summary['by_category'][cat]['verified_amount'] += amt
                elif st == 'pending':
                    overall_summary['by_category'][cat]['pending_amount'] += amt

            if st == 'verified':
                overall_summary['total_income_all'] += amt
            elif st == 'pending':
                overall_summary['total_income_pending'] += amt
            elif st == 'refunded':
                overall_summary['total_income_refunded'] += amt

            # Payment method breakdown
            if 'dynaqris' in pm or 'qris' in pm:
                overall_summary['by_payment_method']['dynaqris']['count'] += 1
                if st == 'verified':
                    overall_summary['by_payment_method']['dynaqris']['amount'] += amt
            elif 'saldo' in pm:
                overall_summary['by_payment_method']['saldo_bae']['count'] += 1
                if st == 'verified':
                    overall_summary['by_payment_method']['saldo_bae']['amount'] += amt
            elif 'cod' in pm:
                overall_summary['by_payment_method']['cod']['count'] += 1
                if st == 'verified':
                    overall_summary['by_payment_method']['cod']['amount'] += amt
            elif 'transfer' in pm or 'bank' in pm or 'bsi' in pm or 'bjb' in pm:
                overall_summary['by_payment_method']['transfer']['count'] += 1
                if st == 'verified':
                    overall_summary['by_payment_method']['transfer']['amount'] += amt
            else:
                overall_summary['by_payment_method']['other']['count'] += 1
                if st == 'verified':
                    overall_summary['by_payment_method']['other']['amount'] += amt

        # Compute Outgoing Funds & Account Balances (Commercial vs Charity)
        comm_expense_completed = 0.0
        comm_expense_pending = 0.0
        charity_expense_completed = 0.0
        charity_expense_pending = 0.0

        try:
            from digital_products.models import WithdrawalRequest

            expenses = OutgoingFund.objects.all()
            withdrawals = WithdrawalRequest.objects.all()

            linked_withdrawal_ids = set(
                OutgoingFund.objects.filter(withdrawal_request__isnull=False).values_list('withdrawal_request_id', flat=True)
            )

            for exp in expenses:
                amt = float(exp.amount or 0)
                if exp.fund_account == 'charity':
                    if exp.status == 'completed':
                        charity_expense_completed += amt
                    elif exp.status == 'pending':
                        charity_expense_pending += amt
                else:
                    if exp.status == 'completed':
                        comm_expense_completed += amt
                    elif exp.status == 'pending':
                        comm_expense_pending += amt

            for w in withdrawals:
                if w.id not in linked_withdrawal_ids:
                    w_amt = float(w.total_deduction or w.amount or 0)
                    if w.status == 'approved':
                        comm_expense_completed += w_amt
                    elif w.status == 'pending':
                        comm_expense_pending += w_amt

        except Exception as err:
            logger.error(f"Error calculating outgoing funds for summary: {err}")

        commercial_verified = sum(overall_summary['by_category'][c]['verified_amount'] for c in ['store', 'digital', 'course', 'event'])
        commercial_pending = sum(overall_summary['by_category'][c]['pending_amount'] for c in ['store', 'digital', 'course', 'event'])
        charity_verified = sum(overall_summary['by_category'][c]['verified_amount'] for c in ['charity', 'zis'])
        charity_pending = sum(overall_summary['by_category'][c]['pending_amount'] for c in ['charity', 'zis'])

        overall_summary['accounts'] = {
            'commercial': {
                'account_name': 'Rekening Komersial (Store, Event, Digital, E-Course)',
                'qris_label': 'QRIS 1 (Komersial & Bisnis)',
                'income_verified': commercial_verified,
                'income_pending': commercial_pending,
                'expense_completed': comm_expense_completed,
                'expense_pending': comm_expense_pending,
                'balance': commercial_verified - comm_expense_completed,
            },
            'charity': {
                'account_name': 'Rekening Sosial / Charity (ZIS & Donasi)',
                'qris_label': 'QRIS 2 (Sosial / ZISWAF)',
                'income_verified': charity_verified,
                'income_pending': charity_pending,
                'expense_completed': charity_expense_completed,
                'expense_pending': charity_expense_pending,
                'balance': charity_verified - charity_expense_completed,
            },
            'consolidated': {
                'income_verified': overall_summary['total_income_all'],
                'income_pending': overall_summary['total_income_pending'],
                'expense_completed': comm_expense_completed + charity_expense_completed,
                'expense_pending': comm_expense_pending + charity_expense_pending,
                'balance': overall_summary['total_income_all'] - (comm_expense_completed + charity_expense_completed),
            }
        }

        # Filter in-memory for requested query params
        filtered_transactions = transactions

        if account_filter == 'commercial':
            filtered_transactions = [t for t in filtered_transactions if t['category'] in ['store', 'digital', 'course', 'event']]
        elif account_filter == 'charity':
            filtered_transactions = [t for t in filtered_transactions if t['category'] in ['charity', 'zis']]

        if category_filter != 'all':
            if category_filter in ['store', 'sinergy']:
                filtered_transactions = [t for t in filtered_transactions if t['category'] == 'store']
            else:
                filtered_transactions = [t for t in filtered_transactions if t['category'] == category_filter]

        if status_filter != 'all':
            filtered_transactions = [t for t in filtered_transactions if t['payment_status'] == status_filter]

        if payment_method_filter != 'all':
            filtered_transactions = [
                t for t in filtered_transactions 
                if payment_method_filter in (t['payment_method'] or '').lower()
            ]

        if start_date_str:
            filtered_transactions = [
                t for t in filtered_transactions 
                if t['created_at'] and t['created_at'][:10] >= start_date_str
            ]

        if end_date_str:
            filtered_transactions = [
                t for t in filtered_transactions 
                if t['created_at'] and t['created_at'][:10] <= end_date_str
            ]

        if search_query:
            filtered_transactions = [
                t for t in filtered_transactions 
                if (
                    search_query in t['order_number'].lower() or
                    search_query in t['title'].lower() or
                    search_query in t['customer_name'].lower() or
                    search_query in t['customer_email'].lower() or
                    search_query in t['customer_phone'].lower() or
                    search_query in (t.get('seller_name') or '').lower() or
                    search_query in (t.get('seller_username') or '').lower()
                )
            ]

        # Calculate Filtered Totals
        filtered_total_verified = sum([t['grand_total'] for t in filtered_transactions if t['payment_status'] == 'verified'])
        filtered_total_pending = sum([t['grand_total'] for t in filtered_transactions if t['payment_status'] == 'pending'])

        return Response({
            'summary': overall_summary,
            'filtered_stats': {
                'total_count': len(filtered_transactions),
                'total_verified_amount': filtered_total_verified,
                'total_pending_amount': filtered_total_pending,
            },
            'transactions': filtered_transactions
        })

    def delete(self, request):
        """
        Delete a specific incoming funds transaction record (Admin only).
        Reverts / debits any refunded or credited wallet balances for full cleanup.
        """
        user = request.user
        is_admin = (
            user.is_superuser or 
            user.is_staff or 
            getattr(user, 'role', '') in ['admin', 'staff'] or 
            getattr(getattr(user, 'profile', None), 'role', '') in ['admin', 'staff'] or
            (hasattr(user, 'custom_roles') and user.custom_roles.filter(Q(name__icontains='admin') | Q(code__icontains='admin')).exists())
        )

        if not is_admin:
            return Response(
                {'error': 'Akses khusus administrator. Anda tidak memiliki izin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        category = request.data.get('category')
        raw_id = request.data.get('raw_id')

        if not category or not raw_id:
            return Response(
                {'error': 'Parameter category dan raw_id wajib disertakan.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reverted_notes = []

            if category == 'store':
                from orders.models import Order
                order = Order.objects.filter(id=raw_id).first()
                if order:
                    # 1. Check associated wallet transactions and revert balances
                    wallet_txs = WalletTransaction.objects.filter(order=order)
                    for tx in wallet_txs:
                        if tx.transaction_type == 'REFUND' and tx.amount > 0:
                            # Revert the refunded balance from user wallet
                            try:
                                tx.wallet.debit(
                                    amount=tx.amount,
                                    transaction_type='ADJUSTMENT',
                                    description=f"Penarikan saldo refund pembatalan data pesanan #{order.order_number} (Pembersihan Data Admin)"
                                )
                                reverted_notes.append(f"Saldo refund Rp {tx.amount:,.0f} ditarik kembali dari @{tx.wallet.user.username}")
                            except Exception as ex:
                                # If wallet has less balance, deduct remaining or adjust to 0
                                if tx.wallet.balance > 0:
                                    actual_deduct = tx.wallet.balance
                                    tx.wallet.debit(
                                        amount=actual_deduct,
                                        transaction_type='ADJUSTMENT',
                                        description=f"Penarikan saldo refund pesanan #{order.order_number} (Pembersihan Data Admin)"
                                    )
                                    reverted_notes.append(f"Saldo refund disesuaikan Rp {actual_deduct:,.0f} dari @{tx.wallet.user.username}")
                        elif tx.transaction_type == 'EARNING' and tx.amount > 0:
                            try:
                                tx.wallet.debit(
                                    amount=tx.amount,
                                    transaction_type='ADJUSTMENT',
                                    description=f"Penarikan saldo penghasilan pesanan #{order.order_number} (Pembersihan Data Admin)"
                                )
                                reverted_notes.append(f"Saldo penghasilan Rp {tx.amount:,.0f} ditarik kembali dari @{tx.wallet.user.username}")
                            except Exception:
                                pass

                    wallet_txs.delete()
                    order.delete()

            elif category == 'digital':
                from digital_products.models import DigitalOrder
                do = DigitalOrder.objects.filter(id=raw_id).first()
                if do:
                    do.delete()

            elif category == 'course':
                from courses.models import CourseEnrollment
                ce = CourseEnrollment.objects.filter(id=raw_id).first()
                if ce:
                    ce.delete()

            elif category == 'event':
                from events.models import EventRegistration
                EventRegistration.objects.filter(id=raw_id).delete()

            elif category == 'charity':
                from donations.models import Donation
                Donation.objects.filter(id=raw_id).delete()

            elif category == 'zis':
                from zis.models import ZISSubmission
                ZISSubmission.objects.filter(id=raw_id).delete()

            else:
                return Response(
                    {'error': f'Kategori {category} tidak dikenali.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            msg = 'Data transaksi berhasil dihapus dari sistem.'
            if reverted_notes:
                msg += f" ({', '.join(reverted_notes)})"

            return Response({
                'success': True,
                'message': msg
            })
        except Exception as e:
            return Response(
                {'error': f'Gagal menghapus transaksi: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminOutgoingFundsView(APIView):
    """
    Unified Outgoing Funds & Expense Management (Manajemen Uang Keluar & Penarikan Dana)
    Supports:
    - Manual operational expenses, charity distributions, supplier costs, etc.
    - Seller/User withdrawal requests (auto-pending, admin can approve/complete or reject).
    - Filters by account ('commercial', 'charity', 'all'), category, status, search, and date.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _is_admin(self, user):
        return (
            user.is_superuser or 
            user.is_staff or 
            getattr(user, 'role', '') in ['admin', 'staff'] or 
            getattr(getattr(user, 'profile', None), 'role', '') in ['admin', 'staff'] or
            (hasattr(user, 'custom_roles') and user.custom_roles.filter(Q(name__icontains='admin') | Q(code__icontains='admin')).exists())
        )

    def get(self, request):
        if not self._is_admin(request.user):
            return Response({'error': 'Akses khusus administrator.'}, status=status.HTTP_403_FORBIDDEN)

        account_filter = request.query_params.get('account', 'all').lower()
        status_filter = request.query_params.get('status', 'all').lower()
        category_filter = request.query_params.get('category', 'all').lower()
        search_query = request.query_params.get('search', '').strip().lower()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        from digital_products.models import WithdrawalRequest

        outgoing_list = []

        # 1. Manual Outgoing Funds
        try:
            manual_expenses = OutgoingFund.objects.all().select_related('created_by', 'withdrawal_request')
            cat_label_map = {
                'operational': 'Operasional & Utilitas',
                'charity_distribution': 'Penyaluran Donasi / Mustahik',
                'withdrawal': 'Penarikan Dana User / Seller',
                'vendor_supplier': 'Vendor / Supplier / Pengadaan',
                'event_cost': 'Biaya Operasional Event',
                'tax_admin': 'Pajak & Biaya Admin',
                'other': 'Pengeluaran Lainnya'
            }
            for exp in manual_expenses:
                outgoing_list.append({
                    'id': f"manual_{exp.id}",
                    'raw_id': exp.id,
                    'source_type': 'manual',
                    'fund_account': exp.fund_account,
                    'fund_account_label': 'Rekening Komersial' if exp.fund_account == 'commercial' else 'Rekening Charity / Sosial',
                    'category': exp.category,
                    'category_label': cat_label_map.get(exp.category, exp.category),
                    'title': exp.title,
                    'amount': float(exp.amount or 0),
                    'description': exp.description or '',
                    'recipient_name': exp.recipient_name or '',
                    'recipient_account': exp.recipient_account or '',
                    'status': exp.status,
                    'status_label': 'Selesai' if exp.status == 'completed' else ('Pending' if exp.status == 'pending' else 'Dibatalkan'),
                    'proof_url': exp.proof_file.url if exp.proof_file else '',
                    'transaction_date': str(exp.transaction_date) if exp.transaction_date else '',
                    'created_at': exp.created_at.isoformat() if exp.created_at else None,
                    'created_by': exp.created_by.username if exp.created_by else 'Admin',
                    'withdrawal_id': exp.withdrawal_request_id,
                })
        except Exception as e:
            logger.error(f"Error loading manual outgoing funds: {e}")

        # 2. Seller & User Withdrawal Requests
        try:
            linked_ids = set(OutgoingFund.objects.filter(withdrawal_request__isnull=False).values_list('withdrawal_request_id', flat=True))
            withdrawals = WithdrawalRequest.objects.all().select_related('user', 'user__profile')

            for w in withdrawals:
                if w.id in linked_ids:
                    continue

                if w.status == 'approved':
                    norm_status = 'completed'
                    status_lbl = 'Selesai'
                elif w.status == 'rejected':
                    norm_status = 'cancelled'
                    status_lbl = 'Ditolak'
                else:
                    norm_status = 'pending'
                    status_lbl = 'Pending'

                tot_amt = float(w.total_deduction or w.amount or 0)
                source_label = 'Hasil Jualan' if w.withdrawal_source == 'seller_revenue' else 'Saldo BAE'
                
                desc_parts = [
                    f"Penarikan ke {w.bank_name} {w.account_number} a.n {w.account_name}",
                    f"Sumber: {source_label}",
                    f"Nominal: Rp {float(w.amount):,.0f}"
                ]
                if float(w.admin_fee or 0) > 0:
                    desc_parts.append(f"Admin Fee: Rp {float(w.admin_fee):,.0f}")
                if float(w.donation_amount or 0) > 0:
                    desc_parts.append(f"Infaq: Rp {float(w.donation_amount):,.0f}")
                if w.rejection_reason:
                    desc_parts.append(f"Alasan Tolak: {w.rejection_reason}")

                cust_name = getattr(getattr(w.user, 'profile', None), 'name_full', None) or w.user.username

                outgoing_list.append({
                    'id': f"withdrawal_{w.id}",
                    'raw_id': w.id,
                    'source_type': 'withdrawal',
                    'fund_account': 'commercial',
                    'fund_account_label': 'Rekening Komersial',
                    'category': 'withdrawal',
                    'category_label': 'Penarikan Dana User / Seller',
                    'title': f"Penarikan Dana @{w.user.username} ({cust_name})",
                    'amount': tot_amt,
                    'net_amount': float(w.amount),
                    'admin_fee': float(w.admin_fee or 0),
                    'donation_amount': float(w.donation_amount or 0),
                    'description': " • ".join(desc_parts),
                    'recipient_name': w.account_name,
                    'recipient_account': f"{w.bank_name} - {w.account_number}",
                    'bank_name': w.bank_name,
                    'account_number': w.account_number,
                    'status': norm_status,
                    'status_label': status_lbl,
                    'raw_status': w.status,
                    'proof_url': w.transfer_proof.url if (w.transfer_proof and hasattr(w.transfer_proof, 'url')) else '',
                    'rejection_reason': w.rejection_reason or '',
                    'transaction_date': w.created_at.strftime('%Y-%m-%d') if w.created_at else '',
                    'created_at': w.created_at.isoformat() if w.created_at else None,
                    'created_by': w.user.username,
                    'user_id': w.user.id,
                    'user_username': w.user.username,
                    'user_name': cust_name,
                    'withdrawal_id': w.id,
                })
        except Exception as e:
            logger.error(f"Error loading withdrawals in outgoing funds: {e}")

        # Sort descending by date
        outgoing_list.sort(key=lambda x: x['created_at'] or '', reverse=True)

        # Global Summary of Outgoing Funds
        summary = {
            'total_expense_completed': sum(x['amount'] for x in outgoing_list if x['status'] == 'completed'),
            'total_expense_pending': sum(x['amount'] for x in outgoing_list if x['status'] == 'pending'),
            'total_expense_cancelled': sum(x['amount'] for x in outgoing_list if x['status'] == 'cancelled'),
            'total_count': len(outgoing_list),
            'commercial': {
                'completed': sum(x['amount'] for x in outgoing_list if x['fund_account'] == 'commercial' and x['status'] == 'completed'),
                'pending': sum(x['amount'] for x in outgoing_list if x['fund_account'] == 'commercial' and x['status'] == 'pending'),
                'count': sum(1 for x in outgoing_list if x['fund_account'] == 'commercial'),
            },
            'charity': {
                'completed': sum(x['amount'] for x in outgoing_list if x['fund_account'] == 'charity' and x['status'] == 'completed'),
                'pending': sum(x['amount'] for x in outgoing_list if x['fund_account'] == 'charity' and x['status'] == 'pending'),
                'count': sum(1 for x in outgoing_list if x['fund_account'] == 'charity'),
            }
        }

        # Apply Filters
        filtered = outgoing_list

        if account_filter != 'all':
            filtered = [x for x in filtered if x['fund_account'] == account_filter]

        if status_filter != 'all':
            filtered = [x for x in filtered if x['status'] == status_filter]

        if category_filter != 'all':
            filtered = [x for x in filtered if x['category'] == category_filter]

        if start_date_str:
            filtered = [x for x in filtered if x['transaction_date'] and x['transaction_date'] >= start_date_str]

        if end_date_str:
            filtered = [x for x in filtered if x['transaction_date'] and x['transaction_date'] <= end_date_str]

        if search_query:
            filtered = [
                x for x in filtered
                if (
                    search_query in x['title'].lower() or
                    search_query in x['description'].lower() or
                    search_query in x['recipient_name'].lower() or
                    search_query in x['recipient_account'].lower() or
                    search_query in (x.get('created_by') or '').lower() or
                    search_query in (x.get('user_username') or '').lower()
                )
            ]

        filtered_stats = {
            'total_count': len(filtered),
            'total_completed_amount': sum(x['amount'] for x in filtered if x['status'] == 'completed'),
            'total_pending_amount': sum(x['amount'] for x in filtered if x['status'] == 'pending'),
        }

        return Response({
            'summary': summary,
            'filtered_stats': filtered_stats,
            'expenses': filtered
        })

    def post(self, request):
        if not self._is_admin(request.user):
            return Response({'error': 'Akses khusus administrator.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data

        title = data.get('title', '').strip()
        amount = data.get('amount')
        description = data.get('description', '').strip()
        fund_account = data.get('fund_account', 'commercial')
        category = data.get('category', 'operational')
        recipient_name = data.get('recipient_name', '').strip()
        recipient_account = data.get('recipient_account', '').strip()
        req_status = data.get('status', 'completed')
        transaction_date = data.get('transaction_date')
        proof_file = request.FILES.get('proof_file')

        if not title:
            return Response({'error': 'Judul pengeluaran wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_val = Decimal(str(amount))
            if amount_val <= 0:
                raise ValueError
        except Exception:
            return Response({'error': 'Nominal pengeluaran harus berupa angka lebih dari 0.'}, status=status.HTTP_400_BAD_REQUEST)

        if not description:
            description = f"Pengeluaran {category} ({title})"

        expense = OutgoingFund.objects.create(
            title=title,
            amount=amount_val,
            description=description,
            fund_account=fund_account,
            category=category,
            recipient_name=recipient_name,
            recipient_account=recipient_account,
            status=req_status,
            transaction_date=transaction_date or timezone.now().date(),
            proof_file=proof_file,
            created_by=request.user
        )

        return Response({
            'success': True,
            'message': 'Data pengeluaran kas berhasil dicatat.',
            'expense_id': expense.id
        }, status=status.HTTP_201_CREATED)

    def patch(self, request):
        """
        Process / change status of an expense or withdrawal (e.g. pending -> completed / approved)
        """
        if not self._is_admin(request.user):
            return Response({'error': 'Akses khusus administrator.'}, status=status.HTTP_403_FORBIDDEN)

        from digital_products.models import WithdrawalRequest

        data = request.data
        source_type = data.get('source_type', 'manual')
        raw_id = data.get('raw_id')
        new_status = data.get('status') # 'completed', 'approved', 'rejected', 'cancelled'
        rejection_reason = data.get('rejection_reason', '').strip()
        notes = data.get('description', '').strip()
        proof_file = request.FILES.get('proof_file') or request.FILES.get('transfer_proof')

        if not raw_id or not new_status:
            return Response({'error': 'Parameter raw_id dan status wajib disertakan.'}, status=status.HTTP_400_BAD_REQUEST)

        if source_type == 'withdrawal':
            withdrawal = WithdrawalRequest.objects.filter(id=raw_id).first()
            if not withdrawal:
                return Response({'error': 'Pengajuan penarikan tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

            if new_status in ['completed', 'approved']:
                withdrawal.status = 'approved'
                if proof_file:
                    withdrawal.transfer_proof = proof_file
                withdrawal.save()

                try:
                    from barakah_app.utils import send_status_update_email
                    send_status_update_email(
                        withdrawal.user,
                        f"Penarikan Saldo Rp {withdrawal.amount:,.0f}",
                        'approved'
                    )
                except Exception as mail_err:
                    logger.error(f"Error sending withdrawal approval email: {mail_err}")

                return Response({
                    'success': True,
                    'message': f"Penarikan dana #{withdrawal.id} atas nama @{withdrawal.user.username} berhasil disetujui & diselesaikan."
                })

            elif new_status in ['rejected', 'cancelled']:
                withdrawal.status = 'rejected'
                withdrawal.rejection_reason = rejection_reason or 'Ditolak oleh Admin'
                if proof_file:
                    withdrawal.transfer_proof = proof_file
                withdrawal.save()

                # Refund wallet balance if withdrawal source was user_wallet
                if withdrawal.withdrawal_source == 'user_wallet':
                    try:
                        u_wallet = UserWallet.get_or_create_wallet(withdrawal.user)
                        u_wallet.credit(
                            amount=withdrawal.total_deduction or withdrawal.amount,
                            transaction_type='ADJUSTMENT',
                            description=f"Pengembalian saldo: Penarikan #{withdrawal.id} ditolak: {withdrawal.rejection_reason}",
                            reference_withdrawal=withdrawal
                        )
                    except Exception as refund_err:
                        logger.error(f"Error refunding wallet for rejected withdrawal: {refund_err}")

                try:
                    from barakah_app.utils import send_status_update_email
                    send_status_update_email(
                        withdrawal.user,
                        f"Penarikan Saldo Rp {withdrawal.amount:,.0f}",
                        'rejected',
                        withdrawal.rejection_reason
                    )
                except Exception:
                    pass

                return Response({
                    'success': True,
                    'message': f"Penarikan dana #{withdrawal.id} ditolak."
                })

        else: # Manual OutgoingFund
            expense = OutgoingFund.objects.filter(id=raw_id).first()
            if not expense:
                return Response({'error': 'Data pengeluaran tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

            if new_status in ['completed', 'approved']:
                expense.status = 'completed'
            elif new_status in ['pending']:
                expense.status = 'pending'
            elif new_status in ['rejected', 'cancelled']:
                expense.status = 'cancelled'

            if notes:
                expense.description = notes
            if proof_file:
                expense.proof_file = proof_file
            expense.save()

            return Response({
                'success': True,
                'message': f"Status pengeluaran #{expense.id} berhasil diubah menjadi {expense.get_status_display()}."
            })

    def delete(self, request):
        if not self._is_admin(request.user):
            return Response({'error': 'Akses khusus administrator.'}, status=status.HTTP_403_FORBIDDEN)

        from digital_products.models import WithdrawalRequest

        source_type = request.data.get('source_type', 'manual')
        raw_id = request.data.get('raw_id')

        if not raw_id:
            return Response({'error': 'raw_id wajib disertakan.'}, status=status.HTTP_400_BAD_REQUEST)

        if source_type == 'withdrawal':
            w = WithdrawalRequest.objects.filter(id=raw_id).first()
            if w:
                w.delete()
        else:
            OutgoingFund.objects.filter(id=raw_id).delete()

        return Response({'success': True, 'message': 'Data pengeluaran berhasil dihapus.'})

