from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404, render
from django.utils.timezone import now
from django.db import transaction

from .models import Counselor, AvailabilitySlot, Booking


# =========================
# LIST ALL COUNSELORS
# =========================
@api_view(['GET'])
def get_counselors(request):

    counselors = Counselor.objects.all().values(
        'id',
        'name',
        'designation',
        'consultation_fee'
    )

    return Response(list(counselors))


# =========================
# SINGLE COUNSELOR DETAIL + SLOTS
# =========================
@api_view(['GET'])
def get_counselor_detail(request, id):

    c = get_object_or_404(Counselor, id=id)

    date = request.GET.get("date")

    slots_qs = AvailabilitySlot.objects.filter(counselor=c)

    if date:
        slots_qs = slots_qs.filter(date=date)

    slots_qs = slots_qs.filter(date__gte=now().date())

    slots = slots_qs.order_by('time').values(
        'id',
        'date',
        'time',
        'mode',
        'chamber_name',
        'is_booked'
    )

    return Response({
        "id": c.id,
        "name": c.name,
        "designation": c.designation,
        "slots": list(slots)
    })


# =========================
# CREATE BOOKING (SAFE)
# =========================
@api_view(['POST'])
def create_booking(request):

    user = request.user if request.user.is_authenticated else None
    counselor_id = request.data.get("counselor")
    slot_id = request.data.get("slot")

    try:
        with transaction.atomic():

            slot = AvailabilitySlot.objects.select_for_update().get(id=slot_id)

            if slot.is_booked:
                return Response({"error": "Selected slot already booked"}, status=400)

            booking = Booking.objects.create(
                user=user,
                counselor_id=counselor_id,
                slot=slot,
                status="Confirmed"
            )

            slot.is_booked = True
            slot.save()

            return Response({
                "id": booking.id,
                "message": "Booking successful"
            })

    except AvailabilitySlot.DoesNotExist:
        return Response({"error": "Invalid slot"}, status=404)


# =========================
# BOOKING DETAILS (SUCCESS PAGE)
# =========================
@api_view(['GET'])
def booking_detail(request, id):

    booking = get_object_or_404(
        Booking.objects.select_related('counselor', 'slot'),
        id=id
    )

    return Response({
        "counselor": booking.counselor.name,
        "date": booking.slot.date,
        "time": booking.slot.time,
        "status": booking.status
    })


# =========================
# MY BOOKINGS API  FIX ADDED
# =========================
@api_view(['GET'])
def my_bookings(request):

    bookings = Booking.objects.select_related('counselor', 'slot').order_by('-id')

    data = []

    for b in bookings:
        data.append({
            "id": b.id,
            "counselor": b.counselor.name,
            "date": b.slot.date,
            "time": b.slot.time,
            "status": b.status
        })

    return Response(data)


# =========================
# UI PAGES
# =========================

def consultation_list_page(request):
    return render(request, "consultation/consultation_list.html")

def booking_success_page(request, id):
    return render(request, "consultation/booking_success.html")


def my_bookings_page(request):
    return render(request, "consultation/my_bookings.html")



# ✅ UI VIEWS
def consultation_list_page(request):
    return render(request, "consultation/consultation_list.html")

def booking_page(request):
    return render(request, "consultation/booking.html")