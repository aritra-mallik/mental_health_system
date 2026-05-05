from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MoodEntry, JournalEntry, Assessment,MentalSignal
from .serializers import MoodSerializer, JournalSerializer
from datetime import timedelta
from django.utils import timezone
from collections import defaultdict
from .assessment_engine import AssessmentEngine
from django.contrib.auth.decorators import login_required
from .models import ChatSession, ChatMessage
from ChatBot.chatbot.llm_client import generate_response
from ChatBot.chatbot.prompt_builder import build_prompt
from .sentiment import analyze_text
from .aggregator import compute_state

MAX_MESSAGES = 8
def normalize_risk(risk):
    return {
        # WHO5
        "low_wellbeing": "moderate",
        "good_wellbeing": "low",

        # ISI
        "no_insomnia": "low",
        "subthreshold": "moderate",

        # DASS21
        "normal": "low",
        "mild": "moderate",
        "moderate": "moderate",
        "severe": "high",
        "extremely_severe": "high",
    }.get(risk, risk)
    
class AssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    VALID_TESTS = ["who5", "pss", "dass21", "isi", "burnout"]

    EXPECTED_LENGTH = {
        "who5": 5,
        "pss": 10,
        "dass21": 21,
        "isi": 7,
        "burnout": 10,
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
        new_alert = result.get("alert")



        request.session.modified = True
        risk_to_mood = {
            "low": "neutral",
            "moderate": "anxious",
            "high": "sad"
        }

        normalized_risk = normalize_risk(result["risk_level"])

        derived_mood = risk_to_mood.get(normalized_risk, "neutral")
        MoodEntry.objects.create(
            user=request.user,
            mood=derived_mood
        )

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
        state = compute_state(request.user)
        
        
        

        request.session["Smera_alert"] = {
            "level": state["overall_risk"],
            "mood": state["overall_mood"],
            "score": state["score"]
        }
        request.session["last_mood_context"] = {
            "mood": derived_mood,
            "risk": normalized_risk,
            "source": "assessment"
        }
        request.session.modified = True
        # -------------------------
        # RESPONSE
        # -------------------------
        return Response({
            "message": "Assessment completed",
            "data": result
        })


class MoodView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        moods = MoodEntry.objects.filter(user=request.user)
        return Response(MoodSerializer(moods, many=True).data)

    def post(self, request):
        serializer = MoodSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            mood = serializer.validated_data["mood"]
            MentalSignal.objects.create(
                user=request.user,
                source="mood",
                mood=mood,
                risk="low",
                metadata={}
            )


            state = compute_state(request.user)

            request.session["Smera_alert"] = {
                "level": state["overall_risk"],
                "mood": state["overall_mood"],
                "score": state["score"]
            }
            request.session["last_mood_context"] = {
                "mood": mood,
                "risk": "low",
                "source": "mood"
            }
            request.session.modified = True
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class JournalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = JournalEntry.objects.filter(user=request.user)

        return Response([
            {
                "id": e.id,
                "content": e.encrypted_content,
                "created_at": e.created_at
            }
            for e in entries
        ])

    

    def post(self, request):
        encrypted_content = request.data.get("content")
        raw_text = request.data.get("raw_text")  # <-- NEW

        entry = JournalEntry.objects.create(
            user=request.user,
            encrypted_content=encrypted_content
        )

        # --- sentiment ---
        if raw_text:
            result = analyze_text(raw_text)

            mood = result["mood"]
            
            MentalSignal.objects.create(
                user=request.user,
                source="journal",
                mood=mood,
                risk="moderate" if mood in ["sad", "angry", "anxious"] else "low",
                metadata={
                    "score": result["score"]
                }
            )

            # 1. Save derived mood
            MoodEntry.objects.create(
                user=request.user,
                mood=mood
            )

        

            # 3. Override Smera alert
            state = compute_state(request.user)

            request.session["Smera_alert"] = {
                "level": state["overall_risk"],
                "mood": state["overall_mood"],
                "score": state["score"]
            }
            request.session.modified = True
            request.session["last_mood_context"] = {
                "mood": mood,
                "risk": "moderate" if mood in ["sad", "angry", "anxious"] else "low",
                "source": "journal"
            }
            request.session.modified = True

        return Response({"message": "Saved"})

    def put(self, request):
        entry_id = request.data.get("id")
        content = request.data.get("content")

        try:
            entry = JournalEntry.objects.get(id=entry_id, user=request.user)
            entry.encrypted_content = content
            entry.save()
            return Response({"message": "Updated"})
        except JournalEntry.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

    def delete(self, request):
        entry_id = request.data.get("id")

        try:
            entry = JournalEntry.objects.get(id=entry_id, user=request.user)
            
            # FIX: Find and delete the MoodEntry created at roughly the exact same time (+/- 2 minutes)
            time_lower = entry.created_at - timedelta(minutes=2)
            time_upper = entry.created_at + timedelta(minutes=2)
            
            MoodEntry.objects.filter(
                user=request.user,
                created_at__range=(time_lower, time_upper)
            ).delete()

            # Delete the actual journal entry
            entry.delete()
            return Response({"message": "Deleted journal and associated mood"})
            
        except JournalEntry.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        
    
class ExportDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        moods = list(MoodEntry.objects.filter(user=request.user).values())
        journals = list(JournalEntry.objects.filter(user=request.user).values())

        return Response({
            "moods": moods,
            "journals": journals,
        })
        
class AssessmentRecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    TEST_FREQUENCY = {
        "who5": 7,
        "pss": 7,
        "isi": 7,
        "dass21": 14,
        "burnout": 30,
    }

    ALL_TESTS = ["who5", "pss", "dass21", "isi", "burnout"]

    def get(self, request):
        user = request.user
        today = timezone.now()

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

            gap = (today - last.created_at).days

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
        alert = request.session.get("Smera_alert")

        return Response({
            "alert": alert if alert else None
        })
        
        
def app_dashboard(request): return render(request, "core/dashboard.html")
def journal(request): return render(request, "core/journal.html")
def app_assessment(request): return render(request, "core/assessment.html")

def trim_messages(session, max_messages=MAX_MESSAGES):
    messages = ChatMessage.objects.filter(session=session)\
        .order_by("-created_at")

    if messages.count() > max_messages:
        to_delete = messages[max_messages:]
        to_delete.delete()


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
        
class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        user_message = request.data.get("message")
        if not session_id or not user_message:
            return Response({"error": "Missing data"}, status=400)       


        text_lower = user_message.lower()

        if any(x in text_lower for x in ["sad", "tired", "down"]):
            mood = "sad"
            risk = "moderate"
        elif any(x in text_lower for x in ["anxious", "stress", "overwhelmed"]):
            mood = "anxious"
            risk = "moderate"
        elif any(x in text_lower for x in ["angry", "frustrated"]):
            mood = "angry"
            risk = "moderate"
        else:
            mood = "neutral"
            risk = "low"

        MentalSignal.objects.create(
            user=request.user,
            source="chat",
            mood=mood,
            risk=risk,
            metadata={}
        )
        state = None 
        try:
            session = ChatSession.objects.get(
                id=session_id,
                user=request.user,
                is_active=True
            )
        except ChatSession.DoesNotExist:
            return Response({"error": "Invalid session"}, status=404)

        # -------------------------
        # 1. Save user message
        # -------------------------
        ChatMessage.objects.create(
            session=session,
            role="user",
            content=user_message
        )



        # -------------------------
        # 3. Get context (max 8)
        # -------------------------
        messages = get_context_messages(session)

        from ChatBot.rules.safety import check_critical

        # --- Safety detection ---
        is_critical = check_critical(user_message)

        # --- Strategy (minimal) ---
        strategy = "CRITICAL" if is_critical else "SUPPORT"

        # -------------------------
        # 5. Build prompt (IMPORTANT)
        # -------------------------
        
        should_suggest_consultation = False

        if state and state.get("overall_risk") == "high":
            should_suggest_consultation = True

        elif False:
            pass

        prompt = build_prompt(
            messages,
            strategy,
            is_critical=is_critical,
            state=state,
            suggest_consultation=should_suggest_consultation
        )
        # -------------------------
        # 6. Generate response
        # -------------------------
        bot_reply = generate_response(prompt)

        # -------------------------
        # 7. Save bot reply
        # -------------------------
        ChatMessage.objects.create(
            session=session,
            role="bot",
            content=bot_reply
        )

        # -------------------------
        # 8. Trim again
        # -------------------------
      

        return Response({
            "reply": bot_reply
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

            return Response({"message": "Session closed"})
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
            session.delete()
            return Response({"message": "Deleted"})
        except ChatSession.DoesNotExist:
            return Response({"error": "Not found"}, status=404)    
def app_chatbot(request):
    return render(request, "core/chatbot.html")

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

        # ✅ CRITICAL FIX
        if not mood_context:
            return Response({
                "reply": None   # ⛔ DO NOT CALL LLM
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