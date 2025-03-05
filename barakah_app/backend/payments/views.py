# payments/views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.http import JsonResponse
from midtransclient import Snap
from donations.models import Donation
from campaigns.models import Campaign
import logging
logger = logging.getLogger(__name__)

# Initialize Midtrans Snap client
snap = Snap(
    is_production=False,  # Set to True for production
    server_key='SB-Mid-server-70SchVWPVaJRu6h9zEle2mbR',
    client_key='SB-Mid-client-wm4shJTARC2PTcY6'
)

class GenerateMidtransTokenView(APIView):
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
                campaign = Campaign.objects.get(id=campaign_slug)
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
                'order_id': f'DNT-{donation.id}-CPG-{campaign}',
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

            return JsonResponse({'token': transaction['token']})
        except Exception as e:
            logger.error(f"Error generating Midtrans token: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

class MidtransNotificationView(APIView):
    def post(self, request):
        try:
            data = request.data  # Use request.data for parsed JSON
            order_id = data.get('order_id')
            transaction_status = data.get('transaction_status')
            fraud_status = data.get('fraud_status')

            # Extract donation ID from order_id
            donation_id = order_id.split('-')[-1]

            # Update donation status based on notification
            if transaction_status == 'capture':
                if fraud_status == 'accept':
                    Donation.objects.filter(id=donation_id).update(payment_status='success')
            elif transaction_status == 'settlement':
                Donation.objects.filter(id=donation_id).update(payment_status='success')
            elif transaction_status in ['cancel', 'deny', 'expire']:
                Donation.objects.filter(id=donation_id).update(payment_status='failed')

            return JsonResponse({'status': 'ok'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
        
class UpdatePaymentStatusView(APIView):
    def post(self, request):
        try:
            data = request.data
            transaction_id = data.get('transactionId')
            status = data.get('status')
            amount = data.get('amount')
            payment_method = data.get('paymentMethod')

            # Find the donation record and update its status
            donation = Donation.objects.get(id=transaction_id)
            donation.amount = amount
            donation.payment_status = status
            donation.payment_method = payment_method
            donation.save()

            return JsonResponse({'status': 'ok'})
        except Donation.DoesNotExist:
            return JsonResponse({'error': 'Donation not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    