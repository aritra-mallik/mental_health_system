from django.db import models
from django.conf import settings
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator
)


# =====================================================
# CONSULTATION TYPES
# =====================================================
class ConsultationType(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    def __str__(self):
        return self.name


# =====================================================
# MENTAL HEALTH CATEGORY
# =====================================================
class MentalHealthCategory(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    def __str__(self):
        return self.name


# =====================================================
# COUNSELOR
# =====================================================
class Counselor(models.Model):

    LIVE_STATUS_CHOICES = [

        ('online', 'Online'),
        ('offline', 'Offline'),
        ('busy', 'Busy'),

    ]

    # BASIC
    name = models.CharField(max_length=150)

    designation = models.CharField(
        max_length=150
    )

    bio = models.TextField(
        blank=True
    )

    # RELATIONS
    consultation_types = models.ManyToManyField(
        ConsultationType,
        blank=True
    )

    categories = models.ManyToManyField(
        MentalHealthCategory,
        blank=True
    )

    # EDUCATION
    education = models.TextField()

    university = models.CharField(
        max_length=200,
        blank=True
    )

    # EXPERIENCE
    experience_years = models.IntegerField()

    patients_treated = models.IntegerField(
        default=0
    )

    success_rate = models.FloatField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ]
    )

    # RATINGS
    rating = models.FloatField(
        default=0
    )

    review_count = models.IntegerField(
        default=0
    )

    # FEES
    consultation_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )

    session_duration = models.IntegerField(
        default=30
    )

    # PROFESSIONAL INFO
    hospitals = models.TextField(
        blank=True
    )

    achievements = models.TextField(
        blank=True
    )

    research_work = models.TextField(
        blank=True
    )

    innovations = models.TextField(
        blank=True
    )

    # STATUS
    live_status = models.CharField(
        max_length=20,
        choices=LIVE_STATUS_CHOICES,
        default='offline'
    )

    is_verified = models.BooleanField(
        default=True
    )

    # TIMESTAMPS
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:

        ordering = ['-id']

        indexes = [

            models.Index(fields=['name']),
            models.Index(fields=['live_status'])

        ]

    def __str__(self):
        return self.name


# =====================================================
# AVAILABILITY SLOT
# =====================================================
class AvailabilitySlot(models.Model):

    MODE_CHOICES = [

        ('online', 'Online'),
        ('offline', 'Offline'),

    ]

    counselor = models.ForeignKey(
        Counselor,
        on_delete=models.CASCADE,
        related_name="slots"
    )

    date = models.DateField()

    time = models.TimeField()

    duration = models.IntegerField(
        default=30
    )

    mode = models.CharField(
        max_length=20,
        choices=MODE_CHOICES,
        default='online'
    )

    chamber_name = models.CharField(
        max_length=200,
        blank=True
    )

    location = models.CharField(
        max_length=255,
        blank=True
    )

    latitude = models.FloatField(
        null=True,
        blank=True
    )

    longitude = models.FloatField(
        null=True,
        blank=True
    )

    is_booked = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        ordering = ['date', 'time']

        unique_together = (
            'counselor',
            'date',
            'time'
        )

        indexes = [

            models.Index(fields=['date']),
            models.Index(fields=['is_booked'])

        ]

    def __str__(self):

        return f"{self.counselor.name} - {self.date} {self.time}"


# =====================================================
# BOOKING
# =====================================================
class Booking(models.Model):

    STATUS_CHOICES = [

        ('booked', 'Booked'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('rescheduled', 'Rescheduled'),

    ]

    PAYMENT_STATUS_CHOICES = [

        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),

    ]

    # RELATIONS
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    counselor = models.ForeignKey(
        Counselor,
        on_delete=models.CASCADE
    )

    slot = models.OneToOneField(
        AvailabilitySlot,
        on_delete=models.CASCADE
    )

    # STATUS
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='booked'
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending'
    )

    # CANCELLATION
    cancellation_reason = models.TextField(
        blank=True,
        null=True
    )

    cancelled_at = models.DateTimeField(
        blank=True,
        null=True
    )

    # RESCHEDULE
    rescheduled_at = models.DateTimeField(
        blank=True,
        null=True
    )

    # SESSION DETAILS
    meeting_link = models.URLField(
        blank=True,
        null=True
    )

    hospital_address = models.TextField(
        blank=True,
        null=True
    )

    notes = models.TextField(
        blank=True,
        null=True
    )

    # TIMESTAMPS
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:

        ordering = ['-created_at']

        indexes = [

            models.Index(fields=['status']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['created_at'])

        ]

    def __str__(self):

        return f"{self.user} - {self.counselor.name}"


# =====================================================
# REVIEW
# =====================================================
class Review(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    counselor = models.ForeignKey(
        Counselor,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    rating = models.IntegerField(

        validators=[
            MinValueValidator(1),
            MaxValueValidator(5)
        ]

    )

    comment = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        ordering = ['-created_at']

    def __str__(self):

        return f"{self.user} - {self.rating}"