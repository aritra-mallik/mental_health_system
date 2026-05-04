from django.urls import path
from django.shortcuts import render
from .views import (
    booking_success_page,
    get_counselors,
    get_counselor_detail,
    create_booking,
    booking_detail,
    my_bookings,
    my_bookings_page
)

# ✅ UI VIEWS
def consultation_list_page(request):
    return render(request, "consultation/consultation_list.html")

def booking_page(request):
    return render(request, "consultation/booking.html")


urlpatterns = [
    # 🔥 THIS LINE HANDLES /consultation/
    path('', consultation_list_page, name='consultation_list'),

    path('book/', booking_page),
    path('my-bookings/', my_bookings_page),
    path('success/<int:id>/', booking_success_page),

    # APIs
    path('api/counselors/', get_counselors),
    path('api/counselors/<int:id>/', get_counselor_detail),
    path('api/create-booking/', create_booking),
    path('api/booking/<int:id>/', booking_detail),
    path('api/my-bookings/', my_bookings),
]