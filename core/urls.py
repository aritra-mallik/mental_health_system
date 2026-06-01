from django.urls import path
from .views import(JournalPinView, JournalView, AssessmentView, VaultKeyAPI,
                   AssessmentHistoryView, VerifyJournalPasswordView, app_dashboard, app_assessment, app_chatbot, ChatSessionCreateView, 
                   ChatMessageView, ChatSessionCloseView, journal, SpeechToTextView, TextToSpeechView,
                   AssessmentRecommendationView, AssessmentSummaryView,ChatSessionDetailView,ChatSessionListView,
                   ChatSessionDeleteView, ChatSessionPinView, LiveAlertView,ChatInitialMessageView,
                   ChatSessionWithContextView,MoodTrendView,RawMoodEventsView,CurrentMoodView,
                    RecoverySuggestionView, recovery_hub, calm_now, sleep_support, burnout_recovery) 
urlpatterns = [
    path("current-mood/", CurrentMoodView.as_view()),
    path("journal/", JournalView.as_view()),
    path("journal/<int:entry_id>/pin/", JournalPinView.as_view()),
    path("assessment/", AssessmentView.as_view()),
    path("assessment-history/", AssessmentHistoryView.as_view()),
    path("assessment-recommendations/", AssessmentRecommendationView.as_view()),
    path("assessment-summary/", AssessmentSummaryView.as_view()),

    path("dashboard-page/", app_dashboard, name="dashboard"),
    path("assessment-page/", app_assessment, name="assessment_page"),
    path("chatbot-page/", app_chatbot, name="chatbot_page"),
    path("journal-page/", journal, name="journal_page"),
    path("recovery-hub/", recovery_hub, name="recovery_hub"),
    path("calm-now/", calm_now, name="calm_now"),
    path("sleep-support/", sleep_support, name='sleep_support'),
    path("burnout-recovery/", burnout_recovery, name='burnout_recovery'),
    
    path("recovery-suggestions/", RecoverySuggestionView.as_view()),
    path("journal/update/", JournalView.as_view()),
    path("journal/delete/", JournalView.as_view()),
    path("journal/verify-password/", VerifyJournalPasswordView.as_view()),
    path("journal/vault-key/", VaultKeyAPI.as_view()),

    # Chat API
    path("chat/stt/", SpeechToTextView.as_view()),
    path("chat/tts/", TextToSpeechView.as_view()),  
    path("chat/session/", ChatSessionCreateView.as_view()),
    path("chat/message/", ChatMessageView.as_view()),
    path("chat/close/", ChatSessionCloseView.as_view()),
    path("chat/session/<int:session_id>/", ChatSessionDetailView.as_view()),
    path("chat/sessions/", ChatSessionListView.as_view()),
    path("chat/session/<int:session_id>/delete/", ChatSessionDeleteView.as_view()),
    path("chat/session/<int:session_id>/pin/", ChatSessionPinView.as_view()),
    path("live-alert/", LiveAlertView.as_view()),
    path("chat/initial/", ChatInitialMessageView.as_view()),
    path("chat/session-with-context/", ChatSessionWithContextView.as_view()),
    path("mood-trends/", MoodTrendView.as_view()),
    path("mood-events/", RawMoodEventsView.as_view()),

]