from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import RegisterSerializer, LoginSerializer, LogoutSerializer, PasswordResetConfirmSerializer, ChangePasswordSerializer
from django.contrib.auth import authenticate
from .models import OTP, User
from .utils import generate_otp, send_email_otp, validate_password_strength
from django.shortcuts import render
from .tokens import get_tokens_for_user
from .throttles import OTPThrottle
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import update_session_auth_hash

class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    
    throttle_classes = [OTPThrottle]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            email_otp = generate_otp()
            phone_otp = generate_otp()

            OTP.objects.create(user=user, otp=email_otp, otp_type="email")
            OTP.objects.create(user=user, otp=phone_otp, otp_type="phone")

            send_email_otp(user, email_otp)
            print("Phone OTP:", phone_otp)

            return Response({"status": "success", "message": "OTP sent", "phone": user.phone}, status=201)

        return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)

class VerifyOTPView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    
    throttle_classes = [OTPThrottle]

    def post(self, request):
        email = request.data.get("email")
        email_otp = request.data.get("email_otp")
        phone_otp = request.data.get("phone_otp")

        try:
            user = User.objects.get(email=email)

            # GET EMAIL OTP
            email_obj = OTP.objects.filter(
                user=user,
                otp_type="email",
                is_used=False
            ).last()

            # GET PHONE OTP
            phone_obj = OTP.objects.filter(
                user=user,
                otp_type="phone",
                is_used=False
            ).last()

            # --- VALIDATION START ---

            if not email_obj:
                return Response({"status": "error", "message": "No email OTP found"}, status=400)

            if not phone_obj:
                return Response({"status": "error", "message": "No phone OTP found"}, status=400)

            if email_obj.is_blocked() or phone_obj.is_blocked():
                return Response({"status": "error", "message": "Too many attempts"}, status=403)

            if email_obj.is_expired() or phone_obj.is_expired():
                return Response({"status": "error", "message": "OTP expired"}, status=400)

            if email_obj.otp != email_otp:
                email_obj.attempts += 1
                email_obj.save()
                return Response({"status": "error", "message": "Invalid email OTP"}, status=400)

            if phone_obj.otp != phone_otp:
                phone_obj.attempts += 1
                phone_obj.save()
                return Response({"status": "error", "message": "Invalid phone OTP"}, status=400)

            # --- SUCCESS ---

            email_obj.is_used = True
            phone_obj.is_used = True
            email_obj.save()
            phone_obj.save()

            user.is_email_verified = True
            user.is_phone_verified = True
            user.save()

            tokens = get_tokens_for_user(user)

            return Response({"status": "success", "message": "Both OTPs verified", "data": {"tokens": tokens}})

        except User.DoesNotExist:
            return Response({"status": "error", "message": "User not found"}, status=404)

class LoginView(APIView):
    authentication_classes = []  
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.validated_data
            tokens = get_tokens_for_user(user)

            return Response({"status": "success", "message": "Login successful", "data": tokens})

        return Response({"status": "error", "message": "Invalid credentials", "error": serializer.errors}, status=400)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)

        if serializer.is_valid():
            return Response({"status": "success", "message": "Logged out"}, status=205)

        return Response({"status": "error", "message": "Logout failed", "error": serializer.errors}, status=400)

class ResendOTPView(APIView):
    authentication_classes = []      
    permission_classes = [AllowAny]
    
    throttle_classes = [OTPThrottle]

    def post(self, request):
        email = request.data.get("email")

        try:
            user = User.objects.get(email=email)

            email_otp = generate_otp()
            phone_otp = generate_otp()

            OTP.objects.create(user=user, otp=email_otp, otp_type="email")
            OTP.objects.create(user=user, otp=phone_otp, otp_type="phone")

            send_email_otp(user, email_otp)
            print("Resent Phone OTP:", phone_otp)

            return Response({"status": "success", "message": "OTP resent"})

        except User.DoesNotExist:
            return Response({"status": "error", "message": "User not found"}, status=404)

class PasswordResetRequestView(APIView):
    authentication_classes = []      
    permission_classes = [AllowAny]
    
    throttle_classes = [OTPThrottle]

    def post(self, request):
        email = request.data.get("email")

        try:
            user = User.objects.get(email=email)

            otp = generate_otp()
            OTP.objects.create(user=user, otp=otp)

            send_email_otp(user, otp)

            return Response({"status": "success", "message": "Reset OTP sent"})

        except User.DoesNotExist:
            return Response({"status": "error", "message": "User not found"}, status=404)
        
class PasswordResetConfirmView(APIView):
    authentication_classes = []      
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data["email"]
            otp_code = serializer.validated_data["otp"]
            new_password = serializer.validated_data["new_password"]

            try:
                user = User.objects.get(email=email)
                otp_obj = OTP.objects.filter(
                    user=user, is_used=False
                ).last()

                if not otp_obj or otp_obj.otp != otp_code:
                    return Response({"status": "error", "message": "Invalid OTP"}, status=400)

                if otp_obj.is_expired():
                    return Response({"status": "error", "message": "OTP expired"}, status=400)

                otp_obj.is_used = True
                otp_obj.save()

                error = validate_password_strength(new_password)
                if error:
                    return Response({"status": "error","message": error}, status=400)

                user.set_password(new_password)
                user.save()

                return Response({"status": "success", "message": "Password reset successful"})

            except User.DoesNotExist:
                return Response({"status": "error", "message": "User not found"}, status=404)

        return Response({"status": "error", "message": "Invalid data", "error": serializer.errors}, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Invalid data",
                "error": serializer.errors
            }, status=400)

        user = request.user
        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        # Check old password
        if not user.check_password(old_password):
            return Response({
                "status": "error",
                "message": "Incorrect current password"
            }, status=400)

        # Prevent same password reuse
        if old_password == new_password:
            return Response({
                "status": "error",
                "message": "New password must be different from old password"
            }, status=400)

        #  Password strength validation
        error = validate_password_strength(new_password)
        if error:
            return Response({"status": "error", "message": error}, status=400)

        # Save new password
        user.set_password(new_password)
        user.save()

        # Keep user logged in (important)
        update_session_auth_hash(request, user)

        return Response({
            "status": "success" ,
            "message": "Password changed successfully"
        })


def consent_page(request): return render(request,"accounts/consent.html")
def register_page(request): return render(request,"accounts/register.html")
def verify_page(request): return render(request,"accounts/verify.html")
def login_page(request): return render(request,"accounts/login.html")
def forgot_page(request): return render(request,"accounts/forgot_password.html")
def reset_page(request): return render(request,"accounts/reset_password.html")
def dashboard(request): return render(request,"accounts/dashboard.html")