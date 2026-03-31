# profiles/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # path('edit/', views.profile_edit, name='profile_edit'),
    path('check-completeness/', views.profile_completeness_check, name='profile_completeness_check'),
    path('scan-ktp/', views.scan_ktp, name='scan_ktp'),
    path('api/profiles/<user_id>/', views.profile_update, name='profile_update'),
    path('<user_id>/', views.profile_view, name='profile_view'),
    # path('api/profiles/<int:pk>/', ProfileUpdateView.as_view(), name='profile-update'),
]