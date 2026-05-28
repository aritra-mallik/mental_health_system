from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
from .models import Counselor, Slot, Booking
import uuid

class BookingService:

    @staticmethod
    @transaction.atomic
    def create_booking(user, counselor_id, slot_id):
        counselor = get_object_or_404(Counselor, id=counselor_id)
        slot = Slot.objects.select_for_update().filter(id=slot_id, counselor_id=counselor_id).first()

        if not slot:
            raise Exception("Slot does not exist")
        if slot.booked:
            raise Exception("Slot already booked")

        slot.booked = True
        slot.save()

        existing_booking = Booking.objects.filter(user=user, slot=slot).first()

        if existing_booking:
            existing_booking.status = "booked"
            existing_booking.counselor = counselor
            booking = existing_booking
        else:
            booking = Booking.objects.create(user=user, counselor=counselor, slot=slot)

        if slot.mode == "online":
            booking.meeting_link = f"https://meet.jit.si/{uuid.uuid4()}"
        else:
            booking.access_key = f"CLINIC-{uuid.uuid4().hex[:8].upper()}"

        booking.save()
        user_name = user.display_name or user.email

        meeting_info = f"Meeting Link:\n{booking.meeting_link}" if slot.mode == "online" else f"Offline Session\n\nClinic Access Key:\n{booking.access_key}\n\nPlease show this key at reception.\nPlease arrive 15 minutes early."

        send_mail(
            subject="Booking Confirmed",
            message=f"Hello {user_name},\n\nYour consultation booking is confirmed.\n\nCounselor: {counselor.name}\nDate: {slot.date}\nTime: {slot.time}\nMode: {slot.mode}\n\n{meeting_info}\n\nThank you.",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user.email],
            fail_silently=True
        )

        if counselor.email:
            counselor_meeting_info = f"Meeting Link:\n{booking.meeting_link}" if slot.mode == "online" else f"Offline Session\n\nClinic Access Key:\n{booking.access_key}"
            
            send_mail(
                subject="New Appointment Booked",
                message=f"Hello {counselor.name},\n\nA new appointment has been booked.\n\nUser: {user_name}\nEmail: {user.email}\nDate: {slot.date}\nTime: {slot.time}\nMode: {slot.mode}\n\n{counselor_meeting_info}\n\nThank you.",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[counselor.email],
                fail_silently=True
            )

        return booking