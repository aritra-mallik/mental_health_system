from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from .export_service import export_user_data
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import ProfileViewSerializer, ProfileUpdateSerializer, ConsentSerializer
from django.shortcuts import render

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

            # 🔥 mark onboarding complete
            user.is_onboarded = True
            user.save()

            return Response({"status": "updated"})
        return Response(serializer.errors, status=400)

class ExportDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = export_user_data(request.user)

        response = HttpResponse(data, content_type="application/json")
        response['Content-Disposition'] = 'attachment; filename="my_data.json"'
        return response
    
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()

        return Response({
            "status": "success",
            "message": "Account permanently deleted"
        })
        
def profile_page(request): return render(request, "user_control/profile.html")
def settings_page(request): return render(request, "user_control/settings.html")
def consent_page(request): return render(request, "user_control/consent.html")