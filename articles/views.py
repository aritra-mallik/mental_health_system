from django.conf import settings
import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import ArticleSerializer
from django.shortcuts import render

# HTML PAGE VIEW (for browser only)
def article_page(request, index):
    return render(request, "articles/article_detail.html", {
        "index": index
    })


def load_articles():
    file_path = os.path.join(settings.BASE_DIR, 'articles', 'summary.txt')
    articles = []

    with open(file_path, 'r', encoding='utf-8') as f:
        blocks = f.read().strip().split("\n\n")

    for block in blocks:
        lines = block.strip().split("\n")

        if len(lines) < 5:
            continue

        articles.append({
            "title": lines[0],
            "mood": lines[1].lower(),
            "read_time": lines[2],
            "link": lines[3],
            "full": " ".join(lines[4:]),
            "short": " ".join(lines[4:])[:80] + "..."
        })

    return articles


@api_view(["GET"])
def articles(request):
    mood = request.GET.get("mood")
    data = load_articles()

    if mood:
        mood = mood.strip().lower()

        filtered = [
            a for a in data
            if a["mood"].strip().lower() == mood
        ]

        return Response(filtered)  

    return Response(data)


@api_view(["GET"])
def article_detail(request, index):
    data = load_articles()

    if index >= len(data):
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(data[index])