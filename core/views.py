from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import  JournalEntry, Assessment, MentalSignal
import re, pytz
from datetime import timedelta
from django.utils import timezone
from collections import defaultdict
from .assessment_engine import AssessmentEngine
from .models import ChatSession, ChatMessage
from ChatBot.chatbot.llm_client import generate_response
from ChatBot.chatbot.prompt_builder import build_prompt
from .sentiment import analyze_text
from .aggregator import compute_state
from .alerts import generate_alert 
from groq import Groq
from django.conf import settings
from .tts import generate_voice_sync

client = Groq(api_key=settings.GROQ_API_KEY)

class SpeechToTextView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        audio = request.FILES.get("audio")

        if not audio:
            return Response({"error": "No audio uploaded"}, status=400)

        try:
            transcription = client.audio.transcriptions.create(file=(audio.name, audio.read()), model="whisper-large-v3")

            return Response({"text": transcription.text})

        except Exception as e:

            return Response({"error": str(e)}, status=500)
        
class TextToSpeechView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get("text")
        if not text:
            return Response({"error": "No text provided"}, status=400)

        try:
            # Generate the audio file using the sync wrapper
            audio_url = generate_voice_sync(text)
            
            # Returns the path, e.g., "/media/tts/1234-abcd.mp3"
            return Response({"audio_url": audio_url})
        
        except Exception as e:
            return Response({"error": str(e)}, status=500)
            
            

MAX_MESSAGES = 8
def normalize_risk(risk):
    return {
        # WHO5 & WEMWBS
        "low_wellbeing": "moderate", 
        "average_wellbeing": "less",
        "good_wellbeing": "less",
        "high_wellbeing": "less",

        # ISI
        "no_insomnia": "less",
        "subthreshold": "moderate",
        
        # General overrides
        "normal": "less",
        "mild": "moderate",
        "moderate": "moderate",
        "severe": "high",
    }.get(risk, risk)
    
class AssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    VALID_TESTS = ["who5", "pss", "wemwbs", "isi"]

    EXPECTED_LENGTH = {
        "who5": 5,
        "pss": 10,
        "wemwbs": 14,
        "isi": 7,
    }

    def post(self, request):
        test_type = request.data.get("type")
        answers = request.data.get("answers")

        # -------------------------
        # VALIDATION
        # -------------------------
        if test_type not in self.VALID_TESTS:
            return Response({"error": "Invalid assessment type"}, status=400)

        if not isinstance(answers, list):
            return Response({"error": "Answers must be a list"}, status=400)

        if len(answers) != self.EXPECTED_LENGTH[test_type]:
            return Response({"error": "Invalid number of answers"}, status=400)
        
        if not all(isinstance(a, int) for a in answers):
            return Response({"error": "Answers must be integers"}, status=400)

        # -------------------------
        # ENGINE
        # -------------------------
        result = AssessmentEngine.evaluate(test_type, answers)
        #new_alert = result.get("alert")
        
        request.session.modified = True
        
        raw_risk = result["risk_level"]

        direct_mood_mapping = {
            # Positive framing (WHO-5, WEMWBS)
            "high_wellbeing": "great",
            "good_wellbeing": "good",
            "average_wellbeing": "neutral",
            "low_wellbeing": "low",
            
            # Negative framing (ISI)
            "no_insomnia": "neutral",
            "subthreshold": "stressed",
            "severe": "overwhelmed",
            
            # Negative framing (PSS & Fallbacks)
            "less": "neutral",
            "moderate": "stressed",
            "high": "overwhelmed"
        }

        derived_mood = direct_mood_mapping.get(raw_risk, "neutral")
        normalized_risk = normalize_risk(raw_risk) # We keep this for the alert generator!
        # MoodEntry.objects.create(
        #     user=request.user,
        #     mood=derived_mood
        # )

        # -------------------------
        # SAVE
        # -------------------------
        Assessment.objects.create(
            user=request.user,
            assessment_type=test_type,
            score=result["score"],
            risk_level=result["risk_level"],
            meta=result.get("meta", {})
        )
        MentalSignal.objects.create(
            user=request.user,
            source="assessment",
            mood=derived_mood,
            risk=normalized_risk,
            metadata={
                "test_type": test_type,
                "score": result["score"]
            }
        )
        state = compute_state(
            request.user,
            days=0.5,
            mode="realtime"
        )
                
        
        

        alert = generate_alert(
            global_state=state,
            trigger_context={
                "source": "assessment",
                "mood": derived_mood,
                "risk": normalized_risk
            }
        )

        request.user.latest_smera_alert = alert
        request.user.save()
        # -------------------------
        # RESPONSE
        # -------------------------
        return Response({
            "message": "Assessment completed",
            "data": result
        })
        
class CurrentMoodView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        state = compute_state(
            request.user,
            days=0.5,
            mode="realtime"
        )

        return Response({
            "mood": state.get("overall_mood"),
            "risk": state.get("overall_risk"),
            "score": state.get("score")
        })
        
class JournalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = JournalEntry.objects.filter(
            user=request.user
        ).order_by('-is_pinned', '-created_at')

        return Response([
            {
                "id": e.id,
                "content": e.encrypted_content,
                "created_at": e.created_at,
                "is_pinned": e.is_pinned
            }
            for e in entries
        ])

    # =========================
    # CREATE JOURNAL
    # =========================
    def post(self, request):

        encrypted_content = request.data.get("content")
        raw_text = request.data.get("raw_text")

        entry = JournalEntry.objects.create(
            user=request.user,
            encrypted_content=encrypted_content
        )

        self.process_journal_signal(
            request=request,
            user=request.user,
            entry=entry,
            raw_text=raw_text
        )

        return Response({
            "message": "Journal saved",
            "id": entry.id
        })

    # =========================
    # UPDATE JOURNAL
    # =========================
    def put(self, request):

        entry_id = request.data.get("id")
        encrypted_content = request.data.get("content")
        raw_text = request.data.get("raw_text")

        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                user=request.user
            )

        except JournalEntry.DoesNotExist:
            return Response({
                "error": "Entry not found"
            }, status=404)

        # update encrypted content
        entry.encrypted_content = encrypted_content
        entry.save()

        # DELETE OLD SIGNALS
        MentalSignal.objects.filter(
            user=request.user,
            source="journal",
            source_id=entry.id
        ).delete()

        # recreate fresh signal
        self.process_journal_signal(
            request=request,
            user=request.user,
            entry=entry,
            raw_text=raw_text
        )

        return Response({
            "message": "Journal updated successfully"
        })

    # =========================
    # DELETE JOURNAL
    # =========================
    def delete(self, request):

        entry_id = request.data.get("id")

        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                user=request.user
            )

        except JournalEntry.DoesNotExist:
            return Response({
                "error": "Entry not found"
            }, status=404)

        # delete linked mental signals
        MentalSignal.objects.filter(
            user=request.user,
            source="journal",
            source_id=entry.id
        ).delete()

        # delete journal
        entry.delete()

        # refresh dashboard state
        state = compute_state(
            request.user,
            days=0.5,
            mode="realtime"
        )

        alert = generate_alert(
            global_state=state,
            trigger_context={
                "source": "journal_delete",
                "mood": state.get("overall_mood"),
                "risk": state.get("overall_risk")
            }
        )

        request.user.latest_smera_alert = alert
        request.user.save()

        return Response({
            "message": "Journal deleted successfully"
        })

    # =========================
    # SHARED SENTIMENT LOGIC
    # =========================
    def process_journal_signal(self, request, user, entry, raw_text):

        if not raw_text:
            return

        result = analyze_text(raw_text)

        mood = result["mood"]

        risk = (
            "moderate"
            if mood in ["low", "overwhelmed", "stressed"]
            else "less"
        )

        # create mental signal
        MentalSignal.objects.create(
            user=user,
            source="journal",
            source_id=entry.id,
            mood=mood,
            risk=risk,
            metadata={
                "score": result["score"]
            }
        )

        # recompute dashboard state
        state = compute_state(user)

        # regenerate alert
        alert = generate_alert(
            global_state=state,
            trigger_context={
                "source": "journal",
                "mood": mood,
                "risk": risk
            }
        )

        request.user.latest_smera_alert = alert
        request.user.save()
        
class JournalPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, entry_id):
        try:
            entry = JournalEntry.objects.get(id=entry_id, user=request.user)
            entry.is_pinned = not entry.is_pinned
            entry.save()
            return Response({"message": "Pin toggled", "is_pinned": entry.is_pinned})
        except JournalEntry.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        

class VerifyJournalPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get("password")

        if not password:
            return Response({
                "valid": False,
                "message": "Password required"
            }, status=400)

        if request.user.check_password(password):
            return Response({
                "valid": True
            })

        return Response({
            "valid": False,
            "message": "Incorrect password"
        })
        
    
class ExportDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        moods = list(
            MentalSignal.objects.filter(
                user=request.user,
                source="mood"
            ).values()
        )
        journals = list(JournalEntry.objects.filter(user=request.user).values())

        return Response({
            "moods": moods,
            "journals": journals,
        })
        
class AssessmentRecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    TEST_FREQUENCY = {
        "who5": 1,
        "pss": 7,
        "isi": 7,
        "wemwbs": 14,
    }

    ALL_TESTS = ["who5", "pss", "wemwbs", "isi"]

    def get(self, request):
        user = request.user
        
        # Set the local timezone
        local_tz = pytz.timezone('Asia/Kolkata')
        
        # Get the current date strictly in the local timezone
        local_today_date = timezone.now().astimezone(local_tz).date()

        history = Assessment.objects.filter(user=user)

        #  FIRST TIME USER
        if not history.exists():
            return Response({
                "type": "first_time",
                "recommended": self.ALL_TESTS
            })

        #  SMART REMINDER LOGIC
        recommendations = []

        for test, days in self.TEST_FREQUENCY.items():
            last = Assessment.objects.filter(
                user=user,
                assessment_type=test
            ).order_by("-created_at").first()

            if not last:
                recommendations.append(test)
                continue

            # Convert the last taken timestamp to the local timezone, then extract the date
            local_last_date = last.created_at.astimezone(local_tz).date()

            # Calculate the gap based on calendar days, not 24-hour clock cycles
            gap = (local_today_date - local_last_date).days

            if gap >= days:
                recommendations.append(test)

        return Response({
            "type": "reminder",
            "recommended": recommendations
        })
        
        
class AssessmentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        data = Assessment.objects.filter(user=user)

        latest = {}
        trends = defaultdict(list)

        for a in data:
            t = a.assessment_type

            # latest
            if t not in latest:
                latest[t] = {
                    "score": a.score,
                    "risk": a.risk_level,
                    "date": a.created_at
                }

            # trends
            trends[t].append({
                "score": a.score,
                "date": a.created_at
            })

        return Response({
            "latest": latest,
            "trends": trends
        })
        
        
class AssessmentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = Assessment.objects.filter(user=request.user).order_by("created_at").values("score", "created_at", "assessment_type")

        return Response(list(data))
    

class LiveAlertView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if user.latest_smera_alert:
            return Response({"alert": user.latest_smera_alert})

        state = compute_state(user, days=0.5, mode="realtime")
        alert = generate_alert(global_state=state)

        user.latest_smera_alert = alert
        user.save()

        return Response({
            "alert": alert
        })
          
def trim_messages(session, max_messages=MAX_MESSAGES):

    messages = ChatMessage.objects.filter(
        session=session
    ).order_by("-created_at")

    if messages.count() > max_messages:

        extra_messages = messages[max_messages:]

        ids_to_delete = [
            m.id for m in extra_messages
        ]

        ChatMessage.objects.filter(
            id__in=ids_to_delete
        ).delete()


def get_context_messages(session):
    return ChatMessage.objects.filter(session=session)\
        .order_by("created_at")
        
class ChatSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mood_context = request.session.pop("last_mood_context", None)

        session = ChatSession.objects.create(
            user=request.user,
            initial_context=mood_context
        )

        return Response({
            "session_id": session.id
        })
        
CONSULTATION_PATTERNS = [
    r"\btherapist\b",
    r"\bpsychiatrist\b",
    r"\bpsychologist\b",
    r"\bprofessional help\b",
    r"\bclinical care\b",
    r"\bconsultation\b",
    r"\bbook.*session\b",
    r"\btalk to someone professionally\b",
]

def wants_consultation(text):
    text = text.lower()

    return any(
        re.search(pattern, text)
        for pattern in CONSULTATION_PATTERNS
    )    
      
class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        user_message = request.data.get("message")
        if not session_id or not user_message:
            return Response({"error": "Missing data"}, status=400)       

        try:
            session = ChatSession.objects.get(
                id=session_id,
                user=request.user,
                is_active=True
            )
        except ChatSession.DoesNotExist:
            return Response({"error": "Invalid session"}, status=404)

        # --- transformer emotion analysis ---
        result = analyze_text(user_message)
        mood = result["mood"]
        score = result["score"]

        # Risk derivation based on the current message's mood
        if mood in ["low", "stressed", "overwhelmed"]:
            risk = "high" if score > 0.80 else "moderate"
        else:
            risk = "less"

        # Find if there is already a signal for this active chat session
        signal = MentalSignal.objects.filter(user=request.user, source="chat", source_id=session.id).first()
        
        if signal:
            # Update the existing signal with the latest mood directly
            signal.mood = mood
            signal.risk = risk
            signal.metadata["score"] = score
            signal.save()
            
        else:
            # Create a new signal for this session
            signal = MentalSignal.objects.create(
                user=request.user,
                source="chat",
                source_id=session.id,
                mood=mood,
                risk=risk,
                metadata={
                    "score": score,
                    "source_model": "distilroberta-emotion"
                }
            )

        global_state = compute_state(
            request.user,
            days=0.5,
            mode="realtime"
        )
        
        alert = generate_alert(
            global_state=global_state,
            trigger_context={
                "source": "chat",
                "mood": signal.mood,
                "risk": signal.risk
            }
        )

        request.user.latest_smera_alert = alert
        request.user.save()

        # -------------------------
        # 1. Save user message
        # -------------------------
        ChatMessage.objects.create(session=session, role="user", content=user_message)
        
        # -------------------------
        # 3. Get context (max 8)
        # -------------------------
        messages = get_context_messages(session).only("role", "content", "created_at")


        from ChatBot.rules.safety import check_critical

        # --- Safety detection ---
        is_critical = check_critical(user_message)

        # --- Strategy (minimal) ---
        recovery_phrases = [
            "i feel good now",
            "i feel better",
            "doing better",
            "things are improving",
            "it helped",
            "i'm okay now",
        ]

        is_recovering = any(
            phrase in user_message.lower()
            for phrase in recovery_phrases
        )

        if is_recovering:
            strategy = "SUPPORT"
            is_critical = False

        else:
            strategy = "CRITICAL" if is_critical else "SUPPORT"

        should_suggest_consultation = False
        if global_state and global_state.get("overall_risk") == "high":
            should_suggest_consultation = True

        prompt = build_prompt(
            messages,
            strategy,
            is_critical=is_critical,
            state=global_state,
            suggest_consultation=should_suggest_consultation
        )
        
        bot_reply = ""
        action_card = None # Initialize empty action card

        if wants_consultation(user_message):
            bot_reply = "I think speaking with a professional could genuinely help here."
            # JSON instead of HTML:
            action_card = {
                "type": "consultation",
                "title": "Explore Clinical Care",
                "url": "/api/consultation/"
            }

        else:
            bot_reply = generate_response(prompt)

            if is_critical:
                # JSON instead of HTML:
                action_card = {
                    "type": "critical_support",
                    "title": "Immediate Support",
                    "description": "If you would prefer to speak with a professional directly, you can explore available consultation services.",
                    "helplines": [
                        {"name": "Kiran Helpline", "phone": "1800-599-0019"},
                        {"name": "AASRA", "phone": "+91-9820466726"},
                        {"name": "iCALL", "phone": "+91-9152987821"}
                    ],
                    "consultation_url": "/api/consultation/"
                }

        # Save to database
        ChatMessage.objects.create(session=session, role="bot", content=bot_reply)

        # Return strictly typed JSON
        return Response({
            "reply": bot_reply,
            "action_card": action_card
        })


class ChatSessionCloseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")

        try:
            session = ChatSession.objects.get(
                id=session_id,
                user=request.user
            )
            session.is_active = False
            session.save()
            MentalSignal.objects.filter(
                user=request.user,
                source="chat",
                source_id=session.id
            ).delete()

            state = compute_state(
                request.user,
                days=0.5,
                mode="realtime"
            )

            alert = generate_alert(
                global_state=state,
                trigger_context={
                    "source": "chat_close",
                    "mood": state.get("overall_mood"),
                    "risk": state.get("overall_risk")
                }
            )

            request.user.latest_smera_alert = alert
            request.user.save()

            return Response({
                "message": "Session closed"
            })
        except ChatSession.DoesNotExist:
            return Response({"error": "Invalid session"}, status=404)
        
class ChatSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ChatSession.objects.get(
                id=session_id,
                user=request.user
            )
        except ChatSession.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        messages = session.messages.order_by("created_at")

        return Response([
            {
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at
            }
            for m in messages
        ])
        
class ChatSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ChatSession.objects.filter(user=request.user).order_by("-is_pinned", "-created_at")

        data = []
        for s in sessions:
            first_msg = s.messages.filter(role="user").first()
            data.append({
                "id": s.id,
                "title": first_msg.content[:40] if first_msg else "New Chat",
                "created_at": s.created_at,
                "is_pinned": s.is_pinned
            })
        return Response(data)

class ChatSessionPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
            session.is_pinned = not session.is_pinned
            session.save()
            return Response({"message": "Pin toggled", "is_pinned": session.is_pinned})
        except ChatSession.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        
        
class ChatSessionDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id):
        try:
            session = ChatSession.objects.get(
                id=session_id,
                user=request.user
            )
            
            # 1. Explicitly delete the linked MentalSignal first
            MentalSignal.objects.filter(
                user=request.user,
                source="chat",
                source_id=session.id
            ).delete()
            
            # 2. Then delete the session
            session.delete()

            state = compute_state(
                request.user,
                days=0.5,
                mode="realtime"
            )

            alert = generate_alert(
                global_state=state,
                trigger_context={
                    "source": "chat_delete",
                    "mood": state.get("overall_mood"),
                    "risk": state.get("overall_risk")
                }
            )

            request.user.latest_smera_alert = alert
            request.user.save()

            return Response({
                "message": "Session and linked signals deleted"
            })
            
        except ChatSession.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

class ChatInitialMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        session_id = request.query_params.get("session_id")

        mood_context = None

        if session_id and session_id != "null":
            try:
                session = ChatSession.objects.get(
                    id=int(session_id),
                    user=request.user
                )
                mood_context = session.initial_context

                if mood_context:
                    # consume ONLY if valid
                    session.initial_context = None
                    session.save()

            except (ChatSession.DoesNotExist, ValueError):
                pass

        # CRITICAL FIX
        if not mood_context:
            return Response({
                "reply": None 
            })

        initial_input = [{
            "role": "user",
            "content": f"I just completed a mental health assessment. Mood: {mood_context.get('overall_mood')}, Risk: {mood_context.get('overall_risk')}."
        }]

        prompt = build_prompt(
            initial_input,
            "SUPPORT",
            is_critical=False,
            state=mood_context,
            suggest_consultation=False
        )

        reply = generate_response(prompt)

        return Response({
            "reply": reply
        })
        
class ChatSessionWithContextView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        context = request.data.get("context")  # mood data

        session = ChatSession.objects.create(
            user=request.user,
            initial_context=context
        )

        return Response({
            "session_id": session.id
        })

class MoodTrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Explicitly define IST and force the current time into it
        ist_tz = pytz.timezone('Asia/Kolkata')
        local_now = timezone.now().astimezone(ist_tz)

        # Grab the user's very first check-in
        first_signal = MentalSignal.objects.filter(user=request.user).order_by("created_at").first()
        
        if not first_signal:
            return Response([])
            
        # 2. Force the first signal into IST before snapping to midnight
        first_signal_local = first_signal.created_at.astimezone(ist_tz)
        start_time = first_signal_local.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Always use 24-hour buckets for daily averages
        bucket_hours = 24

        signals = MentalSignal.objects.filter(
            user=request.user,
            created_at__gte=start_time,
            created_at__lte=local_now
        ).order_by("created_at")

        if not signals.exists():
            return Response([])

        points = []
        current = start_time

        while current < local_now:
            bucket_end = current + timedelta(hours=bucket_hours)
            
            if bucket_end > local_now:
                bucket_end = local_now

            exact_bucket_days = (bucket_end - current).total_seconds() / 86400.0

            state = compute_state(
                request.user,
                reference_time=bucket_end,
                days=exact_bucket_days, 
                mode="historical"
            )

            if state["overall_mood"] is not None:
                points.append({
                    "date": current.strftime('%Y-%m-%d'), 
                    "score": state["score"],
                    "mood": state["overall_mood"],
                    "risk": state["overall_risk"]
                })

            current = bucket_end

        return Response(points)
    
class RawMoodEventsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        range_type = request.query_params.get("range", "24h")

        now = timezone.now()

        if range_type == "24h":
            start_time = now - timedelta(hours=24)

        else:
            start_time = now - timedelta(days=7)

        signals = MentalSignal.objects.filter(
            user=request.user,
            created_at__gte=start_time,
            created_at__lte=now
        ).order_by("created_at")

        return Response([
            {
                "id": s.id,
                "source": s.source,
                "mood": s.mood,
                "risk": s.risk,
                "created_at": s.created_at
            }
            for s in signals
        ])
        
def app_dashboard(request): return render(request, "core/dashboard.html")
def journal(request): return render(request, "core/journal.html")
def app_assessment(request): return render(request, "core/assessment.html")       
def app_chatbot(request): return render(request, "core/chatbot.html")