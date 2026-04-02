from rest_framework import serializers
from .models import User
from datetime import date
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "first_name", "middle_name", "last_name", "email", "phone",
            "password", "confirm_password",
            "date_of_birth", "gender"
        ]
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match")

        dob = data.get("date_of_birth")

        if not dob:
            raise serializers.ValidationError("Date of birth is required")

        # 🔥 Handle string input like "18-02-1998"
        if isinstance(dob, str):
            try:
                dob = datetime.strptime(dob, "%d-%m-%Y").date()
                data["date_of_birth"] = dob
            except ValueError:
                raise serializers.ValidationError("Date must be DD-MM-YYYY")

        age = date.today().year - dob.year

        if age < 16:
            raise serializers.ValidationError("Minimum age is 16")

        return data
    
    def validate_phone(self, value):
        phone = value.strip().replace(" ", "")

        # Remove leading +
        if phone.startswith("+"):
            phone = phone[1:]

        # Remove leading 0 (common Indian format)
        if phone.startswith("0"):
            phone = phone[1:]

        # If 10 digits → assume India
        if len(phone) == 10:
            phone = "91" + phone

        # Final validation
        if not phone.isdigit() or len(phone) != 12 or not phone.startswith("91"):
            raise serializers.ValidationError("Enter valid Indian phone number")

        phone = "+" + phone

        # ✅ DUPLICATE CHECK (THIS WAS MISSING EFFECTIVELY)
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Phone number already registered")

        return phone

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        user = User.objects.create_user(password=password, **validated_data)
        return user
    
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data["email"], password=data["password"])

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_email_verified:
            raise serializers.ValidationError("Email not verified")

        return user

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, data):
        try:
            token = RefreshToken(data["refresh"])
            token.blacklist()
        except Exception:
            raise serializers.ValidationError("Invalid token")

        return data
    
class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()
    new_password = serializers.CharField()
    
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField()

# class RegisterSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True)
#     confirm_password = serializers.CharField(write_only=True)

#     class Meta:
#         model = User
#         fields = "__all__"

#     def validate(self, data):
#         if data["password"] != data["confirm_password"]:
#             raise serializers.ValidationError("Passwords do not match")
#         return data

#     def create(self, validated_data):
#         validated_data.pop("confirm_password")
#         password = validated_data.pop("password")

#         user = User.objects.create_user(password=password, **validated_data)
#         return user

# class RegisterSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True)
#     confirm_password = serializers.CharField(write_only=True)

#     class Meta:
#         model = User
#         fields = "__all__"

#     def validate(self, data):

#         # password check
#         if data["password"] != data["confirm_password"]:
#             raise serializers.ValidationError("Passwords do not match")

#         # AGE VALIDATION
#         dob = data.get("date_of_birth")
#         if dob:
#             today = date.today()
#             age = today.year - dob.year - (
#                 (today.month, today.day) < (dob.month, dob.day)
#             )

#             if age < 16:
#                 raise serializers.ValidationError("You must be at least 16 years old")

#         # GENDER REQUIRED (extra safety)
#         if not data.get("gender"):
#             raise serializers.ValidationError("Gender is required")

#         return data