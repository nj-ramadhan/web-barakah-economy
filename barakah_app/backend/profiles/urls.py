# profiles/urls.py
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from . import views

router = SimpleRouter()
router.register(r'', views.ProfileViewSet, basename='profile')

urlpatterns = [
    # Router handles: me/, check-completeness/, search/, scan-ktp/, and detail {user_id}/ (via lookup_field)
    path('', include(router.urls)),
    
    # Manual functional paths kept as fallbacks
    path('manual/view/<user_id>/', views.profile_view, name='profile_view'),
    path('manual/update/<user_id>/', views.profile_update, name='profile_update'),
]