from django.urls import path

from .views import (

    # PAGE VIEWS
    consultation_list_page,
    booking_page,
    payment_page,
    booking_success_page,
    my_bookings_page,
    video_session_page,
    cancel_booking_success_page,

    # API VIEWS
    get_counselors,
    get_counselor_detail,
    create_booking,
    booking_detail,
    my_bookings,
    cancel_booking,
    reschedule_slots,
    reschedule_booking
)

urlpatterns = [

    # =========================================================
    # PAGES
    # =========================================================

    # Consultation List Page
    path(
        '',
        consultation_list_page,
        name='consultation_list'
    ),

    # Booking Page
    path(
        'booking/<int:id>/',
        booking_page,
        name='booking_page'
    ),

    # Payment Page
    path(
        'payment/',
        payment_page,
        name='payment_page'
    ),

    # Booking Success Page
    path(
        'success/<int:id>/',
        booking_success_page,
        name='booking_success'
    ),

    # My Bookings Page
    path(
        'my-bookings/',
        my_bookings_page,
        name='my_bookings_page'
    ),

    # Video Session Page
    path(
        'video-session/',
        video_session_page,
        name='video_session'
    ),

    # Cancel Booking Success Page
    path(
        'cancel-booking-success/',
        cancel_booking_success_page,
        name='cancel_booking_success'
    ),

    # =========================================================
    # APIs
    # =========================================================

    # Get All Counselors
    path(
        'counselors/',
        get_counselors,
        name='get_counselors'
    ),

    # Get Counselor Details
    path(
        'counselors/<int:id>/',
        get_counselor_detail,
        name='get_counselor_detail'
    ),

    # Create Booking
    path(
        'create-booking/',
        create_booking,
        name='create_booking'
    ),

    # Booking Detail API
    path(
        'booking-detail/<int:id>/',
        booking_detail,
        name='booking_detail'
    ),

    # My Bookings API
    path(
        'my-bookings-api/',
        my_bookings,
        name='my_bookings'
    ),

    # Cancel Booking API
    path(
        'cancel-booking/<int:id>/',
        cancel_booking,
        name='cancel_booking'
    ),

    # Reschedule Slots API
    path(
        'reschedule-slots/<int:id>/',
        reschedule_slots,
        name='reschedule_slots'
    ),

    # Reschedule Booking API
    path(
        'reschedule-booking/<int:id>/',
        reschedule_booking,
        name='reschedule_booking'
    ),
]