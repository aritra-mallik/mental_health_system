from django.urls import path
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # HTML pages
    path("register-page/", register_page),
    path("login-page/", login_page),
    path("verify-page/", verify_page),
    path("dashboard/", dashboard),
    path("forgot/", forgot_page),
    path("reset-password/", reset_page),
    path("consent/", consent_page),
    
    # API endpoints
    path("register/", RegisterView.as_view()),
    path("verify-otp/", VerifyOTPView.as_view()),
    path("login/", LoginView.as_view()),

    path("logout/", LogoutView.as_view()),
    path("resend-otp/", ResendOTPView.as_view()),

    path("password-reset/", PasswordResetRequestView.as_view()),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view()),

    path("change-password/", ChangePasswordView.as_view()),

    path("token/refresh/", TokenRefreshView.as_view()),
]

# urlpatterns += [
#     path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
# ]

# urlpatterns = [

#     # HTML pages
#     path("register-page/", register_page, name="register_page"),
#     path("verify-page/", verify_otp_page, name="verify_page"),
#     path("consent/", consent_page, name="consent_page"),

#     # API endpoints
#     path("register/", RegisterView.as_view(), name="register_api"),
#     path("verify-otp/", VerifyOTPView.as_view(), name="verify_api"),
# ]