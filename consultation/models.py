from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class ConsultationType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class MentalHealthCategory(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Counselor(models.Model):
    name = models.CharField(max_length=150)
    designation = models.CharField(max_length=150)
    bio = models.TextField(blank=True)

    consultation_types = models.ManyToManyField(ConsultationType, blank=True)
    categories = models.ManyToManyField(MentalHealthCategory, blank=True)

    education = models.TextField()
    university = models.CharField(max_length=200, blank=True)

    experience_years = models.IntegerField()
    patients_treated = models.IntegerField(default=0)
    success_rate = models.FloatField(default=0)

    rating = models.FloatField(default=0)
    review_count = models.IntegerField(default=0)

    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2)
    session_duration = models.IntegerField(default=30)

    hospitals = models.TextField(blank=True)
    achievements = models.TextField(blank=True)
    research_work = models.TextField(blank=True)
    innovations = models.TextField(blank=True)
    is_verified = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class AvailabilitySlot(models.Model):
    MODE_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
    ]

    counselor = models.ForeignKey(Counselor, on_delete=models.CASCADE, related_name="slots")
    date = models.DateField()
    time = models.TimeField()
    duration = models.IntegerField(default=30)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='online')

    chamber_name = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    is_booked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('counselor', 'date', 'time')


class Booking(models.Model):
    STATUS_CHOICES = [
        ('booked', 'Booked'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('rescheduled', 'Rescheduled'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    counselor = models.ForeignKey(Counselor, on_delete=models.CASCADE)
    slot = models.OneToOneField(AvailabilitySlot, on_delete=models.CASCADE)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='booked')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    counselor = models.ForeignKey(Counselor, on_delete=models.CASCADE, related_name="reviews")

    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)    