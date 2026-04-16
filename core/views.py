from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MoodEntry, JournalEntry, Assessment
from .serializers import MoodSerializer, JournalSerializer
from .encryption import encrypt, decrypt
from .assessment_engine import AssessmentEngine
from django.contrib.auth.decorators import login_required

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

        # --- Inject message into request for chatbot ---
        # request.POST = request.POST.copy()
        # request.POST["message"] = message
        message = request.data.get("message", "")
        # --- CORE ENGINE ---
        result = AssessmentEngine.evaluate(
            request,
            test_type,
            answers,
            message=message 
        )

        # --- SAVE ---
        Assessment.objects.create(
            user=request.user,
            assessment_type=test_type,
            score=result["score"],
            risk_level=result["risk_level"]
        )

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
