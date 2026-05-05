from django.urls import path
from django.shortcuts import render
from .views import (
    booking_success_page,
    get_counselors,
    get_counselor_detail,
    create_booking,
    booking_detail,
    my_bookings,
    my_bookings_page,
    booking_page,
    consultation_list_page
)

urlpatterns = [
    # 🔥 THIS LINE HANDLES /consultation/
    path('', consultation_list_page, name='consultation_list'),

    path('book/', booking_page),
    path('my-bookings/', my_bookings_page),
    path('success/<int:id>/', booking_success_page),

    # APIs
    path('counselors/', get_counselors),
    path('counselors/<int:id>/', get_counselor_detail),
    path('create-booking/', create_booking),
    path('booking/<int:id>/', booking_detail),
    path('my-bookings-api/', my_bookings),
]