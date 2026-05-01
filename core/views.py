from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MoodEntry, JournalEntry, Assessment
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

        if new_alert is not None:
            request.session["lumi_alert"] = new_alert

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

            alert = AssessmentEngine.generate_alert(
                source="mood",
                mood=mood
            )

            request.session["lumi_alert"] = alert
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

            MoodEntry.objects.create(
                user=request.user,
                mood=result["mood"]
            )

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

    WEEK_PLAN = {
        1: ["who5", "isi"],
        2: ["pss", "dass21"],
        3: ["who5", "isi"],
        4: ["burnout"],
    }

    def get(self, request):
        user = request.user

        today = timezone.now()
        week_of_month = (today.day - 1) // 7 + 1

        recommended = self.WEEK_PLAN.get(week_of_month, ["who5"])

        # --- filter already taken recently ---
        recent_limit = {
            "who5": 7,
            "pss": 7,
            "isi": 7,
            "dass21": 14,
            "burnout": 30,
        }

        final = []

        for test in recommended:
            days = recent_limit[test]

            recent = Assessment.objects.filter(
                user=user,
                assessment_type=test,
                created_at__gte=today - timedelta(days=days)
            ).exists()

            if not recent:
                final.append(test)

        return Response({
            "recommended": final if final else ["who5"]
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
    


  
def app_dashboard(request):
    alert = request.session.get("lumi_alert")

    return render(request, "core/dashboard.html", {
        "alert": alert
    })
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
        session = ChatSession.objects.create(user=request.user)

        return Response({
            "session_id": session.id
        })
        
class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        user_message = request.data.get("message")
        alert = AssessmentEngine.generate_alert(
            source="chat",
            text=user_message
        )

        request.session["lumi_alert"] = alert
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
        prompt = build_prompt(messages, strategy, is_critical=is_critical)

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
        sessions = ChatSession.objects.filter(user=request.user)\
            .order_by("-created_at")

        data = []
        for s in sessions:
            first_msg = s.messages.filter(role="user").first()

            data.append({
                "id": s.id,
                "title": first_msg.content[:40] if first_msg else "New Chat",
                "created_at": s.created_at
            })

        return Response(data)
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

