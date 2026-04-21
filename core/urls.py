from django.urls import path
from .views import (
    MoodView, JournalView, AssessmentView, AssessmentHistoryView,
    app_dashboard, app_assessment, app_chatbot,
    ChatSessionCreateView, ChatMessageView, ChatSessionCloseView
)

urlpatterns = [
    path("mood/", MoodView.as_view()),
    path("journal/", JournalView.as_view()),
    path("assessment/", AssessmentView.as_view()),
    path("assessment-history/", AssessmentHistoryView.as_view()),

    # Pages
    path("dashboard-page/", app_dashboard, name="dashboard"),
    path("assessment-page/", app_assessment, name="assessment_page"),
    path("chatbot-page/", app_chatbot, name="chatbot_page"),

    # Chat API
    path("chat/session/", ChatSessionCreateView.as_view()),
    path("chat/message/", ChatMessageView.as_view()),
    path("chat/close/", ChatSessionCloseView.as_view()),
]