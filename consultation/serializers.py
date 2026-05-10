from rest_framework import serializers

from .models import (
    Counselor,
    AvailabilitySlot,
    MentalHealthCategory,
    ConsultationType,
    Booking,
    Review
)


# =========================================
# CATEGORY
# =========================================
class CategorySerializer(serializers.ModelSerializer):

    class Meta:

        model = MentalHealthCategory

        fields = [
            'id',
            'name'
        ]


# =========================================
# CONSULTATION TYPE
# =========================================
class ConsultationTypeSerializer(serializers.ModelSerializer):

    class Meta:

        model = ConsultationType

        fields = [
            'id',
            'name',
            'description'
        ]


# =========================================
# AVAILABILITY SLOT
# =========================================
class AvailabilitySerializer(serializers.ModelSerializer):

    formatted_time = serializers.SerializerMethodField()

    class Meta:

        model = AvailabilitySlot

        fields = [
            'id',

            'date',
            'time',
            'formatted_time',

            'duration',

            'mode',

            'chamber_name',
            'location',

            'latitude',
            'longitude',

            'is_booked'
        ]

    def get_formatted_time(self, obj):

        return obj.time.strftime('%I:%M %p')


# =========================================
# REVIEW
# =========================================
class ReviewSerializer(serializers.ModelSerializer):

    class Meta:

        model = Review

        fields = [
            'id',
            'user',
            'rating',
            'comment',
            'created_at'
        ]


# =========================================
# COUNSELOR
# =========================================
class CounselorSerializer(serializers.ModelSerializer):

    categories = CategorySerializer(
        many=True,
        read_only=True
    )

    consultation_types = ConsultationTypeSerializer(
        many=True,
        read_only=True
    )

    slots = AvailabilitySerializer(
        many=True,
        read_only=True
    )

    reviews = ReviewSerializer(
        many=True,
        read_only=True
    )

    class Meta:

        model = Counselor

        fields = [

            'id',

            'name',
            'designation',
            'bio',

            'education',
            'university',

            'experience_years',
            'patients_treated',
            'success_rate',

            'rating',
            'review_count',

            'consultation_fee',
            'session_duration',

            'hospitals',
            'achievements',
            'research_work',
            'innovations',

            'is_verified',

            'categories',
            'consultation_types',

            'slots',
            'reviews'
        ]


# =========================================
# BOOKING
# =========================================
class BookingSerializer(serializers.ModelSerializer):

    counselor_name = serializers.CharField(
        source='counselor.name',
        read_only=True
    )

    counselor_designation = serializers.CharField(
        source='counselor.designation',
        read_only=True
    )

    slot_date = serializers.CharField(
        source='slot.date',
        read_only=True
    )

    slot_mode = serializers.CharField(
        source='slot.mode',
        read_only=True
    )

    slot_time = serializers.SerializerMethodField()

    chamber_name = serializers.CharField(
        source='slot.chamber_name',
        read_only=True
    )

    location = serializers.CharField(
        source='slot.location',
        read_only=True
    )

    class Meta:

        model = Booking

        fields = [

            'id',

            'user',

            'counselor',
            'counselor_name',
            'counselor_designation',

            'slot',

            'slot_date',
            'slot_time',
            'slot_mode',

            'chamber_name',
            'location',

            'status',

            'created_at',
            'updated_at'
        ]

    def get_slot_time(self, obj):

        return obj.slot.time.strftime('%I:%M %p')