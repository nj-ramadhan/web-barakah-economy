from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserRegistrationSerializer, CustomTokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests
import logging
logger = logging.getLogger('accounts')

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        # Call the parent class's post method to get the token response
        response = super().post(request, *args, **kwargs)
        
        # Get the user from the validated data in the serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        
        # Add user details to the response
        response.data['id'] = user.id
        response.data['username'] = user.username
        response.data['email'] = user.email        
        return response
    
class LoginView(CustomTokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data['refresh_token']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)    

class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get('token')
        logger.info(f"Received token: {token}")

        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            id_info = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
            logger.info(f"Decoded token: {id_info}")

            email = id_info.get('email')
            name = id_info.get('name')
            first_name = id_info.get('given_name')
            last_name = id_info.get('family_name')
            logger.info(f"name: {name}")
            username = str(name).replace(" ", "_").lower()
            logger.info(f"email: {email}, name: {username}")
            if not email:
                return Response({'error': 'Email not found in token'}, status=status.HTTP_400_BAD_REQUEST)

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'email': email,
                }
            )
            logger.info(f"User created: {created}, User: {user}")

            refresh = RefreshToken.for_user(user)
            access = str(refresh.access_token)

            return Response({
                'access': access,
                'refresh': str(refresh),
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            logger.error(f"Token verification failed: {e}")
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error during Google login: {e}")
            return Response({'error': 'An error occurred during Google login'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            reset_url = f"{request.data.get('frontend_url')}/reset-password?uid={user.pk}&token={token}"
            send_mail(
                'Reset Password',
                f'Click the link to reset your password: {reset_url}',
                'no-reply@yourdomain.com',
                [email],
            )
        return Response({'message': 'If the email exists, a reset link has been sent.'}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        user = User.objects.filter(pk=uid).first()
        if user and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid token or user.'}, status=status.HTTP_400_BAD_REQUEST)        