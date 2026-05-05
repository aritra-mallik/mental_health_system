from rest_framework import serializers
from .models import (
    Counselor,
    AvailabilitySlot,
    MentalHealthCategory,
    ConsultationType,
    Booking,
    Review
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MentalHealthCategory
        fields = '__all__'


class ConsultationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationType
        fields = '__all__'


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = '__all__'


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'


class CounselorSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True)
    consultation_types = ConsultationTypeSerializer(many=True)
    slots = AvailabilitySerializer(many=True)

    class Meta:
        model = Counselor
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'