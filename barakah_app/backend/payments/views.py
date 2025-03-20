# payments/views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.http import JsonResponse
from django.conf import settings
from midtransclient import Snap
from donations.models import Donation
from campaigns.models import Campaign
from orders.models import Order
import logging

logger = logging.getLogger(__name__)

# Initialize Midtrans Snap client
snap = Snap(
    is_production=not settings.MIDTRANS_SANDBOX,  # Use sandbox if MIDTRANS_SANDBOX is True
    server_key=settings.MIDTRANS_SERVER_KEY,
    client_key=settings.MIDTRANS_CLIENT_KEY
)

class GenerateDonationMidtransTokenView(APIView):
    def post(self, request):
        try:
            data = request.data
            logger.info(f"Request data: {data}")

            # Validate and parse amount
            try:
                amount = int(data.get('amount'))
            except (TypeError, ValueError):
                return JsonResponse({'error': 'Invalid amount'}, status=400)

            donor_name = data.get('donorName')
            donor_phone = data.get('donorPhone')
            campaign_slug = data.get('campaignSlug')

            # Validate required fields
            if not donor_name or not donor_phone:
                return JsonResponse({'error': 'Missing required fields'}, status=400)
            
            try:
                campaign = Campaign.objects.get(slug=campaign_slug)
            except Campaign.DoesNotExist:
                return JsonResponse({'error': 'Campaign not found'}, status=404)

            # Create a donation record
            donation = Donation.objects.create(
                campaign=campaign,
                donor_name=donor_name,
                donor_phone=donor_phone,
                amount=amount,
                payment_method='midtrans',
                payment_status='pending'
            )

            logger.info(f"Donation: {donation}")

            # Prepare transaction details for Midtrans
            transaction_details = {
                'order_id': f'D{donation.id}-C{campaign.id}',  # Unique order ID
                'gross_amount': amount,
            }

            customer_details = {
                'first_name': donor_name,
                'phone': donor_phone,
            }

            logger.info(f"Transaction details: {transaction_details}")
            logger.info(f"Customer details: {customer_details}")

            # Generate payment token
            transaction = snap.create_transaction({
                'transaction_details': transaction_details,
                'customer_details': customer_details,
            })
            logger.info(f"Midtrans token: {transaction['token']}")

            return JsonResponse({
                'token': transaction['token'],
                'redirect_url': transaction['redirect_url'],  # Redirect URL for Midtrans
                'order_id': transaction_details['order_id'],  # Return order ID for reference
            })
        except Exception as e:
            logger.error(f"Error generating Midtrans token: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

class GenerateOrderMidtransTokenView(APIView):
    def post(self, request):
        try:
            data = request.data
            logger.info(f"Request data: {data}")

            # Validate and parse amount
            try:
                total_amount = int(data.get('amount'))
            except (TypeError, ValueError):
                return JsonResponse({'error': 'Invalid amount'}, status=400)

            customer_name = data.get('customerName')
            customer_phone = data.get('customerPhone')
            checkout_number = data.get('checkoutNumber')

            # Validate required fields
            if not customer_name or not customer_phone or not checkout_number:
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            # Create an order record
            user = request.user  # Ensure the user is authenticated
            order = Order.objects.create(
                user=user,
                order_id=checkout_number,
                total_amount=total_amount,
                payment_method='midtrans',
                payment_status='pending'
            )

            logger.info(f"Order: {order}")

            # Prepare transaction details for Midtrans
            transaction_details = {
                'order_id': order.order_id,  # Unique order ID
                'gross_amount': total_amount,
            }

            customer_details = {
                'first_name': customer_name,
                'phone': customer_phone,
            }

            logger.info(f"Transaction details: {transaction_details}")
            logger.info(f"Customer details: {customer_details}")

            # Generate payment token
            transaction = snap.create_transaction({
                'transaction_details': transaction_details,
                'customer_details': customer_details,
            })
            logger.info(f"Midtrans token: {transaction['token']}")

            return JsonResponse({
                'token': transaction['token'],
                'redirect_url': transaction['redirect_url'],  # Redirect URL for Midtrans
                'order_id': transaction_details['order_id'],  # Return order ID for reference
            })
        except Exception as e:
            logger.error(f"Error generating Midtrans token: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
        
class MidtransDonationNotificationView(APIView):
    def post(self, request):
        try:
            data = request.data  # Use request.data for parsed JSON
            order_id = data.get('order_id')
            transaction_status = data.get('transaction_status')
            fraud_status = data.get('fraud_status')

            # Extract donation ID from order_id
            donation_id = order_id.split('-')[1]  # Format: DNT-{donation_id}-CPG-{campaign_id}

            # Update donation status based on notification
            donation = Donation.objects.get(id=donation_id)
            if transaction_status == 'capture':
                if fraud_status == 'accept':
                    donation.payment_status = 'success'
            elif transaction_status == 'settlement':
                donation.payment_status = 'success'
            elif transaction_status in ['cancel', 'deny', 'expire']:
                donation.payment_status = 'failed'
            donation.save()

            return JsonResponse({'status': 'ok'})
        except Donation.DoesNotExist:
            logger.error(f"Donation not found for order_id: {order_id}")
            return JsonResponse({'error': 'Donation not found'}, status=404)
        except Exception as e:
            logger.error(f"Error processing Midtrans notification: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

class MidtransOrderNotificationView(APIView):
    def post(self, request):
        try:
            data = request.data  # Use request.data for parsed JSON
            order_id = data.get('order_id')
            transaction_status = data.get('transaction_status')
            fraud_status = data.get('fraud_status')

            # Update order status based on notification
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                logger.error(f"Order not found for order_id: {order_id}")
                return JsonResponse({'error': 'Order not found'}, status=404)

            if transaction_status == 'capture':
                if fraud_status == 'accept':
                    order.payment_status = 'success'
            elif transaction_status == 'settlement':
                order.payment_status = 'success'
            elif transaction_status in ['cancel', 'deny', 'expire']:
                order.payment_status = 'failed'
            order.save()

            return JsonResponse({'status': 'ok'})
        except Exception as e:
            logger.error(f"Error processing Midtrans notification: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
        
class CheckDonationPaymentStatusView(APIView):
    def get(self, request):
        try:
            transaction_id = request.GET.get('order_id')
            if not transaction_id:
                return JsonResponse({'error': 'Order ID is required'}, status=400)

            # Check transaction status from Midtrans
            status_response = snap.transactions.status(transaction_id)
            transaction_status = status_response.get('transaction_status')

            # Extract donation ID from order_id
            donation_id = transaction_id.split('-')[1]  # Format: DNT-{donation_id}-CPG-{campaign_id}

            # Update donation status in database
            donation = Donation.objects.get(id=donation_id)
            donation.payment_status = transaction_status
            donation.save()

            return JsonResponse({
                'status': transaction_status,
                'order_id': transaction_id,
                'amount': donation.amount,
                'payment_method': donation.payment_method,
            })
        except Donation.DoesNotExist:
            logger.error(f"Donation not found for order_id: {transaction_id}")
            return JsonResponse({'error': 'Donation not found'}, status=404)
        except Exception as e:
            logger.error(f"Error checking payment status: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

class CheckOrderPaymentStatusView(APIView):
    def get(self, request):
        try:
            transaction_id = request.GET.get('order_id')
            if not transaction_id:
                return JsonResponse({'error': 'Order ID is required'}, status=400)

            # Check transaction status from Midtrans
            status_response = snap.transactions.status(transaction_id)
            transaction_status = status_response.get('transaction_status')

            # Extract donation ID from order_id
            order_id = transaction_id.split('-')[1]  # Format: DNT-{donation_id}-CPG-{campaign_id}

            # Update donation status in database
            donation = Donation.objects.get(id=order_id)
            donation.payment_status = transaction_status
            donation.save()

            return JsonResponse({
                'status': transaction_status,
                'order_id': transaction_id,
                'amount': donation.amount,
                'payment_method': donation.payment_method,
            })
        except Donation.DoesNotExist:
            logger.error(f"Order not found for order_id: {transaction_id}")
            return JsonResponse({'error': 'Donation not found'}, status=404)
        except Exception as e:
            logger.error(f"Error checking payment status: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)        