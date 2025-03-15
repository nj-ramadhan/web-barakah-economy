# coupons/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Coupon
from .serializers import CouponSerializer

class ApplyCouponView(APIView):
    def post(self, request):
        code = request.data.get('code')
        try:
            coupon = Coupon.objects.get(code=code, active=True)
            serializer = CouponSerializer(coupon)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid or expired coupon'}, status=status.HTTP_400_BAD_REQUEST)