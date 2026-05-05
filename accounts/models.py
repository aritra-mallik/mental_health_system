from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
#from phonenumber_field.modelfields import PhoneNumberField
from django.utils.translation import gettext_lazy as _
from datetime import date
import base64, os


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None

    email = models.EmailField(_("email address"), unique=True)
    phone = models.CharField(max_length=15, unique=True)

    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100)

    display_name = models.CharField(max_length=100, blank=True, null=True)

    # NEW: real age tracking
    date_of_birth = models.DateField()

    # MAKE REQUIRED
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)

    preferred_language = models.CharField(max_length=10, default="en")
    dark_mode = models.BooleanField(default=False)
    font_size = models.CharField(max_length=10, default="medium")

    is_phone_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)

    consent_data_policy = models.BooleanField(default=False)
    consent_ai_policy = models.BooleanField(default=False)
    consent_encryption = models.BooleanField(default=False)
    consent_terms = models.BooleanField(default=False)

    journal_salt = models.CharField(max_length=255, blank=True, null=True)

    is_onboarded = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def get_age(self):
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    def save(self, *args, **kwargs):
        if not self.journal_salt:
            self.journal_salt = base64.b64encode(os.urandom(16)).decode()
        super().save(*args, **kwargs)

    
class OTP(models.Model):
    OTP_TYPE = [
        ("email", "Email"),
        ("phone", "Phone"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    otp_type = models.CharField(max_length=10, choices=OTP_TYPE)
    created_at = models.DateTimeField(auto_now_add=True)

    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    def is_expired(self):
        from django.utils import timezone
        return (timezone.now() - self.created_at).total_seconds() > 300

    def is_blocked(self):
        return self.attempts >= 5