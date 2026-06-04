from django.urls import path
from .views import (ProfileView, ConsentView, DeleteAccountView, profile_page, settings_page, consent_page, ClearDataView, JournalSaltView,
                    export_page, ReportDataView)
urlpatterns = [
    path('profile/', ProfileView.as_view()),
    path('consent/', ConsentView.as_view()),
    path('clear-data/', ClearDataView.as_view()),
    path('delete/', DeleteAccountView.as_view()),
    path('journal-salt/', JournalSaltView.as_view()),
    path('report-data/', ReportDataView.as_view()),
    
    path('profile-page/', profile_page, name='profile-page'),
    path('settings-page/', settings_page, name='settings-page'),
    path('consent-page/', consent_page, name='consent-page'),
    path('export-page/', export_page, name='export-page'),
]