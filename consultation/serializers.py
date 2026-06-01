from rest_framework import serializers
from .models import Counselor, Slot, Booking
from django.utils import timezone
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

IST = ZoneInfo('Asia/Kolkata')

class SlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slot
        fields = ["id", "date", "time", "mode"]

class CounselorSerializer(serializers.ModelSerializer):
    slots = serializers.SerializerMethodField()

    class Meta:
        model = Counselor
        fields = [
            "id", "name", "email", "designation", "specialization", "experience", "consultation_fee", 
            "rating", "total_sessions", "mode", "office_address", "google_map_link", "slots"
        ]

    def get_slots(self, obj):
        # Enforce IST time
        current = timezone.now().astimezone(IST)
        booking_buffer = current + timedelta(hours=2)

        slots = obj.slots.filter(booked=False).order_by("date", "time")
        valid_slots = []

        for slot in slots:
            slot_date_time = datetime.combine(slot.date, slot.time, tzinfo=IST)
            if slot_date_time >= booking_buffer:
                valid_slots.append(slot)

        return SlotSerializer(valid_slots, many=True).data

class BookingSerializer(serializers.ModelSerializer):
    counselor = CounselorSerializer(read_only=True)
    slot = SlotSerializer(read_only=True)
    
    consultation_fee = serializers.DecimalField(source="counselor.consultation_fee", max_digits=8, decimal_places=2, read_only=True)
    platform_fee = serializers.SerializerMethodField()
    total_fee = serializers.SerializerMethodField()
    can_modify = serializers.SerializerMethodField()
    can_join = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "counselor", "slot", "status", "meeting_link", "access_key", "consultation_fee", 
            "platform_fee", "total_fee", "created_at", "can_modify", "can_join"
        ]

    def get_platform_fee(self, obj):
        return 50

    def get_total_fee(self, obj):
        return float(obj.counselor.consultation_fee) + 50
    
    def get_can_modify(self, obj):
        current = timezone.now().astimezone(IST)
        appointment = datetime.combine(obj.slot.date, obj.slot.time, tzinfo=IST)
        cutoff = appointment - timedelta(minutes=30)
        return obj.status == "booked" and current < cutoff

    def get_can_join(self, obj):
        current = timezone.now().astimezone(IST)
        appointment = datetime.combine(obj.slot.date, obj.slot.time, tzinfo=IST)
        join_start = appointment - timedelta(minutes=30)
        join_end = appointment + timedelta(minutes=45)
        return obj.status == "booked" and join_start <= current <= join_end