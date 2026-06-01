from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import render, get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from .models import Counselor, Booking, Slot
from .serializers import CounselorSerializer, BookingSerializer
from .services import BookingService

IST = ZoneInfo('Asia/Kolkata')

class CounselorListAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        counselors = Counselor.objects.filter(available=True)
        return Response(CounselorSerializer(counselors, many=True).data)

class CounselorDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        counselor = get_object_or_404(Counselor, id=id, available=True)
        return Response(CounselorSerializer(counselor).data)

class CancelBookingAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        booking = Booking.objects.get(id=id, user=request.user)
        appointment = datetime.combine(booking.slot.date, booking.slot.time, tzinfo=IST)
        cutoff = appointment - timedelta(minutes=30)

        if timezone.now().astimezone(IST) >= cutoff:
            return Response({"message": "Cannot modify booking within 30 minutes of appointment"}, status=400)

        booking.status = "cancelled"
        booking.slot.booked = False
        booking.slot.save()
        booking.save()

        user_name = request.user.display_name or request.user.email

        send_mail(
            subject="Booking Cancelled",
            message=f"Hello {user_name},\n\nYour consultation session has been cancelled.\n\nCounselor: {booking.counselor.name}\nDate: {booking.slot.date}\nTime: {booking.slot.time}\nMode: {booking.slot.mode}\n\nThank you.",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[request.user.email],
            fail_silently=True
        )

        if booking.counselor.email:
            send_mail(
                subject="Appointment Cancelled",
                message=f"Hello {booking.counselor.name},\n\nA consultation appointment has been cancelled.\n\nUser: {user_name}\nEmail: {request.user.email}\nDate: {booking.slot.date}\nTime: {booking.slot.time}\nMode: {booking.slot.mode}",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[booking.counselor.email],
                fail_silently=True
            )

        return Response({"message": "Booking cancelled"})

class RescheduleBookingAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        booking = Booking.objects.get(id=id, user=request.user)
        appointment = datetime.combine(booking.slot.date, booking.slot.time, tzinfo=IST)
        cutoff = appointment - timedelta(minutes=30)

        if timezone.now().astimezone(IST) >= cutoff:
            return Response({"message": "Cannot modify booking within 30 minutes of appointment"}, status=400)

        old_slot = booking.slot
        old_slot.booked = False
        old_slot.save()

        new_slot = Slot.objects.get(id=request.data.get("slot"))
        new_slot.booked = True
        new_slot.save()

        booking.slot = new_slot
        booking.save()

        user_name = request.user.display_name or request.user.email
        meeting_link_text = booking.meeting_link if new_slot.mode == "online" else "Offline Session"

        send_mail(
            subject="Session Rescheduled",
            message=f"Hello {user_name},\n\nYour consultation session has been rescheduled.\n\nCounselor: {booking.counselor.name}\nPrevious Date: {old_slot.date}\nPrevious Time: {old_slot.time}\nNew Date: {new_slot.date}\nNew Time: {new_slot.time}\nMode: {new_slot.mode}\n\nMeeting Link:\n{meeting_link_text}\n\nThank you.",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[request.user.email],
            fail_silently=True
        )

        if booking.counselor.email:
            send_mail(
                subject="Appointment Rescheduled",
                message=f"Hello {booking.counselor.name},\n\nA session has been rescheduled.\n\nUser: {user_name}\nPrevious Date: {old_slot.date}\nPrevious Time: {old_slot.time}\nNew Date: {new_slot.date}\nNew Time: {new_slot.time}\nMode: {new_slot.mode}\n\nMeeting Link:\n{meeting_link_text}\n\nThank you.",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[booking.counselor.email],
                fail_silently=True
            )

        return Response({"detail": "Booking rescheduled"})

class BookingAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            booking = BookingService.create_booking(
                user=request.user,
                counselor_id=request.data.get("counselor"),
                slot_id=request.data.get("slot")
            )
            return Response({"detail": "Booking created", "booking_id": booking.id})
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class MyBookingsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(user=request.user).select_related("slot", "counselor")
        current_time = timezone.now().astimezone(IST)

        for booking in bookings:
            if booking.status == "booked":
                consultation_date_time = datetime.combine(booking.slot.date, booking.slot.time, tzinfo=IST)
                if current_time >= consultation_date_time:
                    booking.status = "completed"
                    booking.save()
                    
        return Response(BookingSerializer(bookings, many=True).data)

class TodayAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now().astimezone(IST)
        today = now.date()
        current_time = now.time()

        booking = Booking.objects.filter(
            user=request.user,
            status="booked",
            slot__date=today,
            slot__time__gte=current_time
        ).select_related("counselor", "slot").order_by("slot__time").first()

        if not booking:
            return Response({"hasAppointment": False})

        return Response({
            "hasAppointment": True,
            "counselor": booking.counselor.name,
            "date": str(booking.slot.date),
            "time": booking.slot.time.strftime("%I:%M %p"),
            "mode": booking.slot.mode
        })

class BookingDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        booking = get_object_or_404(Booking, id=id, user=request.user)
        return Response(BookingSerializer(booking).data)

def consultation_page(request):
    return render(request, "consultation/consultation.html")

def booking_page(request):
    return render(request, "consultation/booking.html")

def reschedule_page(request):
    return render(request, "consultation/reschedule.html")

def booking_history_page(request):
    return render(request, "consultation/booking_history.html")

def review_booking_page(request):
    return render(request, "consultation/review_booking.html")