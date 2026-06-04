from rest_framework import serializers
from .models import User
from datetime import date
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime
from .utils import validate_password_strength

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "first_name", "middle_name", "last_name", "email",
            "password", "confirm_password",
            "date_of_birth", "gender"
        ]
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def validate(self, data):
        password = data.get("password")
        confirm_password = data.get("confirm_password")

        if password != confirm_password:
            raise serializers.ValidationError("Passwords do not match")

        #  ADD THIS
        error = validate_password_strength(password)
        if error:
            raise serializers.ValidationError(error)

        dob = data.get("date_of_birth")

        if not dob:
            raise serializers.ValidationError("Date of birth is required")

        #  Handle string input like "18-02-1998"
        if isinstance(dob, str):
            try:
                dob = datetime.strptime(dob, "%d-%m-%Y").date()
                data["date_of_birth"] = dob
            except ValueError:
                raise serializers.ValidationError("Date must be DD-MM-YYYY")

        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        if age < 16:
            raise serializers.ValidationError("Minimum age is 16")

        return data

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

