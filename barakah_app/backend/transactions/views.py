# transactions/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from decimal import Decimal
from datetime import datetime
from .models import UserWallet, WalletTransaction
from .serializers import UserWalletSerializer, WalletTransactionSerializer

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
    Aggregates incoming revenue and payments across:
    1. Store / Physical Products (orders.Order)
    2. Digital Products (digital_products.DigitalOrder)
    3. E-Courses (courses.CourseEnrollment)
    4. Events (events.EventRegistration)
    5. Charity / Crowdfunding (donations.Donation)
    6. ZIS Submissions (zis.ZISSubmission)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_admin = (
            user.is_superuser or 
            user.is_staff or 
            getattr(user, 'role', '') == 'admin' or 
            getattr(getattr(user, 'profile', None), 'role', '') == 'admin'
        )

        if not is_admin:
            return Response(
                {'error': 'Akses khusus administrator. Anda tidak memiliki izin.'},
                status=status.HTTP_403_FORBIDDEN
            )

        category_filter = request.query_params.get('category', 'all').lower()
        status_filter = request.query_params.get('status', 'all').lower()
        payment_method_filter = request.query_params.get('payment_method', 'all').lower()
        search_query = request.query_params.get('search', '').strip().lower()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        transactions = []

        # 1. STORE / E-COMMERCE ORDERS
        if category_filter in ['all', 'store', 'sinergy']:
            try:
                from orders.models import Order
                store_orders = Order.objects.all().select_related('user', 'seller').prefetch_related('items', 'items__product')
                for o in store_orders:
                    raw_status = (o.status or '').lower()
                    if raw_status in ['paid', 'lunas', 'proses', 'dikirim', 'shipped', 'selesai', 'delivered']:
                        norm_status = 'verified'
                    elif raw_status in ['batal', 'cancelled']:
                        norm_status = 'rejected'
                    else:
                        norm_status = 'pending'

                    prod_names = []
                    for it in o.items.all():
                        prod_names.append(it.product_name or (it.product.title if it.product else 'Produk'))
                    title_str = ", ".join(prod_names) if prod_names else "Pesanan Toko / Sinergy"

                    proof_url = o.payment_proof.url if getattr(o, 'payment_proof', None) and hasattr(o.payment_proof, 'url') else ''

                    transactions.append({
                        'id': f"store_{o.id}",
                        'raw_id': o.id,
                        'category': 'store',
                        'category_label': 'Toko / Sinergy',
                        'order_number': o.order_number or f"ORD-{o.id:06d}",
                        'title': title_str,
                        'customer_name': o.recipient_name or (o.user.username if o.user else 'Tamu'),
                        'customer_email': o.user.email if o.user else '',
                        'customer_phone': o.customer_phone or getattr(o, 'phone', '') or '',
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
                        'extra_info': f"Seller: {o.seller.username if o.seller else 'Platform'}"
                    })
            except Exception as e:
                pass

        # 2. DIGITAL PRODUCTS
        if category_filter in ['all', 'digital']:
            try:
                from digital_products.models import DigitalOrder
                dig_orders = DigitalOrder.objects.all().select_related('digital_product', 'buyer')
                for do in dig_orders:
                    raw_status = (do.payment_status or '').lower()
                    if raw_status in ['verified', 'paid', 'lunas']:
                        norm_status = 'verified'
                    elif raw_status in ['rejected', 'batal', 'cancelled']:
                        norm_status = 'rejected'
                    else:
                        norm_status = 'pending'

                    proof_url = do.payment_proof.url if getattr(do, 'payment_proof', None) and hasattr(do.payment_proof, 'url') else ''
                    base_amt = float(do.amount or 0)
                    adm_fee = float(do.admin_fee or 0)

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
                        'extra_info': f"Direct to Seller: {'Ya' if do.paid_to_seller_directly else 'Tidak'}"
                    })
            except Exception as e:
                pass

        # 3. E-COURSES
        if category_filter in ['all', 'course']:
            try:
                from courses.models import CourseEnrollment
                enrollments = CourseEnrollment.objects.all().select_related('course', 'user')
                for ce in enrollments:
                    raw_status = (ce.payment_status or '').lower()
                    if raw_status in ['verified', 'paid', 'lunas']:
                        norm_status = 'verified'
                    elif raw_status in ['rejected', 'batal', 'cancelled']:
                        norm_status = 'rejected'
                    else:
                        norm_status = 'pending'

                    proof_url = ce.payment_proof.url if getattr(ce, 'payment_proof', None) and hasattr(ce.payment_proof, 'url') else ''
                    base_amt = float(ce.amount or 0)
                    adm_fee = float(getattr(ce, 'admin_fee', 0) or 0)

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
                        'extra_info': f"Instruktur: {ce.course.instructor.username if ce.course and ce.course.instructor else '-'}"
                    })
            except Exception as e:
                pass

        # 4. EVENTS
        if category_filter in ['all', 'event']:
            try:
                from events.models import EventRegistration
                event_regs = EventRegistration.objects.all().select_related('event', 'user')
                for er in event_regs:
                    raw_status = (er.payment_status or '').lower()
                    if raw_status in ['verified', 'approved', 'paid', 'lunas']:
                        norm_status = 'verified'
                    elif raw_status in ['rejected', 'batal', 'cancelled']:
                        norm_status = 'rejected'
                    else:
                        norm_status = 'pending'

                    proof_url = er.payment_proof.url if getattr(er, 'payment_proof', None) and hasattr(er.payment_proof, 'url') else ''
                    tot_amt = float(er.payment_amount or 0)

                    cust_name = er.guest_name or (getattr(getattr(er.user, 'profile', None), 'name_full', None) or er.user.username if er.user else 'Peserta')
                    cust_email = er.guest_email or (er.user.email if er.user else '')
                    cust_phone = (er.responses.get('phone') or er.responses.get('telepon') or er.responses.get('whatsapp') or getattr(getattr(er.user, 'profile', None), 'phone_number', '')) if er.responses else ''

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
                        'extra_info': f"BIB: {er.bib_number or '-'}"
                    })
            except Exception as e:
                pass

        # 5. CHARITY / DONATIONS
        if category_filter in ['all', 'charity']:
            try:
                from donations.models import Donation
                donations = Donation.objects.all().select_related('campaign', 'donor')
                for d in donations:
                    raw_status = (d.payment_status or '').lower()
                    if raw_status in ['verified', 'paid', 'approved']:
                        norm_status = 'verified'
                    elif raw_status in ['rejected', 'batal']:
                        norm_status = 'rejected'
                    else:
                        norm_status = 'pending'

                    proof_url = d.proof_file.url if getattr(d, 'proof_file', None) and hasattr(d.proof_file, 'url') else ''
                    amt = float(d.amount or 0)

                    transactions.append({
                        'id': f"charity_{d.id}",
                        'raw_id': d.id,
                        'category': 'charity',
                        'category_label': 'Charity / Donasi',
                        'order_number': f"DON-{d.id:06d}",
                        'title': d.campaign.title if d.campaign else "Program Charity",
                        'customer_name': d.donor_name or (d.donor.username if d.donor else 'Hamba Allah'),
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
                        'extra_info': f"Anonim: {'Ya' if d.is_anonymous else 'Tidak'}"
                    })
            except Exception as e:
                pass

        # 6. ZIS SUBMISSIONS
        if category_filter in ['all', 'zis']:
            try:
                from zis.models import ZISSubmission
                zis_items = ZISSubmission.objects.all().select_related('user', 'config')
                for z in zis_items:
                    raw_status = (z.status or '').lower()
                    if raw_status in ['verified', 'approved']:
                        norm_status = 'verified'
                    elif raw_status in ['rejected', 'batal']:
                        norm_status = 'rejected'
                    else:
                        norm_status = 'pending'

                    proof_url = z.transfer_proof.url if getattr(z, 'transfer_proof', None) and hasattr(z.transfer_proof, 'url') else ''
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
                        'extra_info': f"Bulan: {z.month}"
                    })
            except Exception as e:
                pass

        # Sort all by created_at descending
        transactions.sort(key=lambda x: x['created_at'] or '', reverse=True)

        # Compute Global / Overall Summary (KPI) across all fetched records
        overall_summary = {
            'total_income_all': 0.0,
            'total_income_pending': 0.0,
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

        # Filter in-memory for requested query params
        filtered_transactions = transactions

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
                    search_query in t['customer_phone'].lower()
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
