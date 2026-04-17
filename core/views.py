from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MoodEntry, JournalEntry, Assessment
from .serializers import MoodSerializer, JournalSerializer
from .encryption import encrypt, decrypt
from .assessment_engine import AssessmentEngine
from django.contrib.auth.decorators import login_required
from .models import ChatSession, ChatMessage
from AI_MH.chatbot.llm_client import generate_response
from AI_MH.chatbot.prompt_builder import build_prompt
from AI_MH.ml.predict import predict_all
from AI_MH.features.sentiment import get_sentiment


MAX_MESSAGES = 8

class AssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        test_type = request.data.get("type")
        answers = request.data.get("answers")
        message = request.data.get("message", "")

        # --- VALIDATION ---
        if test_type not in ["phq9", "gad7"]:
            return Response({"error": "Invalid type"}, status=400)

        if not isinstance(answers, list):
            return Response({"error": "Answers must be a list"}, status=400)

        if test_type == "phq9" and len(answers) != 9:
            return Response({"error": "PHQ-9 requires 9 answers"}, status=400)

        if test_type == "gad7" and len(answers) != 7:
            return Response({"error": "GAD-7 requires 7 answers"}, status=400)

        # --- CORE ENGINE ---
        result = AssessmentEngine.evaluate(
            request,
            test_type,
            answers,
            message=message
        )

        # --- SAVE ASSESSMENT ---
        Assessment.objects.create(
            user=request.user,
            assessment_type=test_type,
            score=result["score"],
            risk_level=result["risk_level"]
        )

        # -------------------------
        # CHAT SESSION CREATION
        # -------------------------
        chat_session = None

        if message:  # only create session if user typed something
            chat_session = ChatSession.objects.create(user=request.user)

            # Save user message
            ChatMessage.objects.create(
                session=chat_session,
                role="user",
                content=message
            )

            # Save bot response (from ML pipeline)
            ChatMessage.objects.create(
                session=chat_session,
                role="bot",
                content=result["chat"]
            )

            # Trim to maintain sliding window
            trim_messages(chat_session)

        # --- RESPONSE ---
        return Response({
            "message": "Assessment completed",
            "data": result,
            "chat_session_id": chat_session.id if chat_session else None
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
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class JournalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = JournalEntry.objects.filter(user=request.user)

        data = []
        for e in entries:
            data.append({
                "id": e.id,
                "content": decrypt(e.encrypted_content),
                "created_at": e.created_at
            })

        return Response(data)

    def post(self, request):
        content = request.data.get("content")

        encrypted = encrypt(content)

        entry = JournalEntry.objects.create(
            user=request.user,
            encrypted_content=encrypted
        )

        return Response({"message": "Saved"})
    
class ExportDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        moods = list(MoodEntry.objects.filter(user=request.user).values())
        journals = list(JournalEntry.objects.filter(user=request.user).values())

        return Response({
            "moods": moods,
            "journals": journals,
        })
        
class AssessmentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = Assessment.objects.filter(user=request.user).values(
            "score", "created_at"
        )
        return Response(list(data))

  
def app_dashboard(request): return render(request, "core/dashboard.html")


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
        # 2. Trim (after user msg)
        # -------------------------
        trim_messages(session)

        # -------------------------
        # 3. Get context (max 8)
        # -------------------------
        messages = get_context_messages(session)

        # -------------------------
        # 4. Compute ML signals
        # -------------------------
        sentiment = get_sentiment(user_message)

        phq_score = request.session.get("phq_score")
        gad_score = request.session.get("gad_score")

        result = predict_all(
            sentiment,
            phq_score,
            gad_score,
            user_message
        )

        strategy = result["strategy"]

        # -------------------------
        # 5. Build prompt (IMPORTANT)
        # -------------------------
        prompt = build_prompt(
            messages,
            strategy,
            result.get("is_critical", False)
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
        trim_messages(session)

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