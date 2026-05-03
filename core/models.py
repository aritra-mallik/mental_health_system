from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class MoodEntry(models.Model):
    MOOD_CHOICES = [
        ("excellent", "Excellent"),
        ("happy", "Happy"),
        ("sad", "Sad"),
        ("anxious", "Anxious"),
        ("neutral", "Neutral"),
        ("angry", "Angry"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # ZERO-KNOWLEDGE STORAGE
    encrypted_content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)




class Assessment(models.Model):
    TYPE_CHOICES = [
        ("who5", "WHO-5"),
        ("pss", "PSS"),
        ("dass21", "DASS-21"),
        ("isi", "ISI"),
        ("burnout", "Burnout"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    assessment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)

    score = models.FloatField()
    risk_level = models.CharField(max_length=30)

    # Optional: store breakdown (important for DASS-21)
    meta = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    action = models.CharField(max_length=100)
    metadata = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    
    
# =========================
# Chat Session
# =========================
class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_pinned = models.BooleanField(default=False)

    def __str__(self):
        return f"Session {self.id} - {self.user.username}"


# =========================
# Chat Messages (bounded memory)
# =========================
class ChatMessage(models.Model):
    ROLE_CHOICES = (
        ("user", "User"),
        ("bot", "Bot"),
    )

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role} - {self.content[:30]}"