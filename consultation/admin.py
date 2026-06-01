from django.contrib import admin
from django.utils import timezone
from datetime import timedelta, time
from zoneinfo import ZoneInfo

from .models import Counselor, Slot, Booking

# Define IST Timezone
IST = ZoneInfo('Asia/Kolkata')

@admin.register(Counselor)
class CounselorAdmin(admin.ModelAdmin):
    list_display = (
        "name", "designation", "specialization", "experience", 
        "consultation_fee", "rating", "total_sessions", "mode", 
        "office_address", "available"
    )

    def save_model(self, request, obj, form, change):
        is_new = obj.pk is None
        super().save_model(request, obj, form, change)

        if is_new:
            default_times = [
                time(9, 0), time(10, 0), time(11, 0),
                time(14, 0), time(15, 0)
            ]

            # FIX: Safely get "today's date" strictly in IST, ignoring server UTC
            now_ist = timezone.now().astimezone(IST)
            today_ist = now_ist.date()

            for day in range(60):
                current_date = today_ist + timedelta(days=day)
                for slot_time in default_times:
                    Slot.objects.get_or_create(counselor=obj, date=current_date, time=slot_time, defaults={"mode": obj.mode, "booked": False})
                 
@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ("counselor", "date", "time", "mode", "booked")
    search_fields = ("counselor__name",)
    list_filter = ("mode", "booked", "date")
    ordering = ("date", "time")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("user", "counselor", "slot", "status", "created_at")
    search_fields = ("user__email", "counselor__name")
    list_filter = ("status", "created_at")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)