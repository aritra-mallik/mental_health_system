from rest_framework import serializers
from .models import JournalEntry, Assessment, ChatSession, ChatMessage, MentalSignal


class MentalSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MentalSignal
        fields = "__all__"
        read_only_fields = ["user"]

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = "__all__"
        read_only_fields = ["session", "role", "content"]
        
class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = "__all__"
        read_only_fields = ["user"]


class JournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = "__all__"
        read_only_fields = ["user"]


class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = "__all__"
        read_only_fields = ["user"]