from rest_framework.response import Response
import os
from django.conf import settings
from .models import ShippingAddress

from .serializers import ShippingAddressSerializer
from .utils import get_shipping_cost, get_provinces, get_cities, get_districts, RAJAONGKIR_API_KEY
import requests



class ShippingAddressListView(generics.ListCreateAPIView):
    serializer_class = ShippingAddressSerializer

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ShippingAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ShippingAddressSerializer

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user)

class ProvinceListView(APIView):
    def get(self, request):
        provinces = get_provinces()
        return Response(provinces)

class CityListView(APIView):
    def get(self, request):
        province_id = request.query_params.get('province')
        cities = get_cities(province_id)
        return Response(cities)

class DistrictListView(APIView):
    def get(self, request):
        city_id = request.query_params.get('city')
        districts = get_districts(city_id)
        return Response(districts)


class ShippingCostAPIView(APIView):
    def post(self, request):
        origin_id = request.data.get('origin')
        destination_id = request.data.get('destination')
        weight = request.data.get('weight')
        courier = request.data.get('courier')

        if not all([origin_id, destination_id, weight, courier]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        cost_data = get_shipping_cost(origin_id, destination_id, weight, courier)
        return Response(cost_data)

class TestPingAPIView(APIView):
    def get(self, request):
        diag = {
            "api_key_loaded": bool(RAJAONGKIR_API_KEY),
            "api_key_length": len(RAJAONGKIR_API_KEY) if RAJAONGKIR_API_KEY else 0,
            "base_dir": str(settings.BASE_DIR),
            "env_file_path": str(settings.BASE_DIR / '.env'),
            "env_file_exists": os.path.exists(settings.BASE_DIR / '.env'),
            "ping_google": "Checking...",
            "ping_komerce": "Checking...",
        }

        
        # Test Google
        try:
            r = requests.get("https://www.google.com", timeout=5)
            diag["ping_google"] = f"OK (Status {r.status_code})"
        except Exception as e:
            diag["ping_google"] = f"Failed: {str(e)}"

        # Test Komerce
        try:
            headers = {"key": RAJAONGKIR_API_KEY}
            r = requests.get("https://rajaongkir.komerce.id/api/v1/destination/province", headers=headers, verify=False, timeout=5)
            diag["ping_komerce"] = f"OK (Status {r.status_code})"
            diag["komerce_response_preview"] = r.text[:200]
        except Exception as e:
            diag["ping_komerce"] = f"Failed: {str(e)}"

        return Response(diag)