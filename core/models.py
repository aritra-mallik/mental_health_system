from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL

class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # ZERO-KNOWLEDGE STORAGE
    encrypted_content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Assessment(models.Model):
    TYPE_CHOICES = [
        ("who5", "WHO-5"),
        ("pss", "PSS"),
        ("wemwbs", "WEMWBS"),
        ("isi", "ISI"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    assessment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)

    score = models.FloatField()
    risk_level = models.CharField(max_length=30)

    # Optional: store breakdown
    meta = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_pinned = models.BooleanField(default=False)
    initial_context = models.JSONField(null=True, blank=True)
    def __str__(self):
        return f"Session {self.id} - {self.user.username}"

class ChatMessage(models.Model):
    ROLE_CHOICES = (
        ("user", "User"),
        ("bot", "Bot"),
    )

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role} - {self.content[:30]}"
    
class MentalSignal(models.Model):
    SOURCE_CHOICES = [
        ("journal", "Journal"),
        ("chat", "Chat"),
        ("assessment", "Assessment"),
    ]

    RISK_CHOICES = [
        ("less", "Less"),
        ("moderate", "Moderate"),
        ("high", "High"),
    ]

    MOOD_CHOICES = [
        ("overwhelmed", "Overwhelmed"),
        ("low", "Low"),
        ("stressed", "Stressed"),
        ("neutral", "Neutral"),
        ("good", "Good"),
        ("great", "Great"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)

    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)

    risk = models.CharField(max_length=20, choices=RISK_CHOICES, default="less")

    metadata = models.JSONField(default=dict)

    source_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['source']),
        ]

    def __str__(self):
        return f"{self.user} | {self.source} | {self.mood} | {self.risk}"


class UserVaultKey(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vault_key")
    
    # SAFE A: Locked by the User's Login Password
    password_encrypted_key = models.CharField(max_length=500)
    password_iv = models.CharField(max_length=100)
    
    # SAFE B: Locked by the User's Recovery Password
    recovery_encrypted_key = models.CharField(max_length=500)
    recovery_iv = models.CharField(max_length=100)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    