from django.urls import path
from .views import ProfileView, ConsentView, ExportDataView, DeleteAccountView, profile_page, settings_page, consent_page

urlpatterns = [
    path('profile/', ProfileView.as_view()),
    path('consent/', ConsentView.as_view()),
    path('export/', ExportDataView.as_view()),
    path('delete/', DeleteAccountView.as_view()),
    
    
    path('profile-page/', profile_page, name='profile-page'),
    path('settings-page/', settings_page, name='settings-page'),
    path('consent-page/', consent_page, name='consent-page'),
]