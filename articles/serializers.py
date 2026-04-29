from rest_framework import serializers

class ArticleSerializer(serializers.Serializer):
    title = serializers.CharField()
    short = serializers.CharField()
    full = serializers.CharField()
    link = serializers.CharField()
    mood = serializers.CharField()
    read_time = serializers.CharField()