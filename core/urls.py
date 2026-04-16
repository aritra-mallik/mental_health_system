from django.urls import path
from .views import MoodView, JournalView, AssessmentView, AssessmentHistoryView, app_dashboard, app_assessment, home    

urlpatterns = [
    path("", home, name="home"),

    path("mood/", MoodView.as_view()),
    path("journal/", JournalView.as_view()),
    path("assessment/", AssessmentView.as_view()),
    path("assessment-history/", AssessmentHistoryView.as_view()),
    
    path("dashboard-page/", app_dashboard, name="dashboard"),
    path("assessment-page/", app_assessment, name="assessment_page"),
]