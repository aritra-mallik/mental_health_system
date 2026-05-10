from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MoodEntry, JournalEntry, Assessment,MentalSignal
from .serializers import MoodSerializer
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

MAX_MESSAGES = 8

def normalize_risk(risk):
    return {
        # WHO5 & WEMWBS Mappings
        "low_wellbeing": "high",   # Lower WHO-5 indicates higher risk
        "good_wellbeing": "low", 
        "wemwbs_low": "high",      # Low WEMWBS score
        "wemwbs_average": "moderate",
        "wemwbs_high": "low",

        # ISI
        "no_insomnia": "low",
        "subthreshold": "moderate",
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
        
        alert = generate_alert(
            global_state=state,
            trigger_context={
                "source": "assessment",
                "mood": derived_mood,
                "risk": normalized_risk
            }
        )

        request.session["Smera_alert"] = alert
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

            alert = generate_alert(
                global_state=state,
                trigger_context={
                    "source": "mood",
                    "mood": mood,
                    "risk": "low"
                }
            )

            request.session["Smera_alert"] = alert
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
            return Response({"error": "Entry not found"}, status=404)

        entry.encrypted_content = encrypted_content
        entry.save()

        MentalSignal.objects.filter(
            user=request.user,
            source="journal",
            source_id=entry.id
        ).delete()

        self.process_journal_signal(
            request=request,
            user=request.user,
            entry=entry,
            raw_text=raw_text
        )

        return Response({"message": "Journal updated successfully"})

    def delete(self, request):
        entry_id = request.data.get("id")

        try:
            entry = JournalEntry.objects.get(
                id=entry_id,
                user=request.user
            )
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=404)

        MentalSignal.objects.filter(
            user=request.user,
            source="journal",
            source_id=entry.id
        ).delete()

        time_lower = entry.created_at - timedelta(minutes=2)
        time_upper = entry.created_at + timedelta(minutes=2)

        MoodEntry.objects.filter(
            user=request.user,
            created_at__range=(time_lower, time_upper)
        ).delete()

        entry.delete()

        state = compute_state(request.user)

        alert = generate_alert(
            global_state=state,
            trigger_context={
                "source": "journal_delete",
                "mood": state.get("overall_mood"),
                "risk": state.get("overall_risk")
            }
        )

        request.session["Smera_alert"] = alert
        request.session.modified = True

        return Response({"message": "Journal deleted successfully"})

    def process_journal_signal(self, request, user, entry, raw_text):
        if not raw_text:
            return

        result = analyze_text(raw_text)

        mood = result["mood"]
        risk = "moderate" if mood in ["sad", "angry", "anxious"] else "low"

        MentalSignal.objects.create(
            user=user,
            source="journal",
            source_id=entry.id,
            mood=mood,
            risk=risk,
            metadata={"score": result["score"]}
        )

        exists_today = MoodEntry.objects.filter(
            user=user,
            mood=mood,
            created_at__date=timezone.now().date()
        ).exists()

        if not exists_today:
            MoodEntry.objects.create(user=user, mood=mood)

        state = compute_state(user)

        alert = generate_alert(
            global_state=state,
            trigger_context={
                "source": "journal",
                "mood": mood,
                "risk": risk
            }
        )

        request.session["Smera_alert"] = alert
        request.session["last_mood_context"] = {
            "mood": mood,
            "risk": risk,
            "source": "journal"
        }

        request.session.modified = True
        
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
        "wemwbs": 14,
    }

    ALL_TESTS = ["who5", "pss", "wemwbs", "isi"]

    def get(self, request):
        user = request.user
        today = timezone.now()

        history = Assessment.objects.filter(user=user)

        if not history.exists():
            return Response({
                "type": "first_time",
                "recommended": self.ALL_TESTS
            })

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

            if t not in latest:
                latest[t] = {
                    "score": a.score,
                    "risk": a.risk_level,
                    "date": a.created_at
                }

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
        return Response({"alert": alert if alert else None})
        
        
def app_dashboard(request): return render(request, "core/dashboard.html")
def journal(request): return render(request, "core/journal.html")
def app_assessment(request): return render(request, "core/assessment.html")


def trim_messages(session, max_messages=MAX_MESSAGES):
    messages = ChatMessage.objects.filter(
        session=session
    ).order_by("-created_at")

    if messages.count() > max_messages:
        extra_messages = messages[max_messages:]
        ids_to_delete = [m.id for m in extra_messages]
        ChatMessage.objects.filter(id__in=ids_to_delete).delete()


def get_context_messages(session):
    return ChatMessage.objects.filter(session=session).order_by("created_at")
        
class ChatSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mood_context = request.session.pop("last_mood_context", None)
        session = ChatSession.objects.create(
            user=request.user,
            initial_context=mood_context
        )
        return Response({"session_id": session.id})
        
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

        result = analyze_text(user_message)
        mood = result["mood"]
        score = result["score"]

        if mood in ["sad", "anxious", "angry"]:
            risk = "high" if score > 0.80 else "moderate"
        else:
            risk = "low"

        signal = MentalSignal.objects.filter(user=request.user, source="chat", source_id=session.id).first()
        
        if signal:
            signal.mood = mood
            signal.risk = risk
            signal.metadata["score"] = score
            signal.save()
        else:
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

        global_state = compute_state(request.user)
        
        alert = generate_alert(
            global_state=global_state,
            trigger_context={
                "source": "chat",
                "mood": signal.mood,
                "risk": signal.risk
            }
        )

        request.session["Smera_alert"] = alert
        request.session.modified = True

        ChatMessage.objects.create(
            session=session,
            role="user",
            content=user_message
        )

        messages = get_context_messages(session).only(
            "role",
            "content",
            "created_at"
        )

        from ChatBot.rules.safety import check_critical

        is_critical = check_critical(user_message)
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
        
        bot_reply = generate_response(prompt)

        ChatMessage.objects.create(
            session=session,
            role="bot",
            content=bot_reply
        )

        trim_messages(session)
        return Response({"reply": bot_reply})


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
            
            MentalSignal.objects.filter(
                user=request.user,
                source="chat",
                source_id=session.id
            ).delete()
            
            session.delete()
            return Response({"message": "Session and linked signals deleted"})
            
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
                    session.initial_context = None
                    session.save()

            except (ChatSession.DoesNotExist, ValueError):
                pass

        if not mood_context:
            return Response({"reply": None})

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
        return Response({"reply": reply})
        
class ChatSessionWithContextView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        context = request.data.get("context") 

        session = ChatSession.objects.create(
            user=request.user,
            initial_context=context
        )

        return Response({"session_id": session.id})

class MoodTrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_type = request.query_params.get("range", "7d")
        now = timezone.now()

        if range_type == "24h":
            start_time = now - timedelta(hours=24)
            bucket_hours = 2
        else:
            start_time = now - timedelta(days=7)
            bucket_hours = 12

        signals = MentalSignal.objects.filter(
            user=request.user,
            created_at__gte=start_time,
            created_at__lte=now
        ).order_by("created_at")

        if not signals.exists():
            return Response([])

        points = []
        current = start_time

        while current < now:
            bucket_end = current + timedelta(hours=bucket_hours)

            if bucket_end > now:
                bucket_end = now

            state = compute_state(
                request.user,
                reference_time=bucket_end
            )

            if state["overall_mood"] is not None:
                points.append({
                    "date": bucket_end.isoformat(),
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