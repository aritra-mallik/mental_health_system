from django.urls import path
from .views import *

urlpatterns = [
    # API
    path("counselors/", CounselorListAPI.as_view()),
    path("counselors/<int:id>/", CounselorDetailAPI.as_view()),
    path("book/", BookingAPI.as_view()),
    path("my-bookings/", MyBookingsAPI.as_view()),
    path("cancel-booking/<int:id>/", CancelBookingAPI.as_view()),
    path("reschedule-booking/<int:id>/", RescheduleBookingAPI.as_view()),
    path("today-appointment/",TodayAppointmentView.as_view()),
    path("booking/<int:id>/", BookingDetailAPI.as_view()),

    # WEB
    path("", consultation_page),
    path("booking-page/", booking_page),
    path("booking-history/", booking_history_page),
    path("review-booking/", review_booking_page),
    path("reschedule-page/", reschedule_page),
]