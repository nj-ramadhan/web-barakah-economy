from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from campaigns.views import CampaignViewSet
from donations.views import DonationViewSet
from campaigns.views import UpdateDonationView
from products.views import ProductViewSet
from courses.views import CourseViewSet
# from donations.views import UpdateDonationView

router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'donations', DonationViewSet, basename='donation')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'courses', CourseViewSet, basename='course')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/donations/', include('donations.urls')),
    path('api/donations/<slug:slug>/update-donation/', UpdateDonationView.as_view(), name='update-donation'),
    # path('api/auth/', include('accounts.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)