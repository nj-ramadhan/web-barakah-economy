from django.contrib import admin
from django.urls import path, include
from ckeditor_uploader import views as ckeditor_views
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from campaigns.views import CampaignViewSet
from donations.views import DonationViewSet
from products.views import ProductViewSet
from courses.views import CourseViewSet
from profiles.views import ProfileViewSet

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet, basename='profile')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('accounts.urls')),
    path('api/profiles/', include('profiles.urls')),

    path('api/', include('article.urls')),

    path('api/campaigns/', include('campaigns.urls')),
    path('api/donations/', include('donations.urls')),
    path('api/payments/', include('payments.urls')),

    path('api/products/', include('products.urls')),
    path('api/wishlists/', include('wishlists.urls')),
    path('api/carts/', include('carts.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/coupons/', include('coupons.urls')),
    path('api/shippings/', include('shippings.urls')),
    path('api/reviews/', include('reviews.urls')),

    path('api/courses/', include('courses.urls')),

    path('ckeditor/', include('ckeditor_uploader.urls')),
    path('ckeditor/upload/', ckeditor_views.upload, name='ckeditor_upload'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)