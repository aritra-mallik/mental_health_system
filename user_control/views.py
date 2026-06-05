from zoneinfo import ZoneInfo
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import ProfileViewSerializer, ProfileUpdateSerializer, ConsentSerializer
from django.shortcuts import render
from core.models import JournalEntry, Assessment, ChatSession, MentalSignal
from consultation.models import Booking
from accounts.models import OTP
from core.aggregator import compute_state

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_onboarded:
            return Response({"error": "Complete onboarding first"}, status=403)
        serializer = ProfileViewSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        if not request.user.is_onboarded:
            return Response({"error": "Complete onboarding first"}, status=403)
        
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "updated"})
        return Response(serializer.errors, status=400)


class ConsentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ConsentSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = ConsentSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            user = serializer.save()

            # mark onboarding complete
            user.is_onboarded = True
            user.save()

            return Response({"status": "updated"})
        return Response(serializer.errors, status=400)

    
class ClearDataView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        user = request.user

        try:
            with transaction.atomic():
                
                user_bookings = Booking.objects.filter(user=user)
                for booking in user_bookings:
                    booking.slot.booked = False
                    booking.slot.save()
                
                user_bookings.delete()

                JournalEntry.objects.filter(user=user).delete()
                Assessment.objects.filter(user=user).delete()
                ChatSession.objects.filter(user=user).delete() 
                MentalSignal.objects.filter(user=user).delete()

                OTP.objects.filter(user=user).delete()
                
                user.latest_smera_alert = None
                user.save()

            return Response({"status": "success", "message": "All personal data cleared successfully."})

        except Exception as e:
            return Response({"status": "error", "error": "An error occurred while clearing data."}, status=500)
    
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()

        return Response({
            "status": "success",
            "message": "Account permanently deleted"
        })
        
class JournalSaltView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if not user.journal_salt:
            user.save()  # auto-fix missing salt

        return Response({
            "salt": user.journal_salt
        })
        
class ReportDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        ist_tz = ZoneInfo('Asia/Kolkata')
        local_now = timezone.now().astimezone(ist_tz)
        thirty_days_ago = local_now - timedelta(days=30)
        
        # 1. Profile Info
        journal_count = JournalEntry.objects.filter(user=user).count()
        profile = {
            "name": user.display_name or f"{user.first_name} {user.last_name}",
            "email": user.email,
            "dob": user.date_of_birth,
            "age": user.get_age() if hasattr(user, 'get_age') else "--",
            "member_since": user.date_joined.strftime("%B %d, %Y"),
            "journal_count": journal_count
        }

        # 2. Assessments
        assessments = Assessment.objects.filter(user=user, created_at__gte=thirty_days_ago).order_by("-created_at")
        assessment_data = [{
            "type": a.assessment_type.upper(),
            "score": a.score,
            "risk": a.risk_level.replace("_", " ").title(),
            "date": a.created_at.strftime("%b %d, %Y")
        } for a in assessments]

        # 3. Mood Trends (Daily Averages)
        first_signal = MentalSignal.objects.filter(user=user).order_by("created_at").first()
        mood_trends = []
        if first_signal:
            first_signal_local = first_signal.created_at.astimezone(ist_tz)
            start_time = first_signal_local.replace(hour=0, minute=0, second=0, microsecond=0)
            current = start_time
            
            while current < local_now:
                bucket_end = current + timedelta(hours=24)
                if bucket_end > local_now:
                    bucket_end = local_now
                    
                exact_days = (bucket_end - current).total_seconds() / 86400.0
                state = compute_state(user, reference_time=bucket_end, days=exact_days, mode="historical")
                
                if state["overall_mood"] is not None:
                    mood_trends.append({
                        "date": current.strftime('%b %d'),
                        "score": state["score"],
                        "mood": state["overall_mood"].title()
                    })
                current = bucket_end

        # 4. Raw Mood Events (Last 7 Days)
        seven_days_ago = local_now - timedelta(days=7)
        raw_signals = MentalSignal.objects.filter(user=user, created_at__gte=seven_days_ago).order_by("created_at")
        raw_mood_events = [{
            "mood": s.mood,
            "date": s.created_at.astimezone(ist_tz).strftime('%b %d, %I:%M %p')
        } for s in raw_signals]

        # 5. Consultation History
        bookings = Booking.objects.filter(user=user, slot__date__gte=thirty_days_ago).select_related('counselor', 'slot').order_by("-slot__date")
        booking_data = [{
            "counselor": b.counselor.name,
            "status": b.status.title(),
            "date": b.slot.date.strftime("%b %d, %Y"),
            "mode": b.slot.mode.title()
        } for b in bookings]
        
        # 6. Recommendations & Disclaimer
        current_state = compute_state(user, days=0.5, mode="realtime")
        risk = current_state.get("overall_risk", "less")
        mood = current_state.get("overall_mood", "neutral")
        
        # Dynamic Recommendations based on current state
        if risk == "high" or mood in ["overwhelmed", "low"]:
            recommendations = [
                "Reach out to a mental health professional for personalized guidance.",
                "Focus only on the immediate next step, rather than the overwhelming big picture.",
                "Practice physical grounding techniques (like 4-7-8 breathing) when feeling tense.",
                "Be incredibly gentle and patient with yourself right now; recovery takes time."
            ]
        elif risk == "moderate" or mood == "stressed":
            recommendations = [
                "Incorporate 10 to 15 minutes of mindfulness or deep breathing daily.",
                "Consider journaling your thoughts to declutter your mind before bed.",
                "Ensure you are staying consistently hydrated and eating balanced meals.",
                "Limit your exposure to stressful triggers and prioritize wind-down time."
            ]
        else:
            recommendations = [
                "Maintain a consistent sleep schedule to support emotional regulation.",
                "Engage in at least 15-20 minutes of mindful activity or light exercise daily.",
                "Continue using your secure journal to process daily thoughts and reduce cognitive load.",
                "Take a moment to acknowledge your resilience and mental progress."
            ]
            
        disclaimer = "This report is generated automatically by Smera based on your self-reported inputs. It is intended for informational and reflective purposes only and does not constitute a clinical diagnosis, medical advice, or professional psychiatric evaluation. If you are in immediate distress, please contact a local emergency service or crisis helpline."

        return Response({
            "profile": profile,
            "assessments": assessment_data,
            "mood_trends": mood_trends,
            "raw_mood_events": raw_mood_events,
            "consultations": booking_data,
            "recommendations": recommendations,
            "disclaimer": disclaimer
        })
               
def profile_page(request): return render(request, "user_control/profile.html")
def settings_page(request): return render(request, "user_control/settings.html")
def consent_page(request): return render(request, "user_control/consent.html")
def export_page(request): return render(request, "user_control/export.html")
