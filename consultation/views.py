from django.shortcuts import render, get_object_or_404
from django.db.models import Q

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Counselor,
    AvailabilitySlot,
    Booking
)

from .serializers import (
    CounselorSerializer,
    BookingSerializer
)


# =========================================================
# PAGES
# =========================================================

def consultation_list_page(request):

    return render(
        request,
        'consultation/consultation_list.html'
    )


def booking_page(request, id):

    counselor = get_object_or_404(
        Counselor,
        id=id
    )

    return render(
        request,
        'consultation/booking.html',
        {
            'counselor': counselor
        }
    )


# =========================================================
# PAYMENT PAGE
# =========================================================

def payment_page(request):

    booking_id = request.GET.get("booking")

    booking = None

    if booking_id:

        booking = get_object_or_404(
            Booking,
            id=booking_id
        )

    return render(
        request,
        'consultation/payment.html',
        {
            "booking": booking
        }
    )


# =========================================================
# BOOKING SUCCESS PAGE
# =========================================================

def booking_success_page(request, id):

    booking = get_object_or_404(
        Booking,
        id=id
    )

    return render(
        request,
        'consultation/booking_success.html',
        {
            'booking': booking
        }
    )


# =========================================================
# MY BOOKINGS PAGE
# =========================================================

def my_bookings_page(request):

    return render(
        request,
        'consultation/my_bookings.html'
    )


# =========================================================
# VIDEO SESSION PAGE
# =========================================================

def video_session_page(request):

    booking_id = request.GET.get("booking")

    booking = None

    if booking_id:

        booking = get_object_or_404(
            Booking,
            id=booking_id
        )

    return render(
        request,
        'consultation/video_session.html',
        {
            "booking": booking
        }
    )


# =========================================================
# CANCEL SUCCESS PAGE
# =========================================================

def cancel_booking_success_page(request):

    return render(
        request,
        'consultation/cancel_booking_success.html'
    )


# =========================================================
# GET COUNSELORS
# =========================================================

@api_view(['GET'])
def get_counselors(request):

    counselors = Counselor.objects.prefetch_related(
        'categories',
        'consultation_types',
        'slots'
    ).all().distinct()

    search = request.GET.get('search')

    if search:

        counselors = counselors.filter(
            Q(name__icontains=search) |
            Q(designation__icontains=search) |
            Q(hospitals__icontains=search)
        )

    category = request.GET.get('category')

    if category:

        counselors = counselors.filter(
            categories__name__icontains=category
        )

    mode = request.GET.get('mode')

    if mode:

        counselors = counselors.filter(
            slots__mode__iexact=mode
        )

    serializer = CounselorSerializer(
        counselors,
        many=True
    )

    return Response(serializer.data)


# =========================================================
# COUNSELOR DETAIL
# =========================================================

@api_view(['GET'])
def get_counselor_detail(request, id):

    counselor = get_object_or_404(
        Counselor,
        id=id
    )

    selected_date = request.GET.get('date')

    slots = AvailabilitySlot.objects.filter(
        counselor=counselor,
        is_booked=False
    )

    if selected_date:

        slots = slots.filter(
            date=selected_date
        )

    serializer = CounselorSerializer(counselor)

    data = serializer.data

    data['slots'] = [

        {
            'id': slot.id,
            'date': str(slot.date),
            'time': slot.time.strftime('%I:%M %p'),
            'mode': str(slot.mode).strip(),
            'is_booked': slot.is_booked
        }

        for slot in slots
    ]

    return Response(data)


# =========================================================
# CREATE BOOKING
# =========================================================

@api_view(['POST'])
def create_booking(request):

    # AUTH CHECK
    if not request.user.is_authenticated:

        return Response(
            {
                "success": False,
                "message": "Authentication required"
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    counselor_id = request.data.get('counselor')
    slot_id = request.data.get('slot')

    if not counselor_id or not slot_id:

        return Response(
            {
                "success": False,
                "message": "Missing booking data"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    counselor = get_object_or_404(
        Counselor,
        id=counselor_id
    )

    slot = get_object_or_404(
        AvailabilitySlot,
        id=slot_id
    )

    # PREVENT DOUBLE BOOKING
    if slot.is_booked:

        return Response(
            {
                "success": False,
                "message": "Slot already booked"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # CREATE BOOKING
    booking = Booking.objects.create(
        user=request.user,
        counselor=counselor,
        slot=slot,
        status="booked",
        payment_status="pending"
    )

    # MARK SLOT BOOKED
    slot.is_booked = True
    slot.save()

    serializer = BookingSerializer(booking)

    return Response({

        "success": True,

        "booking": serializer.data,

        "payment_url":
            f"/api/consultation/payment/?booking={booking.id}"

    })


# =========================================================
# BOOKING DETAIL
# =========================================================

@api_view(['GET'])
def booking_detail(request, id):

    booking = get_object_or_404(
        Booking,
        id=id
    )

    serializer = BookingSerializer(booking)

    return Response(serializer.data)


# =========================================================
# MY BOOKINGS
# =========================================================

@api_view(['GET'])
def my_bookings(request):

    if not request.user.is_authenticated:

        return Response(
            [],
            status=status.HTTP_401_UNAUTHORIZED
        )

    bookings = Booking.objects.filter(
        user=request.user
    ).select_related(
        'counselor',
        'slot'
    ).order_by('-id')

    serializer = BookingSerializer(
        bookings,
        many=True
    )

    return Response(serializer.data)


# =========================================================
# CANCEL BOOKING
# =========================================================

@api_view(['POST'])
def cancel_booking(request, id):

    booking = get_object_or_404(
        Booking,
        id=id,
        user=request.user
    )

    # ALREADY CANCELLED
    if booking.status == "cancelled":

        return Response(
            {
                "success": False,
                "message": "Booking already cancelled"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # CANCEL BOOKING
    booking.status = "cancelled"
    booking.save()

    # FREE SLOT
    slot = booking.slot

    slot.is_booked = False
    slot.save()

    return Response({
        "success": True,
        "message": "Booking cancelled successfully"
    })


# =========================================================
# RESCHEDULE SLOTS
# =========================================================

@api_view(['GET'])
def reschedule_slots(request, id):

    booking = get_object_or_404(
        Booking,
        id=id,
        user=request.user
    )

    slots = AvailabilitySlot.objects.filter(
        counselor=booking.counselor,
        is_booked=False
    ).exclude(
        id=booking.slot.id
    )[:4]

    data = [

        {
            "id": slot.id,
            "date": str(slot.date),
            "time": slot.time.strftime('%I:%M %p')
        }

        for slot in slots
    ]

    return Response(data)


# =========================================================
# RESCHEDULE BOOKING
# =========================================================

@api_view(['POST'])
def reschedule_booking(request, id):

    booking = get_object_or_404(
        Booking,
        id=id,
        user=request.user
    )

    new_slot_id = request.data.get('slot')

    if not new_slot_id:

        return Response(
            {
                "success": False,
                "message": "No slot selected"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    new_slot = get_object_or_404(
        AvailabilitySlot,
        id=new_slot_id
    )

    # PREVENT BOOKED SLOT
    if new_slot.is_booked:

        return Response(
            {
                "success": False,
                "message": "Selected slot already booked"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # FREE OLD SLOT
    old_slot = booking.slot

    old_slot.is_booked = False
    old_slot.save()

    # ASSIGN NEW SLOT
    booking.slot = new_slot
    booking.status = "booked"
    booking.save()

    # BOOK NEW SLOT
    new_slot.is_booked = True
    new_slot.save()

    return Response({
        "success": True,
        "message": "Booking rescheduled successfully"
    })