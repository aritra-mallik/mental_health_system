from rest_framework import serializers
from .models import MoodEntry, JournalEntry, Assessment


class MoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodEntry
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