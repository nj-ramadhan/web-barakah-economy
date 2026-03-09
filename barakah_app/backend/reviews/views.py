# reviews/views.py
from rest_framework import generics
from .models import Review
from .serializers import ReviewSerializer

class ReviewListView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        product_id = self.request.query_params.get('product_id')
        course_id = self.request.query_params.get('course_id')
        if product_id:
            return Review.objects.filter(product_id=product_id)
        if course_id:
            return Review.objects.filter(course_id=course_id)
        return Review.objects.all()

    def perform_create(self, serializer):
        product_id = self.request.data.get('product_id')
        course_id = self.request.data.get('course_id')
        serializer.save(user=self.request.user, product_id=product_id, course_id=course_id)

class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)