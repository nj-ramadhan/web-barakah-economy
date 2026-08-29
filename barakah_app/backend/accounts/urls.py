from django.urls import path, include
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, GoogleLoginView,
    PasswordResetRequestView, PasswordResetConfirmView,
    ChangePasswordView, SendTempPasswordWAView, AcceptAgreementView, UserAgreementView,
    UserViewSet, RoleViewSet, UserLabelViewSet,
    LingkupTugasViewSet, BidangTugasViewSet, ActiveDevicesView,
    SecurityBlockDeviceView, SecurityConfirmDeviceView
)

router = SimpleRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'labels', UserLabelViewSet, basename='label')
router.register(r'lingkup-tugas', LingkupTugasViewSet, basename='lingkup-tugas')
router.register(r'bidang-tugas', BidangTugasViewSet, basename='bidang-tugas')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('active-devices/', ActiveDevicesView.as_view(), name='active_devices'),
    path('security/block-device/', SecurityBlockDeviceView.as_view(), name='security_block_device'),
    path('security/confirm-device/', SecurityConfirmDeviceView.as_view(), name='security_confirm_device'),
    path('accept-agreement/', AcceptAgreementView.as_view(), name='accept_agreement'),
    path('user-agreement/', UserAgreementView.as_view(), name='user_agreement'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('send-temp-password-wa/', SendTempPasswordWAView.as_view(), name='send_temp_password_wa'),

    path('', include(router.urls)),
]