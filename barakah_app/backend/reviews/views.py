from rest_framework import generics, permissions
from .models import Review
from .serializers import ReviewSerializer

class ReviewListView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Prefer query parameters, fallback to URL kwargs
        product_id = self.request.query_params.get('product_id') or self.kwargs.get('product_id')
        course_id = self.request.query_params.get('course_id')
        
        # Treat '0' as None (common convention for 'all' or 'none' in this app)
        if product_id == '0' or product_id == 0:
            product_id = None
            
        if product_id:
            return Review.objects.filter(product_id=product_id)
        if course_id:
            return Review.objects.filter(course_id=course_id)
        return Review.objects.all()

    def perform_create(self, serializer):
        # Get product_id from body, then path
        product_id = self.request.data.get('product_id') or self.kwargs.get('product_id')
        course_id = self.request.data.get('course_id')

        # Cleanup: treat 0 or '0' as None
        if product_id == '0' or product_id == 0:
            product_id = None
        if course_id == '0' or course_id == 0:
            course_id = None

        serializer.save(user=self.request.user, product_id=product_id, course_id=course_id)

class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)