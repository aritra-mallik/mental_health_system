from django.db import models
from django.conf import settings
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class MoodEntry(models.Model):
    MOOD_CHOICES = [
        ("happy", "Happy"),
        ("sad", "Sad"),
        ("anxious", "Anxious"),
        ("neutral", "Neutral"),
        ("angry", "Angry"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)
    note = models.TextField(blank=True, null=True)  # optional
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # 🔒 ZERO-KNOWLEDGE STORAGE
    encrypted_content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)


class Assessment(models.Model):
    TYPE_CHOICES = [
        ("phq9", "PHQ-9"),
        ("gad7", "GAD-7"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    assessment_type = models.CharField(max_length=10, choices=TYPE_CHOICES)

    score = models.IntegerField()
    risk_level = models.CharField(max_length=20)

    created_at = models.DateTimeField(auto_now_add=True)
    #answers = models.JSONField()

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    action = models.CharField(max_length=100)
    metadata = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)