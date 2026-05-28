from django.db import models
from django.conf import settings

class Counselor(models.Model):
    MODE_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline")
    ]

    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, null=True, blank=True)
    designation = models.CharField(max_length=100)
    specialization = models.CharField(max_length=200)
    experience = models.IntegerField()
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_sessions = models.PositiveIntegerField(default=0)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default="online")
    office_address = models.TextField(blank=True, null=True)
    google_map_link = models.URLField(blank=True, null=True)
    available = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["mode"]),
            models.Index(fields=["available"])
        ]

    def __str__(self):
        return self.name

class Slot(models.Model):
    MODE_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline")
    ]

    counselor = models.ForeignKey(Counselor, on_delete=models.CASCADE, related_name="slots")
    date = models.DateField()
    time = models.TimeField()
    mode = models.CharField(max_length=20, choices=MODE_CHOICES)
    booked = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["date", "booked"])
        ]
        unique_together = ("counselor", "date", "time")

    def __str__(self):
        return f"{self.counselor.name} - {self.date}"

class Booking(models.Model):
    STATUS_CHOICES = [
        ("booked", "Booked"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled")
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    counselor = models.ForeignKey(Counselor, on_delete=models.CASCADE)
    slot = models.OneToOneField(Slot, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="booked")
    created_at = models.DateTimeField(auto_now_add=True)
    meeting_link = models.URLField(blank=True, null=True)
    access_key = models.CharField(max_length=30, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "slot"], name="unique_user_slot")
        ]

    def __str__(self):
        return f"{self.user} - {self.counselor.name}"