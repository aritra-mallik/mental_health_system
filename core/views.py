from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import  JournalEntry, Assessment, MentalSignal
import re
from datetime import timedelta
from zoneinfo import ZoneInfo
from django.utils import timezone
from collections import defaultdict
from .assessment_engine import AssessmentEngine
from .models import ChatSession, ChatMessage, UserVaultKey
from ChatBot.chatbot.llm_client import generate_response
from ChatBot.chatbot.prompt_builder import build_prompt
from .sentiment import analyze_text
from .aggregator import compute_state
from .alerts import generate_alert 
from groq import Groq
from django.conf import settings
from .tts import generate_voice_sync

client = Groq(api_key=settings.GROQ_API_KEY)

class RecoverySuggestionView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        # Fetch the user's live emotional state
        state = compute_state(request.user, days=0.5, mode="realtime")
        mood = state.get("overall_mood", "neutral")
        risk = state.get("overall_risk", "less")

        advice = "Take a moment for yourself today."
        suggestions = []
        advice_cards = []

        # 1. OVERWHELMED (Includes High Risk)
        if risk == "high" or mood == "overwhelmed":
            advice = "You are carrying a heavy load right now. Stop trying to process everything at once. Focus only on this exact physical moment to regulate your nervous system."
            suggestions = [
                {"title": "Immediate Calm", "desc": "Regulate your nervous system with 4-7-8 breathing.", "action_url": "/api/core/calm-now/", "type": "urgent", "icon": "🌬️", "color": "text-emerald-500", "bg": "bg-emerald-500/10", "border": "border-emerald-500/30"},
                {"title": "5-4-3-2-1 Grounding", "desc": "Bring your racing mind back to the physical room.", "action_url": "/api/core/calm-now/?mode=grounding", "type": "urgent", "icon": "🖐️", "color": "text-indigo-500", "bg": "bg-indigo-500/10", "border": "border-indigo-500/30"},
                {"title": "Burnout Protocol", "desc": "Give yourself permission to completely pause today.", "action_url": "/api/core/burnout-recovery/", "type": "routine", "icon": "🌱", "color": "text-teal-500", "bg": "bg-teal-500/10", "border": "border-teal-500/30"}
            ]
            advice_cards = [
                {"icon": "⛰️", "title": "Break It Down", "desc": "Stop looking at the entire mountain. Pick one single micro-task and ignore the rest entirely until you feel safe."},
                {"icon": "🛑", "title": "Sensory Disconnect", "desc": "Step into a dark, quiet room for just 5 minutes. Remove all visual and auditory input to lower your cortisol levels."},
                {"icon": "📝", "title": "Externalize the Chaos", "desc": "Get the swirling thoughts out of your head. Write them down without filtering to free up your cognitive load."}
            ]

        # 2. LOW
        elif mood == "low":
            advice = "Your energy is depleted. Don't force false positivity right now. Focus only on gentle, physical micro-activations to break the freeze response."
            suggestions = [
                {"title": "Micro-Activations", "desc": "Tiny, 1-minute steps to rebuild your energy.", "action_url": "/api/core/burnout-recovery/", "type": "routine", "icon": "🌱", "color": "text-emerald-500", "bg": "bg-emerald-500/10", "border": "border-emerald-500/30"},
                {"title": "Sensory Grounding", "desc": "Gently reconnect with your surroundings.", "action_url": "/api/core/calm-now/?mode=grounding", "type": "urgent", "icon": "🖐️", "color": "text-amber-500", "bg": "bg-amber-500/10", "border": "border-amber-500/30"},
                {"title": "Private Journal", "desc": "Reflect on what's draining your battery today.", "action_url": "/api/core/journal-page/", "type": "routine", "icon": "📔", "color": "text-purple-500", "bg": "bg-purple-500/10", "border": "border-purple-500/30"}
            ]
            advice_cards = [
                {"icon": "💧", "title": "Basic Needs Check", "desc": "Have you drank water? Have you eaten? Start with the absolute baseline of physical care before demanding productivity."},
                {"icon": "🛡️", "title": "Forgive Yourself", "desc": "Acknowledge that your battery is empty. Actively release the guilt of unproductivity for today."},
                {"icon": "🚶", "title": "Gentle Movement", "desc": "Do not force high-energy tasks. Try stretching or walking for just 2 minutes to break the physical freeze state."}
            ]

        # 3. STRESSED
        elif mood == "stressed":
            advice = "Tension is running high. Your body is treating psychological stress like a physical threat. Let's signal safety to your brain."
            suggestions = [
                {"title": "Brain Dump", "desc": "Empty your swirling thoughts into the secure vault.", "action_url": "/api/core/journal-page/", "type": "routine", "icon": "📔", "color": "text-purple-500", "bg": "bg-purple-500/10", "border": "border-purple-500/30"},
                {"title": "Deep Breathing", "desc": "Lower your heart rate in just 2 minutes.", "action_url": "/api/core/calm-now/", "type": "urgent", "icon": "🌬️", "color": "text-blue-500", "bg": "bg-blue-500/10", "border": "border-blue-500/30"},
                {"title": "Sleep Optimization", "desc": "Stress ruins sleep. Prepare your mind for tonight.", "action_url": "/api/core/sleep-support/", "type": "education", "icon": "🌙", "color": "text-slate-400", "bg": "bg-slate-500/10", "border": "border-slate-500/30"}
            ]
            advice_cards = [
                {"icon": "🎯", "title": "Name the Threat", "desc": "Your brain is perceiving a threat. Identify exactly what is causing the tension and write it down to isolate it."},
                {"icon": "🚪", "title": "Change the Scenery", "desc": "Move to a different room or step outside. A physical boundary change can actively disrupt the stress loop."},
                {"icon": "🌬️", "title": "Physiological Reset", "desc": "Take control of your body. Take three deep, slow breaths right now to force your heart rate to slow down."}
            ]

        # 4. NEUTRAL
        elif mood == "neutral":
            advice = "You are in a stable, steady place. This is the absolute best time to build mental resilience and strengthen your baseline routines before the waters get choppy."
            suggestions = [
                {"title": "Sleep Hygiene", "desc": "Lock in your deep rest protocol for tonight.", "action_url": "/api/core/sleep-support/", "type": "education", "icon": "🌙", "color": "text-blue-500", "bg": "bg-blue-500/10", "border": "border-blue-500/30"},
                {"title": "Reflective Journaling", "desc": "Document your thoughts while your mind is clear.", "action_url": "/api/core/journal-page/", "type": "routine", "icon": "📔", "color": "text-purple-500", "bg": "bg-purple-500/10", "border": "border-purple-500/30"},
                {"title": "Mindful Check-in", "desc": "Take a quick scan of your body and thoughts.", "action_url": "/api/core/assessment-page/", "type": "routine", "icon": "🧘", "color": "text-indigo-500", "bg": "bg-indigo-500/10", "border": "border-indigo-500/30"}
            ]
            advice_cards = [
                {"icon": "🧱", "title": "Build the Baseline", "desc": "Use your current steady energy to build habits and routines that will protect you when things inevitably get hard later."},
                {"icon": "🔍", "title": "Mindful Scan", "desc": "Take a 3-minute scan of your body. Notice where you might be holding tension in your jaw or shoulders, even if you don't feel actively stressed."},
                {"icon": "🌙", "title": "Prepare for Rest", "desc": "Use this stability to set up an excellent wind-down routine for deep, restorative sleep tonight."}
            ]

        # 5. GOOD / GREAT
        else: 
            advice = "You're feeling good! Capitalize on this positive momentum by documenting your wins, acknowledging your progress, and enjoying the moment."
            suggestions = [
                {"title": "Gratitude Vault", "desc": "Write down exactly what is working well today.", "action_url": "/api/core/journal-page/", "type": "routine", "icon": "📔", "color": "text-rose-500", "bg": "bg-rose-500/10", "border": "border-rose-500/30"},
                {"title": "Savor the Moment", "desc": "Use grounding to anchor this positive feeling.", "action_url": "/api/core/calm-now/?mode=grounding", "type": "routine", "icon": "☀️", "color": "text-amber-500", "bg": "bg-amber-500/10", "border": "border-amber-500/30"},
                {"title": "Sleep Maintenance", "desc": "Protect tomorrow's mood with good sleep tonight.", "action_url": "/api/core/sleep-support/", "type": "education", "icon": "🌙", "color": "text-blue-500", "bg": "bg-blue-500/10", "border": "border-blue-500/30"}
            ]
            advice_cards = [
                {"icon": "🙏", "title": "Express Gratitude", "desc": "Take 3 minutes to document what went right today. This actively builds neural pathways for long-term resilience."},
                {"icon": "🌊", "title": "Ride the Wave", "desc": "Notice how this good day feels in your physical body. Memorize this sensation so you can recall it on harder days."},
                {"icon": "🛡️", "title": "Protect the Baseline", "desc": "Don't skip your basic self-care routines just because you feel good today. Drink water, eat well, and protect your sleep."}
            ]

        return Response({
            "current_state": state,
            "advice": advice,
            "suggestions": suggestions,
            "advice_cards": advice_cards
        })

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
        
        # SAVE
        Assessment.objects.create(user=request.user, assessment_type=test_type, score=result["score"], risk_level=result["risk_level"], meta=result.get("meta", {}))
       
        MentalSignal.objects.create(
            user=request.user, source="assessment", mood=derived_mood, risk=normalized_risk,
            metadata={
                "test_type": test_type,
                "score": result["score"]
            }
        )
        state = compute_state(request.user, days=0.5, mode="realtime")

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
        
        # RESPONSE
        return Response({
            "message": "Assessment completed",
            "data": result
        })
        
class CurrentMoodView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        state = compute_state(request.user, days=0.5, mode="realtime")

        return Response({
            "mood": state.get("overall_mood"),
            "risk": state.get("overall_risk"),
            "score": state.get("score")
        })
        
class JournalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = JournalEntry.objects.filter(user=request.user).order_by('-is_pinned', '-created_at')

        return Response([
            {
                "id": e.id,
                "content": e.encrypted_content,
                "created_at": e.created_at,
                "is_pinned": e.is_pinned
            }
            for e in entries
        ])

    # CREATE JOURNAL
    def post(self, request):
        encrypted_content = request.data.get("content")
        raw_text = request.data.get("raw_text")

        entry = JournalEntry.objects.create(user=request.user, encrypted_content=encrypted_content)

        self.process_journal_signal(
            request=request,
            user=request.user,
            entry=entry,
            raw_text=raw_text,
            action="journal_create"
        )

        return Response({
            "message": "Journal saved",
            "id": entry.id
        }, status=201)

    # UPDATE JOURNAL
    def put(self, request):
        entry_id = request.data.get("id")
        encrypted_content = request.data.get("content")
        raw_text = request.data.get("raw_text")

        try:
            entry = JournalEntry.objects.get(id=entry_id,user=request.user)
            
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=404)

        # update encrypted content
        entry.encrypted_content = encrypted_content
        entry.save()

        self.process_journal_signal(
            request=request,
            user=request.user,
            entry=entry,
            raw_text=raw_text,
            action="journal_update"
        )

        return Response({"message": "Journal updated successfully"})

    # DELETE JOURNAL
    def delete(self, request):
        entry_id = request.data.get("id")

        try:
            entry = JournalEntry.objects.get(id=entry_id, user=request.user)
            
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=404)

        # delete linked mental signals
        MentalSignal.objects.filter(user=request.user, source="journal", source_id=entry.id).delete()

        # delete journal
        entry.delete()

        # refresh dashboard state
        state = compute_state(request.user, days=0.5, mode="realtime")

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

        return Response({"message": "Journal deleted successfully"})

    # SHARED SENTIMENT LOGIC
    def process_journal_signal(self, request, user, entry, raw_text, action="journal"):
        if not raw_text:
            return

        result = analyze_text(raw_text)
        mood = result["mood"]

        risk = (
            "moderate"
            if mood in ["low", "overwhelmed", "stressed"]
            else "less"
        )

        # FIX: Update the existing signal if it exists, preserving its original created_at time!
        MentalSignal.objects.update_or_create(
            user=user,
            source="journal",
            source_id=entry.id,
            defaults={
                "mood": mood,
                "risk": risk,
                "metadata": {
                    "score": result["score"]
                }
            }
        )

        # recompute dashboard state 
        state = compute_state(user, days=0.5, mode="realtime")

        # regenerate alert
        alert = generate_alert(
            global_state=state,
            trigger_context={
                "source": action,
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
        
class VaultKeyAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            vault = UserVaultKey.objects.get(user=request.user)
            return Response({
                "password_encrypted_key": vault.password_encrypted_key,
                "password_iv": vault.password_iv,
                "recovery_encrypted_key": vault.recovery_encrypted_key,
                "recovery_iv": vault.recovery_iv
            })
        except UserVaultKey.DoesNotExist:
            return Response({"error": "No vault key found"}, status=404)

    def post(self, request):
        vault, created = UserVaultKey.objects.update_or_create(
            user=request.user,
            defaults={
                # We use .get() so we can update just Safe A or both safes at once
                "password_encrypted_key": request.data.get("password_encrypted_key", ""),
                "password_iv": request.data.get("password_iv", ""),
                "recovery_encrypted_key": request.data.get("recovery_encrypted_key", ""),
                "recovery_iv": request.data.get("recovery_iv", "")
            }
        )
        return Response({"message": "Vault keys saved."})
              
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
        
        local_tz = ZoneInfo('Asia/Kolkata')
        
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
          
        
class ChatSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mood_context = request.session.pop("last_mood_context", None)

        session = ChatSession.objects.create(user=request.user, initial_context=mood_context)

        return Response({"session_id": session.id})
        
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
            session = ChatSession.objects.get(id=session_id, user=request.user, is_active=True)
            
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
        recent_qs = ChatMessage.objects.filter(session=session).only("role", "content", "created_at").order_by("-created_at")[:10]
        messages = list(reversed(recent_qs))


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
        # Explicitly define IST and force the current time into it
        ist_tz = ZoneInfo('Asia/Kolkata')
        local_now = timezone.now().astimezone(ist_tz)

        # Grab the user's very first check-in
        first_signal = MentalSignal.objects.filter(user=request.user).order_by("created_at").first()
        
        if not first_signal:
            return Response([])
            
        # Force the first signal into IST before snapping to midnight
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

def recovery_hub(request): return render(request, "core/recovery_hub.html")
def calm_now(request): return render(request, "core/calm_now.html")
def sleep_support(request): return render(request, "core/sleep_support.html")
def burnout_recovery(request): return render(request, "core/burnout_recovery.html")