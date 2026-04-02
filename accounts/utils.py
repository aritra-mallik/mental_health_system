import random
from django.core.mail import send_mail
from django.conf import settings
import secrets

def generate_otp():
    return str(secrets.randbelow(900000) + 100000)

def send_email_otp(user, otp):
    subject = "Email Verification OTP"
    message = f"""
                Your email verification OTP is: {otp}

                This code will expire in 5 minutes.
                Do not share it with anyone.
                """

    send_mail(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        [user.email],
        fail_silently=False,
    )
    
def send_phone_otp(user, otp):
    print(f"Phone OTP for {user.phone}: {otp}")
    
# import requests

# def send_phone_otp(user, otp):
#     url = "https://www.fast2sms.com/dev/bulkV2"

#     payload = {
#         "variables_values": otp,
#         "route": "otp",
#         "numbers": str(user.phone)
#     }

#     headers = {
#         "authorization": "YOUR_API_KEY",
#     }

#     requests.post(url, data=payload, headers=headers)