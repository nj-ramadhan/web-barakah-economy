# profiles/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # path('edit/', views.profile_edit, name='profile_edit'),
    path('<user_id>/', views.profile_view, name='profile_view'),
]