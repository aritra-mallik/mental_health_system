from django.urls import path
from .views import MoodView, JournalView, AssessmentView, AssessmentHistoryView, app_dashboard, app_assessment,app_chat
from .views import (
    ChatSessionCreateView,
    ChatMessageView,
    ChatSessionCloseView
)
urlpatterns = [
    path("mood/", MoodView.as_view()),
    path("journal/", JournalView.as_view()),
    path("assessment/", AssessmentView.as_view()),
    path("assessment-history/", AssessmentHistoryView.as_view()),
    
    path("dashboard-page/", app_dashboard, name="dashboard"),
    path("assessment-page/", app_assessment, name="assessment_page"),
    path("chat/create/", ChatSessionCreateView.as_view()),
    path("chat/send/", ChatMessageView.as_view()),
    path("chat/close/", ChatSessionCloseView.as_view()),
    path("chat-page/", app_chat, name="chat_page"),
]