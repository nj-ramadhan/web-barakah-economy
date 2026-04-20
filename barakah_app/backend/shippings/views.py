from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ShippingAddress
from .serializers import ShippingAddressSerializer
from .utils import get_shipping_cost, get_provinces, get_cities, get_districts, get_villages

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

class VillageListView(APIView):
    def get(self, request):
        district_id = request.query_params.get('district')
        villages = get_villages(district_id)
        return Response(villages)

class ShippingCostAPIView(APIView):
    def post(self, request):
        origin_id = request.data.get('origin')
        destination_id = request.data.get('destination')
        weight = request.data.get('weight')
        courier = request.data.get('courier')

        if not all([origin_id, destination_id, weight]):
            return Response({'error': 'Missing required fields (origin, destination, weight)'}, status=status.HTTP_400_BAD_REQUEST)

        cost_data = get_shipping_cost(origin_id, destination_id, weight, courier)
        return Response(cost_data)

class ExpeditionDiagnosticView(APIView):
    """
    Diagnostic view to test connectivity with the Indonesia Expedition API (API.co.id).
    Returns basic province list and raw response for debugging.
    """
    def get(self, request):
        from django.conf import settings
        from .utils import get_provinces, REGIONAL_BASE_URL
        
        # Fetch directly from settings to avoid import caching in utils
        api_key = getattr(settings, 'EXPEDITION_API_KEY', '')
        
        results = {
            "api_configured": bool(api_key),
            "key_preview": f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "too_short_or_empty",
            "base_url": REGIONAL_BASE_URL,
            "provinces": [],
            "error": None
        }
        
        try:
            provinces = get_provinces()
            results["provinces"] = provinces
            results["count"] = len(provinces)
            if not provinces and api_key:
                results["error"] = "No provinces returned. The API Key might be invalid or the external service is down."
        except Exception as e:
            results["error"] = str(e)
            
        return Response(results)