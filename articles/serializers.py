from rest_framework import serializers
from .models import Article

class ArticleSerializer(
    serializers.ModelSerializer
):

    short = serializers.SerializerMethodField()

    full = serializers.SerializerMethodField()

    class Meta:

        model = Article

        fields = "__all__"

    def get_short(self,obj):

        return obj.content[:100]+"..."

    def get_full(self,obj):

        return obj.content