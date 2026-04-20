# shippings/views.py
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ShippingAddress
from .serializers import ShippingAddressSerializer
from .utils import get_shipping_cost, get_provinces, get_cities, get_districts


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