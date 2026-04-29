from django.urls import path
from .views import(MoodView, JournalView, AssessmentView,
                   AssessmentHistoryView, app_dashboard, app_assessment, app_chatbot, ChatSessionCreateView, 
                   ChatMessageView, ChatSessionCloseView, journal, 
                   AssessmentRecommendationView, AssessmentSummaryView,ChatSessionDetailView,ChatSessionListView,
                   ChatSessionDeleteView) 
urlpatterns = [
    path("mood/", MoodView.as_view()),
    path("journal/", JournalView.as_view()),
    path("assessment/", AssessmentView.as_view()),
    path("assessment-history/", AssessmentHistoryView.as_view()),
    path("assessment-recommendations/", AssessmentRecommendationView.as_view()),
    path("assessment-summary/", AssessmentSummaryView.as_view()),

    path("dashboard-page/", app_dashboard, name="dashboard"),
    path("assessment-page/", app_assessment, name="assessment_page"),
    path("chatbot-page/", app_chatbot, name="chatbot_page"),
    path("journal-page/", journal, name="journal_page"),

    # Chat API
    path("chat/session/", ChatSessionCreateView.as_view()),
    path("chat/message/", ChatMessageView.as_view()),
    path("chat/close/", ChatSessionCloseView.as_view()),
    path("chat/session/<int:session_id>/", ChatSessionDetailView.as_view()),
    path("chat/sessions/", ChatSessionListView.as_view()),
    path("chat/session/<int:session_id>/delete/", ChatSessionDeleteView.as_view()),
]